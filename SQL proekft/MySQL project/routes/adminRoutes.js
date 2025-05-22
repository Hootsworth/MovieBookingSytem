// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { isAdmin } = require('./middleware');
const User = require('../models/User');
const Movie = require('../models/Movie');
const Theatre = require('../models/Theatre');
const Showtime = require('../models/Showtime');
const Booking = require('../models/Booking');
const Discount = require('../models/Discount'); // Import the Discount model

// GET /api/admin/summary (Admin Dashboard Summary)
router.get('/summary', isAdmin, async (req, res, next) => {
    try {
        const users = await User.getAll();
        const movies = await Movie.getAll();
        const theatres = await Theatre.getAll();
        const showtimes = await Showtime.getAll();
        const bookings = await Booking.getAll();
        const discounts = await Discount.getAll(); // Get all discounts

        res.status(200).json({
            message: "Admin dashboard summary data.",
            summary: {
                users: users.length,
                movies: movies.length,
                theatres: theatres.length,
                showtimes: showtimes.length,
                bookings: bookings.length,
                discounts: discounts.length // Add discount count to summary
            }
        });
    } catch (error) {
        next(error);
    }
});

// --- User Management by Admin (existing code) ---
// GET /api/admin/users
router.get('/users', isAdmin, async (req, res, next) => {
    try {
        const users = await User.getAll();
        res.status(200).json(users);
    } catch (error) {
        next(error);
    }
});

// GET /api/admin/users/:id
router.get('/users/:id', isAdmin, async (req, res, next) => {
    try {
        const user_id = parseInt(req.params.id);
        if (isNaN(user_id)) {
            return res.status(400).json({ message: 'Invalid user ID format.' });
        }
        const user = await User.getById(user_id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.status(200).json(user);
    } catch (error) {
        next(error);
    }
});

// PUT /api/admin/users/:id
router.put('/users/:id', isAdmin, async (req, res, next) => {
    try {
        const user_id = parseInt(req.params.id);
        if (isNaN(user_id)) {
            return res.status(400).json({ message: 'Invalid user ID format.' });
        }
        const { user_type } = req.body;

        if (!user_type || (user_type !== 'Admin' && user_type !== 'Customer')) {
            return res.status(400).json({ message: "Invalid user_type. Must be 'Admin' or 'Customer'." });
        }

        const userToUpdate = await User.getById(user_id);
        if (!userToUpdate) {
            return res.status(404).json({ message: 'User not found for update.' });
        }
        
        if (req.session.user && req.session.user.user_id === user_id && user_type !== 'Admin' && user_type !== 'admin') {
             return res.status(403).json({ message: "Admins cannot demote themselves through this interface." });
        }

        const updatedUser = await User.updateUserType(user_id, user_type); 

        if (!updatedUser) {
            return res.status(500).json({ message: 'Failed to update user type.' });
        }
        res.status(200).json({ message: 'User role updated successfully.', user: updatedUser });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', isAdmin, async (req, res, next) => {
    try {
        const user_id_to_delete = parseInt(req.params.id);
        if (isNaN(user_id_to_delete)) {
            return res.status(400).json({ message: 'Invalid user ID format.' });
        }

        if (req.session.user && req.session.user.user_id === user_id_to_delete) {
            return res.status(403).json({ message: "You cannot delete your own account." });
        }
        
        const userToDelete = await User.getById(user_id_to_delete);
        if (!userToDelete) {
            return res.status(404).json({ message: 'User not found or already deleted.' });
        }
        if (userToDelete.user_type === 'Admin' || userToDelete.user_type === 'admin') {
             return res.status(403).json({ message: "Deleting other admin accounts is restricted through this interface for safety." });
        }

        const success = await User.delete(user_id_to_delete);
        if (!success) {
            return res.status(404).json({ message: 'User could not be deleted or was already deleted.' });
        }
        res.status(200).json({ message: 'User deleted successfully.' });
    } catch (error) {
        next(error);
    }
});


// --- Discount Management by Admin ---

// POST /api/admin/discounts - Create a new discount code
router.post('/discounts', isAdmin, async (req, res, next) => {
    try {
        const { code, discount_percentage, valid_from, valid_until } = req.body;
        if (!code || !discount_percentage || !valid_from || !valid_until) {
            return res.status(400).json({ message: 'Code, percentage, valid_from, and valid_until are required.' });
        }
        // Basic validation for dates (more robust validation can be added)
        if (new Date(valid_from) >= new Date(valid_until)) {
            return res.status(400).json({ message: 'Valid_from date must be before valid_until date.' });
        }

        const newDiscount = await Discount.create({
            code: code.trim().toUpperCase(),
            discount_percentage: parseFloat(discount_percentage),
            valid_from,
            valid_until
        });
        res.status(201).json({ message: 'Discount code created successfully.', discount: newDiscount });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') { // Handle unique constraint for discount code
            return res.status(409).json({ message: `Discount code '${req.body.code.toUpperCase()}' already exists.` });
        }
        if (error.message.includes('required') || error.message.includes('percentage must be')) {
            return res.status(400).json({ message: error.message });
        }
        next(error);
    }
});

// GET /api/admin/discounts - Get all discount codes
router.get('/discounts', isAdmin, async (req, res, next) => {
    try {
        const discounts = await Discount.getAll();
        res.status(200).json(discounts);
    } catch (error) {
        next(error);
    }
});

// Add PUT /api/admin/discounts/:id and DELETE /api/admin/discounts/:id if needed for full CRUD

module.exports = router;
