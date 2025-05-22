// routes/showtimeRoutes.js
const express = require('express');
const router = express.Router();
const Showtime = require('../models/Showtime');
const Movie = require('../models/Movie');
const Screen = require('../models/Screen');
const Theatre = require('../models/Theatre');
const { isAdmin } = require('./middleware');

// GET /api/showtimes (Get all showtimes, with optional filtering)
router.get('/', async (req, res, next) => {
    try {
        // Basic filtering example (can be expanded)
        const { date, movie_id, theater_id } = req.query;
        let showtimes;
        if (date || movie_id || theater_id) {
            // Implement a more specific query in Showtime model if complex filtering is needed
            // For now, fetch all and filter (not ideal for large datasets)
            const allShowtimes = await Showtime.getAll();
            showtimes = allShowtimes.filter(st => {
                let match = true;
                if (date && st.show_date !== date) match = false;
                if (movie_id && st.movie_id !== parseInt(movie_id)) match = false;
                if (theater_id && st.theater_id !== parseInt(theater_id)) match = false;
                return match;
            });
        } else {
            showtimes = await Showtime.getAll();
        }
        res.status(200).json(showtimes);
    } catch (error) {
        next(error);
    }
});

// GET /api/showtimes/:id (Get a single showtime by ID)
router.get('/:id', async (req, res, next) => {
    try {
        const showtime_id = parseInt(req.params.id);
        if (isNaN(showtime_id)) {
            return res.status(400).json({ message: 'Invalid showtime ID format.' });
        }
        const showtime = await Showtime.getById(showtime_id);
        if (!showtime) {
            return res.status(404).json({ message: 'Showtime not found.' });
        }
        res.status(200).json(showtime);
    } catch (error) {
        next(error);
    }
});

// GET /api/showtimes/movie/:movie_id (Get showtimes for a specific movie)
router.get('/movie/:movie_id', async (req, res, next) => {
    try {
        const movie_id = parseInt(req.params.movie_id);
        if (isNaN(movie_id)) {
            return res.status(400).json({ message: 'Invalid movie ID format.' });
        }
        const showtimes = await Showtime.getByMovieId(movie_id);
        res.status(200).json(showtimes);
    } catch (error) {
        next(error);
    }
});

// POST /api/showtimes (Admin only - Add a new showtime)
router.post('/', isAdmin, async (req, res, next) => {
    try {
        const { movie_id, screen_id, show_date, show_time } = req.body;

        if (!movie_id || !screen_id || !show_date || !show_time) {
            return res.status(400).json({ message: 'movie_id, screen_id, show_date, and show_time are required.' });
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(show_date) || !/^\d{2}:\d{2}(:\d{2})?$/.test(show_time)) {
            return res.status(400).json({ message: 'Invalid date (YYYY-MM-DD) or time (HH:MM or HH:MM:SS) format.' });
        }
        const selectedDate = new Date(show_date + 'T00:00:00');
        const today = new Date(); today.setHours(0,0,0,0);
        if (selectedDate < today) {
            return res.status(400).json({ message: 'Show date cannot be in the past for new showtimes.' });
        }

        const movie = await Movie.getById(parseInt(movie_id));
        if (!movie) return res.status(404).json({ message: 'Selected movie not found.' });

        const screen = await Screen.getById(parseInt(screen_id));
        if (!screen) return res.status(404).json({ message: 'Selected screen not found.' });
        
        const theater_id = screen.theater_id; // Get theater_id from the screen object
        const available_seats = screen.total_seats; // New showtime starts with full capacity

        const showtimeData = {
            movie_id: parseInt(movie_id),
            theater_id: parseInt(theater_id),
            screen_id: parseInt(screen_id),
            show_date,
            show_time: show_time.length === 5 ? `${show_time}:00` : show_time, // Ensure HH:MM:SS
            available_seats: parseInt(available_seats)
        };

        const newShowtime = await Showtime.create(showtimeData);
        // Fetch the newly created showtime with all joined details for a richer response
        const detailedNewShowtime = await Showtime.getById(newShowtime.showtime_id);
        res.status(201).json({ message: 'Showtime added successfully.', showtime: detailedNewShowtime });
    } catch (error) {
        next(error);
    }
});

