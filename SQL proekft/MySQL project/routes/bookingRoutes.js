// routes/bookingRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../models/db');
const Booking = require('../models/Booking');
const Showtime = require('../models/Showtime');
const Payment = require('../models/Payment'); // For fetching payment details with booking
const { isAuthenticated, isAdmin } = require('./middleware');

// POST /api/bookings (Authenticated users - Create a booking)
// This route is now primarily for internal use by paymentRoutes after successful payment.
// Direct creation might be allowed for "pay at counter" if that feature existed.
router.post('/', isAuthenticated, async (req, res, next) => {
    const { showtime_id, seat_ids, status } = req.body; // Expecting an array of seat_ids

    if (!showtime_id || !Array.isArray(seat_ids) || seat_ids.length === 0) {
        return res.status(400).json({ message: 'showtime_id and a non-empty array of seat_ids are required.' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const showtime = await Showtime.getById(showtime_id); // Use connection if model supports it
        if (!showtime) {
            await connection.rollback();
            return res.status(404).json({ message: 'Showtime not found.' });
        }

        // Check seat availability and that seats belong to the showtime's screen
        const availableSeatsForShowtime = await Seat.getAvailableSeatsForShowtime(showtime_id); // Use connection
        const availableSeatIds = new Set(availableSeatsForShowtime.map(s => s.seat_id));
        
        for (const seat_id of seat_ids) {
            if (!availableSeatIds.has(parseInt(seat_id))) {
                await connection.rollback();
                return res.status(400).json({ message: `Seat ID ${seat_id} is not available or does not exist for this showtime.` });
            }
        }
        
        const bookingsToCreate = seat_ids.map(seat_id => ({
            user_id: req.session.user.user_id,
            showtime_id: parseInt(showtime_id),
            seat_id: parseInt(seat_id),
            status: status || 'Confirmed' // Default to Confirmed, or could be 'PendingPayment'
        }));

        const { firstBookingId, allBookingIds } = await Booking.createMany(bookingsToCreate, connection);

        // Update available seats for the showtime
        await Showtime.updateAvailableSeats(showtime_id, -seat_ids.length, connection);

        await connection.commit();
        res.status(201).json({
            message: 'Booking(s) created successfully.',
            first_booking_id: firstBookingId, // Useful for linking to a single payment record
            booking_ids: allBookingIds
        });

    } catch (error) {
        if (connection) await connection.rollback();
        next(error);
    } finally {
        if (connection) connection.release();
    }
});

// GET /api/bookings/my-bookings (Authenticated users - Get their own bookings)
router.get('/my-bookings', isAuthenticated, async (req, res, next) => {
    try {
        const bookings = await Booking.getByUserId(req.session.user.user_id);
        res.status(200).json(bookings);
    } catch (error) {
        next(error);
    }
});

// GET /api/bookings/:id (Authenticated users - Get a specific booking by ID)
router.get('/:id', isAuthenticated, async (req, res, next) => {
    try {
        const booking_id = parseInt(req.params.id);
        if (isNaN(booking_id)) {
            return res.status(400).json({ message: 'Invalid booking ID format.' });
        }
        const booking = await Booking.getById(booking_id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found.' });
        }
        // Authorization: User can only see their own booking, or admin can see any
        if (booking.user_id !== req.session.user.user_id && req.session.user.user_type !== 'Admin' && req.session.user.user_type !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: You do not have permission to view this booking.' });
        }
        res.status(200).json(booking);
    } catch (error) {
        next(error);
    }
});

// POST /api/bookings/:id/cancel (Authenticated users - Cancel their own booking)
router.post('/:id/cancel', isAuthenticated, async (req, res, next) => {
    const booking_id = parseInt(req.params.id);
    if (isNaN(booking_id)) {
        return res.status(400).json({ message: 'Invalid booking ID format.' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const booking = await Booking.getById(booking_id); // Use connection if model supports
        if (!booking) {
            await connection.rollback();
            return res.status(404).json({ message: 'Booking not found.' });
        }
        if (booking.user_id !== req.session.user.user_id && req.session.user.user_type !== 'Admin' && req.session.user.user_type !== 'admin') {
            await connection.rollback();
            return res.status(403).json({ message: 'Forbidden: You cannot cancel this booking.' });
        }
        if (booking.status === 'Cancelled') {
            await connection.rollback();
            return res.status(400).json({ message: 'Booking is already cancelled.' });
        }

        const success = await Booking.cancel(booking_id, connection);
        if (!success) {
            await connection.rollback();
            return res.status(500).json({ message: 'Failed to cancel booking status.' });
        }
        
        // Update available seats for the showtime (increment by seats_booked for this booking)
        // The Booking table schema has seats_booked per booking_id (which is per seat)
        // So for cancelling a single booking_id, we increment by 1.
        // If cancelling a "transaction" of multiple seats, this logic would be different.
        await Showtime.updateAvailableSeats(booking.showtime_id, 1, connection); 

        await connection.commit();
        res.status(200).json({ message: 'Booking cancelled successfully.' });
    } catch (error) {
        if (connection) await connection.rollback();
        next(error);
    } finally {
        if (connection) connection.release();
    }
});


// GET /api/bookings/confirmation/:booking_id (For payment confirmation page)
// This booking_id is the first_booking_id from a transaction, which is linked to the Payment.
router.get('/confirmation/:booking_id', isAuthenticated, async (req, res, next) => {
    try {
        const primary_booking_id = parseInt(req.params.booking_id);
        if (isNaN(primary_booking_id)) {
            return res.status(400).json({ message: "Invalid primary booking ID format." });
        }

        // Fetch the main booking record linked to the payment
        const primaryBooking = await Booking.getById(primary_booking_id);
        if (!primaryBooking) {
            return res.status(404).json({ message: "Primary booking record not found." });
        }
        
        // Authorization
        if (primaryBooking.user_id !== req.session.user.user_id && req.session.user.user_type !== 'Admin' && req.session.user.user_type !== 'admin') {
            return res.status(403).json({ message: "Unauthorized to view this booking confirmation." });
        }

        // Fetch payment details
        const paymentDetails = await Payment.getByBookingId(primary_booking_id);

        // Fetch all seats that were part of this transaction.
        // This requires knowing all booking_ids that were created in the same transaction.
        // The current Booking.createMany returns allBookingIds. This info isn't passed here.
        // A simpler approach for confirmation: list all seats for this user & showtime booked around the same time.
        // Or, if the payment is linked to one primaryBookingId, and other bookings for the same transaction
        // share the same user_id, showtime_id, and booking_date (approx), we can group them.
        
        // For simplicity, we'll assume the primaryBooking details are sufficient for now,
        // or that Booking.getById is enhanced to fetch related "sibling" bookings if a transaction_id existed.
        // If multiple seats were booked, primaryBooking will only contain one seat's details.
        // We need to fetch all seats for that specific user & showtime from that transaction.
        // The `paymentRoutes` returns only the `firstBookingId`.
        // A better way is to return all booking_ids from paymentRoutes, store them in session, then fetch here.
        // Or, query Bookings table for all entries with same user_id, showtime_id, and very close booking_date to primaryBooking.booking_date.

        const allBookedSeatsForShowtimeByUser = await Booking.getByUserIdAndShowtimeIdForTransaction(
            primaryBooking.user_id, 
            primaryBooking.showtime_id, 
            primaryBooking.booking_date // Pass the exact timestamp of the primary booking
        );


        const confirmationData = {
            ...primaryBooking, // Contains details of one seat, movie, showtime, theatre
            all_booked_seats_for_transaction: allBookedSeatsForShowtimeByUser.map(b => ({seat_number: b.seat_number, seat_type: b.seat_type})),
            payment_details: paymentDetails
        };
        // Ensure movie_title, theatre_name etc. are in primaryBooking from Booking.getById
        
        res.status(200).json(confirmationData);

    } catch (error) {
        next(error);
    }
});


// Helper method to add to Booking model (or a service layer) if needed:
// Static method in Booking.js
/*
static async getByUserIdAndShowtimeIdForTransaction(user_id, showtime_id, transaction_timestamp) {
    const query = `
        SELECT b.booking_id, b.seat_id, s.seat_number, s.seat_type
        FROM Bookings b
        JOIN Seats s ON b.seat_id = s.seat_id
        WHERE b.user_id = ? 
          AND b.showtime_id = ? 
          AND ABS(TIMESTAMPDIFF(SECOND, b.booking_date, ?)) < 5 
        ORDER BY b.booking_id ASC; 
        -- Assuming bookings in the same transaction are within 5 seconds
    `;
    const [rows] = await pool.execute(query, [user_id, showtime_id, transaction_timestamp]);
    return rows;
}
*/


module.exports = router;
