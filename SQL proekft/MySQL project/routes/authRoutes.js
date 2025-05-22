// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Ensure correct path
require('dotenv').config(); // Ensure environment variables are loaded for routes too, if needed directly

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
    try {
        const { username, email, password, user_type } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Username, email, and password are required.' });
        }

        const newUser = await User.create({
            username,
            email,
            password,
            user_type: user_type || 'Customer'
        });

        req.session.user = {
            user_id: newUser.user_id,
            username: newUser.username,
            email: newUser.email,
            user_type: newUser.user_type
        };

        res.status(201).json({
            message: 'User registered successfully. You are now logged in.',
            user: req.session.user
        });
    } catch (error) {
        if (error.message === 'Email already registered' || error.message === 'Username already taken') {
            return res.status(409).json({ message: error.message });
        }
        next(error);
    }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        const authenticatedUser = await User.authenticate(email, password);
        if (!authenticatedUser) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        req.session.user = {
            user_id: authenticatedUser.user_id,
            username: authenticatedUser.username,
            email: authenticatedUser.email,
            user_type: authenticatedUser.user_type
        };

        res.status(200).json({
            message: 'Login successful.',
            user: req.session.user
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/auth/request-password-reset
router.post('/request-password-reset', async (req, res, next) => {
    try {
        const { username, secondaryEmail } = req.body;
        if (!username || !secondaryEmail) {
            return res.status(400).json({ message: 'Username and secondary email are required.' });
        }
        if (!/^\S+@\S+\.\S+$/.test(secondaryEmail)) {
            return res.status(400).json({ message: 'Invalid secondary email format.' });
        }

        // User.storeOTP will now attempt to send an email.
        // It returns { success: boolean, message: string } or throws an error if email sending fails critically.
        const otpResult = await User.storeOTP(username, secondaryEmail);

        if (otpResult.success) {
            // Generic success message to avoid disclosing user existence if username was invalid but email format was ok.
            // The User.storeOTP handles the "user not found" case internally without throwing to here.
             res.status(200).json({ message: 'If your username is valid and the secondary email can receive messages, an OTP has been dispatched. It may take a few minutes to arrive.' });
        } else if (otpResult.message === "User not found internally.") {
            // Still send a generic message to the client for security (username enumeration)
            console.warn(`Password reset request for non-existent user: ${username}`);
            res.status(200).json({ message: 'If your username is valid and the secondary email can receive messages, an OTP has been dispatched. It may take a few minutes to arrive.' });
        }
        // If User.storeOTP throws an error (e.g., email system failure), it will be caught by the catch block.

    } catch (error) {
        console.error('Error in /request-password-reset:', error.message);
        // Send a generic error message to the client
        res.status(500).json({ message: 'An error occurred while processing your request to send an OTP. Please try again later.' });
    }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res, next) => {
    try {
        const { username, otp, newPassword } = req.body;
        if (!username || !otp || !newPassword) {
            return res.status(400).json({ message: 'Username, OTP, and new password are required.' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
        }

        const verificationResult = await User.verifyOTP(username, otp);
        // verificationResult contains { userId, message } or throws an error

        await User.updatePassword(verificationResult.userId, newPassword);
        
        // User.updatePassword now handles clearing the OTP from otpStore.

        res.status(200).json({ message: 'Password has been reset successfully. You can now log in with your new password.' });
    } catch (error) {
        console.error('Error in /reset-password:', error.message);
        res.status(400).json({ message: error.message || 'Failed to reset password. The OTP may be incorrect, expired, or an unexpected error occurred.' });
    }
});


// POST /api/auth/logout
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ message: 'Could not log out, please try again.' });
        }
        res.clearCookie('connect.sid'); 
        res.status(200).json({ message: 'Logged out successfully.' });
    });
});

// GET /api/auth/session
router.get('/session', (req, res) => {
    if (req.session && req.session.user && req.session.user.user_id) {
        res.status(200).json({
            isLoggedIn: true,
            user: req.session.user
        });
    } else {
        res.status(200).json({
            isLoggedIn: false,
            user: null
        });
    }
});

module.exports = router;