// PUT /api/showtimes/:id (Admin only - Update an existing showtime)
router.put('/:id', isAdmin, async (req, res, next) => {
    let connection;
    try {
        connection = await pool.getConnection(); // For potential transaction if complex logic added
        await connection.beginTransaction();

        const showtime_id = parseInt(req.params.id);
        if (isNaN(showtime_id)) {
            await connection.rollback();
            return res.status(400).json({ message: 'Invalid showtime ID format.' });
        }

        const { movie_id, screen_id, show_date, show_time, available_seats } = req.body;
        
        const showtimeToUpdate = await Showtime.getById(showtime_id); // Use non-transactional read or pass connection
        if (!showtimeToUpdate) {
            await connection.rollback();
            return res.status(404).json({ message: 'Showtime not found for update.' });
        }

        // Validate inputs
        if ((show_date && !/^\d{4}-\d{2}-\d{2}$/.test(show_date)) || (show_time && !/^\d{2}:\d{2}(:\d{2})?$/.test(show_time))) {
            await connection.rollback();
            return res.status(400).json({ message: 'Invalid date or time format.' });
        }
        if (available_seats != null && (isNaN(parseInt(available_seats)) || parseInt(available_seats) < 0)) {
            await connection.rollback();
            return res.status(400).json({ message: 'Available seats must be a non-negative number.' });
        }
        
        let final_theater_id = showtimeToUpdate.theater_id;
        let final_screen_id = showtimeToUpdate.screen_id;
        let final_available_seats = showtimeToUpdate.available_seats;
        let final_movie_id = showtimeToUpdate.movie_id;

        if (movie_id && parseInt(movie_id) !== showtimeToUpdate.movie_id) {
             const movie = await Movie.getById(parseInt(movie_id));
             if (!movie) { await connection.rollback(); return res.status(404).json({ message: 'New movie not found.'});}
             final_movie_id = parseInt(movie_id);
        }

        if (screen_id && parseInt(screen_id) !== showtimeToUpdate.screen_id) {
            const screen = await Screen.getById(parseInt(screen_id));
            if (!screen) { await connection.rollback(); return res.status(404).json({ message: 'New screen not found.' });}
            final_theater_id = screen.theater_id;
            final_screen_id = screen.screen_id;
            // If screen changes, available_seats should be explicitly set or reset to new screen's capacity.
            // If available_seats is not provided in req.body, use new screen's total_seats.
            final_available_seats = available_seats != null ? parseInt(available_seats) : screen.total_seats;
        } else if (available_seats != null) {
            final_available_seats = parseInt(available_seats);
        }
        
        // Ensure available_seats does not exceed the capacity of the (potentially new) screen
        const targetScreen = await Screen.getById(final_screen_id);
        if (!targetScreen) { // Should not happen if screen_id validation passed
             await connection.rollback(); return res.status(404).json({ message: 'Target screen data not found.' });
        }
        if (final_available_seats > targetScreen.total_seats) {
            final_available_seats = targetScreen.total_seats; // Cap at screen capacity
            // Or return an error:
            // await connection.rollback();
            // return res.status(400).json({ message: `Available seats (${final_available_seats}) cannot exceed screen capacity (${targetScreen.total_seats}).` });
        }


        const updateData = {
            movie_id: final_movie_id,
            theater_id: final_theater_id,
            screen_id: final_screen_id,
            show_date: show_date || showtimeToUpdate.show_date,
            show_time: show_time ? (show_time.length === 5 ? `${show_time}:00` : show_time) : showtimeToUpdate.show_time,
            available_seats: final_available_seats
        };
        
        await Showtime.update(showtime_id, updateData); // This model method should ideally use the connection
        
        await connection.commit();
        const updatedShowtimeDetails = await Showtime.getById(showtime_id); // Fetch with joins for response
        res.status(200).json({ message: 'Showtime updated successfully.', showtime: updatedShowtimeDetails });

    } catch (error) {
        if (connection) await connection.rollback();
        next(error);
    } finally {
        if (connection) connection.release();
    }
});

// DELETE /api/showtimes/:id (Admin only - Delete a showtime)
router.delete('/:id', isAdmin, async (req, res, next) => {
    try {
        const showtime_id = parseInt(req.params.id);
        if (isNaN(showtime_id)) {
            return res.status(400).json({ message: 'Invalid showtime ID format.' });
        }
        const showtimeExists = await Showtime.getById(showtime_id);
        if (!showtimeExists) {
            return res.status(404).json({ message: 'Showtime not found.' });
        }
        const success = await Showtime.delete(showtime_id); // ON DELETE CASCADE handles Bookings
        if (!success) {
            return res.status(404).json({ message: 'Showtime could not be deleted or was already deleted.' });
        }
        res.status(200).json({ message: 'Showtime deleted successfully.' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
