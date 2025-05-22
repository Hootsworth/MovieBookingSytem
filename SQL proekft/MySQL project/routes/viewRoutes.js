// routes/viewRoutes.js
const express = require('express');
const path = require('path');
const router = express.Router();

// --- Public User-Facing Pages ---
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'login.html'));
});
router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'login.html'));
});
router.get('/user-dashboard.html', (req, res) => { // Keep .html for consistency if other links use it
    res.sendFile(path.join(__dirname, '..', 'views', 'user-dashboard.html'));
});
router.get('/movie-details.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'movie-details.html'));
});
router.get('/seat-selection.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'seat-selection.html'));
});
router.get('/payment.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'payment.html'));
});
router.get('/payment-confirmation.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'payment-confirmation.html'));
});
router.get('/my-bookings.html', (req, res) => {
    // Placeholder - Create my-bookings.html and its JS
    // For now, redirect or send a simple message
    res.sendFile(path.join(__dirname, '..', 'views', 'my-bookings.html'));
    //res.status(501).send("My Bookings page coming soon!");
});


// --- Admin Pages ---
// It's good practice to prefix admin view routes, e.g., /admin/dashboard
router.get('/admin/dashboard.html', (req, res) => { // Renamed from admin-dashboard.html
    res.sendFile(path.join(__dirname, '..', 'views', 'admin', 'dashboard.html'));
});

// Movie Management Views
router.get('/admin/manage-movies.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'admin', 'manage-movies.html'));
});
router.get('/admin/form-movie.html', (req, res) => { // Serves both add and edit form
    res.sendFile(path.join(__dirname, '..', 'views', 'admin', 'form-movie.html'));
});

// Theatre Management Views (Add these as you build them)
router.get('/admin/manage-theatres.html', (req, res) => {
     res.sendFile(path.join(__dirname, '..', 'views', 'admin', 'manage-theatres.html'));
});
router.get('/admin/form-theatre.html', (req, res) => {
     res.sendFile(path.join(__dirname, '..', 'views', 'admin', 'form-theatre.html'));
});

// Showtime Management Views (Add these as you build them)
router.get('/admin/manage-showtimes.html', (req, res) => {
     res.sendFile(path.join(__dirname, '..', 'views', 'admin', 'manage-showtimes.html'));
});
router.get('/admin/form-showtime.html', (req, res) => {
     res.sendFile(path.join(__dirname, '..', 'views', 'admin', 'form-showtime.html'));
});

// User Management Views (Add these as you build them)
router.get('/admin/manage-users.html', (req, res) => {
     res.sendFile(path.join(__dirname, '..', 'views', 'admin', 'manage-users.html'));
});
router.get('/admin/form-user.html', (req, res) => { // For editing user details
     res.sendFile(path.join(__dirname, '..', 'views', 'admin', 'form-user.html'));
});


// --- Fallback 404 Page ---
// This should be the LAST route definition to catch all unmatched routes.
router.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '..', 'views', '404.html'));
});

module.exports = router;
