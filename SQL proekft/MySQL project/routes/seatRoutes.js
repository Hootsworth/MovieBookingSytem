// routes/seatRoutes.js
const express = require('express');
const router = express.Router();
const Seat = require('../models/Seat');
const Showtime = require('../models/Showtime'); // To verify showtime exists
// No authentication needed for just fetching seat layout usually, but can be added.

// GET /api/seats/showtime/:showtime_id (Public - Get all seats for a showtime, indicating availability)
router.get('/showtime/:showtime_id', async (req, res, next) => {
    try {
        const showtime_id = parseInt(req.params.showtime_id);
        if (isNaN(showtime_id)) {
            return res.status(400).json({ message: 'Invalid showtime ID format.' });
        }

        const showtime = await Showtime.getById(showtime_id);
        if (!showtime) {
            return res.status(404).json({ message: 'Showtime not found.' });
        }

        const allSeatsForScreen = await Seat.getByScreenId(showtime.screen_id);
        const bookedSeatsForShowtime = await Seat.getBookedSeatsForShowtime(showtime_id);
        
        const bookedSeatIds = new Set(bookedSeatsForShowtime.map(bs => bs.seat_id));

        const seatLayout = allSeatsForScreen.map(seat => ({
            ...seat,
            is_booked: bookedSeatIds.has(seat.seat_id)
        }));

        res.status(200).json({
            showtime_id: showtime.showtime_id,
            screen_id: showtime.screen_id,
            screen_number: showtime.screen_number, // Assuming getById for showtime includes this
            total_seats: showtime.screen_capacity, // Assuming getById for showtime includes this
            seats: seatLayout
        });
    } catch (error) {
        next(error);
    }
});


// GET /api/seats/screen/:screen_id (Admin/Internal - Get all seats for a screen, e.g., for admin setup)
router.get('/screen/:screen_id', async (req, res, next) => {
    try {
        const screen_id = parseInt(req.params.screen_id);
        if (isNaN(screen_id)) {
            return res.status(400).json({ message: 'Invalid screen ID format.' });
        }
        const seats = await Seat.getByScreenId(screen_id);
        if (!seats || seats.length === 0) {
            // It's possible a screen has no seats if they haven't been generated yet
            // return res.status(404).json({ message: 'No seats found for this screen or screen does not exist.' });
        }
        res.status(200).json(seats);
    } catch (error) {
        next(error);
    }
});


module.exports = router;
