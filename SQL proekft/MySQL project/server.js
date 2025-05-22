// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Session Middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback_secret_key', // Fallback if not in .env
    resave: false,
    saveUninitialized: true, // Set to true to store session for unauthenticated users if needed for cart, etc.
                            // Set to false if you only want sessions for logged-in users.
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production (requires HTTPS)
        httpOnly: true, // Prevents client-side JS from accessing the cookie
        maxAge: 24 * 60 * 60 * 1000 // Cookie expiry (e.g., 24 hours)
    }
}));

// Static Files Middleware (CSS, Frontend JS, Images)
app.use(express.static(path.join(__dirname, 'public')));

// --- Route Imports ---
const authRoutes = require('./routes/authRoutes');
const movieRoutes = require('./routes/movieRoutes');
const theatreRoutes = require('./routes/theatreRoutes');
const showtimeRoutes = require('./routes/showtimeRoutes');
const seatRoutes = require('./routes/seatRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const viewRoutes = require('./routes/viewRoutes'); // For serving HTML pages
const reviewRoutes = require('./routes/reviewRoutes');
const movieCastRoutes = require('./routes/movieCastRoutes'); // Adjust path if necessary
app.use('/api/reviews', reviewRoutes);

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/movie-cast', movieCastRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/theatres', theatreRoutes);
app.use('/api/showtimes', showtimeRoutes);
app.use('/api/seats', seatRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

// --- View Routes (Serving HTML) ---
app.use('/', viewRoutes);


// Global Error Handler (Basic)
app.use((err, req, res, next) => {
    console.error("Global Error Handler Caught:", err.stack || err.message || err);
    res.status(err.status || 500).json({
        message: err.message || 'An unexpected error occurred on the server.',
        ...(process.env.NODE_ENV === 'development' && { error: err.stack }) // Provide stack in dev
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`CineVerse server running on http://localhost:${PORT}`);
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'fallback_secret_key') {
        console.warn('WARNING: Using a default or weak SESSION_SECRET. Please set a strong secret in your .env file for production!');
    }
});
