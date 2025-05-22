// models/User.js
const pool = require('./db');
const bcrypt = require('bcrypt');
const crypto = require('crypto'); // For OTP generation
const nodemailer = require('nodemailer');
require('dotenv').config(); // Load environment variables from .env file

// --- Nodemailer Transporter Setup ---
// Configure the email transporter using environment variables
const transporter = nodemailer.createTransport({
    service: 'gmail', // Using Gmail
    auth: {
        user: process.env.EMAIL_USER, // Your Gmail address from .env
        pass: process.env.EMAIL_PASS  // Your Gmail password or App Password from .env
    },
    tls: {
        rejectUnauthorized: false // Necessary for some environments, especially local development
    }
});

// In-memory store for OTPs (for demonstration purposes)
// In production, use a database table: PasswordResets (user_id, otp_hash, secondary_email_for_otp, expires_at, created_at)
const otpStore = {}; // { username: { otpHash: 'hashed_otp', email: 'secondary_email', expires: timestamp, userId: user_id } }

class User {
    static async getById(id) {
        const [rows] = await pool.execute('SELECT user_id, username, email, user_type FROM Users WHERE user_id = ?', [id]);
        return rows[0];
    }

    static async getByEmail(email) {
        const [rows] = await pool.execute('SELECT * FROM Users WHERE email = ?', [email]);
        return rows[0];
    }

    static async getByUsername(username) {
        const [rows] = await pool.execute('SELECT * FROM Users WHERE username = ?', [username]);
        return rows[0];
    }

    static async create(userData) {
        const existingUserByEmail = await this.getByEmail(userData.email);
        if (existingUserByEmail) {
            const error = new Error('Email already registered');
            error.status = 409; // Conflict
            throw error;
        }
        const existingUserByUsername = await this.getByUsername(userData.username);
        if (existingUserByUsername) {
            const error = new Error('Username already taken');
            error.status = 409; // Conflict
            throw error;
        }

        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const [result] = await pool.execute(
            'INSERT INTO Users (username, email, password_hash, user_type) VALUES (?, ?, ?, ?)',
            [userData.username, userData.email, hashedPassword, userData.user_type || 'Customer']
        );
        return {
            user_id: result.insertId,
            username: userData.username,
            email: userData.email,
            user_type: userData.user_type || 'Customer'
        };
    }

    static async authenticate(email, password) {
        const user = await this.getByEmail(email);
        if (!user) {
            return null;
        }
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (passwordMatch) {
            return {
                user_id: user.user_id,
                username: user.username,
                email: user.email,
                user_type: user.user_type
            };
        }
        return null;
    }

    static async storeOTP(username, secondaryEmail) {
        const user = await this.getByUsername(username);
        if (!user) {
            // To prevent username enumeration, we don't throw an error here that indicates
            // the user doesn't exist. The route handler will send a generic message.
            // However, we won't proceed to send an email if the user isn't found.
            console.warn(`Attempt to send OTP for non-existent username: ${username}`);
            return { success: false, message: "User not found internally." };
        }

        const otp = crypto.randomInt(100000, 999999).toString(); // Generate a 6-digit OTP
        const otpHash = await bcrypt.hash(otp, 10); // Hash the OTP before storing
        const expires = Date.now() + 10 * 60 * 1000; // OTP expires in 10 minutes

        otpStore[username] = { otpHash, email: secondaryEmail, expires, userId: user.user_id };
        
        // --- Send Email with OTP ---
        const mailOptions = {
            from: `"CineVerse Support" <${process.env.EMAIL_USER}>`, // Sender address (must be same as authenticated user)
            to: secondaryEmail, // Receiver's email address (the secondary email provided)
            subject: 'Your CineVerse Password Reset OTP', // Subject line
            text: `Hello ${username},\n\nYour OTP for password reset is: ${otp}\n\nThis OTP will expire in 10 minutes.\n\nIf you did not request this, please ignore this email.\n\nThanks,\nThe CineVerse Team`, // Plain text body
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2 style="color: #333;">CineVerse Password Reset</h2>
                    <p>Hello <strong>${username}</strong>,</p>
                    <p>We received a request to reset your password. Your One-Time Password (OTP) is:</p>
                    <p style="font-size: 24px; font-weight: bold; color: #007bff; margin: 20px 0; letter-spacing: 2px;">${otp}</p>
                    <p>This OTP will expire in <strong>10 minutes</strong>.</p>
                    <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 0.9em; color: #777;">Thanks,<br>The CineVerse Team</p>
                </div>
            ` // HTML body
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log(`OTP email sent successfully to ${secondaryEmail} for user ${username}. OTP (for testing): ${otp}`);
            return { success: true, message: "OTP sent to the provided secondary email."};
        } catch (emailError) {
            console.error(`Failed to send OTP email to ${secondaryEmail} for ${username}:`, emailError);
            // Don't expose detailed email errors to the client.
            // The route handler will provide a generic message.
            // It's important to decide if the OTP should still be stored if email fails.
            // For this example, we'll assume if email fails, the process failed.
            // You might want to clear the OTP from otpStore or not store it if email fails.
            // delete otpStore[username]; // Optional: clear OTP if email fails
            throw new Error('Failed to send OTP email.');
        }
    }

    static async verifyOTP(username, providedOtp) {
        const storedOtpData = otpStore[username];

        if (!storedOtpData) {
            throw new Error('OTP not found or never requested for this user. Please request a new OTP.');
        }
        if (Date.now() > storedOtpData.expires) {
            delete otpStore[username]; // Clean up expired OTP
            throw new Error('OTP has expired. Please request a new one.');
        }
        
        const otpMatch = await bcrypt.compare(providedOtp, storedOtpData.otpHash);
        if (!otpMatch) {
            throw new Error('Invalid OTP.');
        }
        
        // OTP is valid. It should be cleared after successful password reset, not just verification.
        // We return userId to allow password update.
        return { userId: storedOtpData.userId, message: "OTP verified successfully." };
    }
    
    static async updatePassword(userId, newPassword) {
        if (!userId || !newPassword) {
            throw new Error('User ID and new password are required.');
        }
        if (newPassword.length < 6) {
             throw new Error('Password must be at least 6 characters long.');
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const [result] = await pool.execute(
            'UPDATE Users SET password_hash = ? WHERE user_id = ?',
            [hashedPassword, userId]
        );
        if (result.affectedRows === 0) {
            throw new Error('User not found or password could not be updated.');
        }

        // Clear OTP data for the user after successful password reset
        // This requires finding the username from userId if otpStore is keyed by username.
        const user = await this.getById(userId); // Fetch user to get username
        if (user && otpStore[user.username]) {
            console.log(`Clearing OTP for user ${user.username} after successful password reset.`);
            delete otpStore[user.username];
        }

        return { message: 'Password updated successfully.' };
    }

    static async getAll() {
        const [rows] = await pool.execute('SELECT user_id, username, email, user_type FROM Users ORDER BY username');
        return rows;
    }

    static async updateUserType(user_id, newUserType) {
        if (newUserType !== 'Admin' && newUserType !== 'Customer') {
            throw new Error("Invalid user_type. Must be 'Admin' or 'Customer'.");
        }
        const [result] = await pool.execute(
            'UPDATE Users SET user_type = ? WHERE user_id = ?',
            [newUserType, user_id]
        );
        if (result.affectedRows === 0) return null;
        return await this.getById(user_id);
    }

    static async delete(user_id) {
        const [result] = await pool.execute('DELETE FROM Users WHERE user_id = ?', [user_id]);
        return result.affectedRows > 0;
    }
}

module.exports = User;
