// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../models/db');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Showtime = require('../models/Showtime');
const Seat = require('../models/Seat');
const Discount = require('../models/Discount');
const User = require('../models/User'); // To fetch user details if needed for email
const { isAuthenticated } = require('./middleware');
const { sendBookingConfirmationEmail } = require('../utils/mailer'); // Import the mailer utility

// POST /api/payments/validate-discount
// ... (existing code) ...
router.post('/validate-discount', isAuthenticated, async (req, res, next) => {
    const { discount_code } = req.body;
    if (!discount_code) {
        return res.status(400).json({ message: 'Discount code is required.' });
    }
    try {
        const discount = await Discount.getByCode(discount_code);
        if (!discount) {
            return res.status(404).json({ message: 'Invalid or expired discount code.' });
        }
        res.status(200).json({
            message: 'Discount code applied successfully.',
            discount_id: discount.discount_id,
            discount_percentage: discount.discount_percentage,
            code: discount.code
        });
    } catch (error) {
        console.error("Error validating discount code:", error);
        next(error);
    }
});


// POST /api/payments/process (Authenticated users)
router.post('/process', isAuthenticated, async (req, res, next) => {
    console.log('--- /api/payments/process endpoint hit ---');
    let {
        showtime_id, 
        seat_ids, 
        amount, 
        original_amount, 
        discount_id, 
        payment_method, 
        payment_details_token,
        confirmation_email // New field
    } = req.body;

    // ... (existing validation and initial setup) ...
    console.log('Received payload:', req.body);
    console.log('User session:', req.session.user);

    if (!req.session.user || !req.session.user.user_id) {
        console.error('User not authenticated or user_id missing in session.');
        return res.status(401).json({ message: 'Authentication required. Please log in again.' });
    }
     if (!confirmation_email || !/^\S+@\S+\.\S+$/.test(confirmation_email)) {
        return res.status(400).json({ message: 'A valid confirmation email is required.' });
    }


    if (!showtime_id || !Array.isArray(seat_ids) || seat_ids.length === 0 || amount == null || !payment_method || original_amount == null) {
        console.error('Validation failed: Missing required fields.');
        return res.status(400).json({ message: 'showtime_id, seat_ids (array), amount, original_amount, and payment_method are required.' });
    }
    if (parseFloat(amount) < 0) {
        return res.status(400).json({ message: 'Final amount cannot be negative.' });
    }
    if (parseFloat(original_amount) <= 0 && seat_ids.length > 0) { 
        return res.status(400).json({ message: 'Original amount must be positive if seats are selected.' });
    }

    if (payment_method === 'Card') {
        payment_method = 'Credit Card';
    }
    const allowedPaymentMethods = ['Credit Card', 'Debit Card', 'UPI', 'Cash'];
    if (!allowedPaymentMethods.includes(payment_method)) {
        return res.status(400).json({ message: `Invalid payment method.`});
    }


    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // ... (existing showtime, seat availability, and discount validation logic) ...
        const showtime = await Showtime.getById(showtime_id); 
        if (!showtime) {
            await connection.rollback();
            return res.status(404).json({ message: 'Showtime not found.' });
        }
        if (showtime.available_seats < seat_ids.length) {
            await connection.rollback();
            return res.status(400).json({ message: 'Not enough available seats.' });
        }
        const availableSeatsForShowtime = await Seat.getAvailableSeatsForShowtime(showtime_id, connection); 
        const availableSeatIdsSet = new Set(availableSeatsForShowtime.map(s => s.seat_id));
        for (const seat_id of seat_ids) {
            if (!availableSeatIdsSet.has(parseInt(seat_id))) {
                await connection.rollback();
                return res.status(400).json({ message: `Seat ID ${seat_id} is no longer available.` });
            }
        }

        let finalAmount = parseFloat(original_amount);
        let verifiedDiscountId = null;
        let appliedDiscountDetails = null;

        if (discount_id) {
            const validDiscount = await Discount.getById(discount_id, connection); // Use connection
            if (validDiscount && (new Date() >= new Date(validDiscount.valid_from) && new Date() <= new Date(validDiscount.valid_until))) {
                const actualDiscountPercentage = parseFloat(validDiscount.discount_percentage);
                const discountValue = (parseFloat(original_amount) * actualDiscountPercentage) / 100;
                finalAmount = parseFloat(original_amount) - discountValue;
                finalAmount = Math.max(0, finalAmount); // Ensure amount is not negative
                verifiedDiscountId = validDiscount.discount_id;
                appliedDiscountDetails = validDiscount; // Store for email

                if (Math.abs(finalAmount - parseFloat(amount)) > 0.01) {
                    await connection.rollback();
                    return res.status(400).json({ message: 'Discount calculation error. Please re-apply discount.' });
                }
            } else {
                 if (Math.abs(parseFloat(original_amount) - parseFloat(amount)) > 0.01 && discount_id) {
                     await connection.rollback();
                     return res.status(400).json({ message: 'Applied discount seems to have expired. Please refresh.' });
                }
            }
        } else {
             if (Math.abs(parseFloat(original_amount) - parseFloat(amount)) > 0.01) {
                 await connection.rollback();
                 return res.status(400).json({ message: 'Amount calculation error. Please refresh.' });
            }
        }


        const paymentStatus = 'Successful'; // Simulated

        const bookingsToCreate = seat_ids.map(seat_id => ({
            user_id: req.session.user.user_id,
            showtime_id: parseInt(showtime_id),
            seat_id: parseInt(seat_id),
            status: 'Confirmed' 
        }));
        const { firstBookingId, allBookingIds } = await Booking.createMany(bookingsToCreate, connection);

        if (!firstBookingId) { 
            await connection.rollback();
            return res.status(500).json({ message: 'Booking creation failed (no firstBookingId).' });
        }

        const paymentData = {
            booking_id: firstBookingId,
            user_id: req.session.user.user_id, 
            amount: finalAmount,
            payment_method,
            payment_status: paymentStatus,
            // Add original_amount and discount_applied to paymentData IF your Payment model/table supports them
            original_amount: parseFloat(original_amount),
            discount_applied: verifiedDiscountId ? (parseFloat(original_amount) - finalAmount) : 0,
            discount_code_used: verifiedDiscountId ? appliedDiscountDetails.code : null
        };
        const newPayment = await Payment.create(paymentData, connection);

        if (!newPayment || !newPayment.payment_id) { 
            await connection.rollback();
            return res.status(500).json({ message: 'Payment record creation failed.' });
        }

        if (paymentStatus === 'Successful' && verifiedDiscountId) {
            await Discount.recordBookingDiscount(firstBookingId, verifiedDiscountId, connection);
        }

        await Showtime.updateAvailableSeats(showtime_id, -seat_ids.length, connection);
        await connection.commit();
        console.log('Transaction committed successfully.');

        // --- Send Confirmation Email ---
        try {
            // Fetch complete booking details needed for the email
            const fullBookingDetailsForEmail = await Booking.getById(firstBookingId); // Or a more tailored query
            const userForEmail = await User.getById(req.session.user.user_id);

            if (fullBookingDetailsForEmail && userForEmail) {
                const emailData = {
                    ...fullBookingDetailsForEmail, // Includes movie_title, show_date, show_time etc.
                    username: userForEmail.username, // Add username
                    all_booked_seats_for_transaction: await Booking.getByUserIdAndShowtimeIdForTransaction(
                        req.session.user.user_id, 
                        fullBookingDetailsForEmail.showtime_id, 
                        fullBookingDetailsForEmail.booking_date // Use the actual booking timestamp
                    ),
                    payment_details: { // Structure payment details as expected by email template
                        amount: newPayment.amount,
                        original_amount: parseFloat(original_amount), // Pass this to email
                        discount_applied: verifiedDiscountId ? (parseFloat(original_amount) - newPayment.amount) : 0,
                        discount_code: verifiedDiscountId ? appliedDiscountDetails.code : null
                    }
                    // Add any other details your email template needs
                };
                await sendBookingConfirmationEmail(confirmation_email, emailData);
            } else {
                console.error('Could not fetch full details for booking confirmation email.');
            }
        } catch (emailError) {
            console.error("Error preparing or sending booking confirmation email:", emailError);
            // Do not fail the entire transaction for an email error, but log it.
        }
        // --- End Send Confirmation Email ---

        const responsePayload = {
            message: `Payment ${paymentStatus.toLowerCase()}. Booking confirmed.`,
            payment_id: newPayment.payment_id,
            booking_id: firstBookingId, 
            all_booking_ids: allBookingIds,
            payment_status: newPayment.payment_status, 
            final_amount_paid: finalAmount
        };
        res.status(201).json(responsePayload);

    } catch (error) {
        // ... (existing error handling and rollback) ...
        if (connection) {
            console.error('Error occurred, rolling back transaction.');
            await connection.rollback();
        }
        console.error("Error in /api/payments/process:", error.stack || error);
        // Send a more generic error message to the client in production
        res.status(500).json({ message: 'An internal server error occurred during booking.' });
    } finally {
        // ... (existing connection release) ...
        if (connection) {
            connection.release();
            console.log('Database connection released.');
        }
    }
});

module.exports = router;
