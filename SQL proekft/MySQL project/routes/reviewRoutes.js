// routes/reviewRoutes.js
const express = require('express');
const router = express.Router();
const Review = require('../models/Review'); // Adjust path as needed
const { isAuthenticated } = require('./middleware'); // Assuming middleware.js is in the same routes directory

// GET /api/reviews/movie/:movieId - Get all reviews for a specific movie
router.get('/movie/:movieId', async (req, res, next) => {
    try {
        const movieId = parseInt(req.params.movieId);
        if (isNaN(movieId)) {
            return res.status(400).json({ message: 'Invalid movie ID format.' });
        }
        const reviews = await Review.getByMovieId(movieId);
        res.status(200).json(reviews);
    } catch (error) {
        console.error('Error fetching reviews by movie ID:', error);
        next(error); // Pass to global error handler
    }
});

// POST /api/reviews - Create a new review (requires authentication)
router.post('/', isAuthenticated, async (req, res, next) => {
    try {
        const { movie_id, rating, review_text } = req.body;
        const user_id = req.session.user.user_id; // Get user_id from session

        if (!movie_id || rating === undefined) {
            return res.status(400).json({ message: 'Movie ID and rating are required.' });
        }
        if (typeof rating !== 'number' || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be a number between 1 and 5.' });
        }
        if (review_text && typeof review_text !== 'string') {
            return res.status(400).json({ message: 'Review text must be a string.' });
        }


        const newReviewData = {
            user_id,
            movie_id: parseInt(movie_id),
            rating: parseInt(rating),
            review_text: review_text || null // Allow empty review text
        };

        const createdReview = await Review.create(newReviewData);
        
        // Fetch the newly created review with username for immediate display
        const detailedReview = await Review.getById(createdReview.review_id);

        res.status(201).json({ message: 'Review submitted successfully.', review: detailedReview });
    } catch (error) {
        console.error('Error creating review:', error);
        if (error.message.includes('required') || error.message.includes('Rating must be')) {
            return res.status(400).json({ message: error.message });
        }
        next(error);
    }
});

// PUT /api/reviews/:reviewId - Update a review (requires authentication, user must own review)
router.put('/:reviewId', isAuthenticated, async (req, res, next) => {
    try {
        const reviewId = parseInt(req.params.reviewId);
        const { rating, review_text } = req.body;
        const userId = req.session.user.user_id;

        if (isNaN(reviewId)) {
            return res.status(400).json({ message: 'Invalid review ID format.' });
        }
        if (rating === undefined && review_text === undefined) {
            return res.status(400).json({ message: 'No update data provided (rating or review_text).' });
        }
        
        const success = await Review.update(reviewId, { rating, review_text }, userId);
        if (success) {
            const updatedReview = await Review.getById(reviewId); // Fetch updated review
            res.status(200).json({ message: 'Review updated successfully.', review: updatedReview });
        } else {
            // This case might not be reached if Review.update throws errors for not found/forbidden
            res.status(404).json({ message: 'Review not found or no changes made.' });
        }
    } catch (error) {
        console.error('Error updating review:', error);
        if (error.message.includes('Forbidden') || error.message.includes('not found') || error.message.includes('Rating must be')) {
            return res.status(error.message.includes('Forbidden') ? 403 : 404).json({ message: error.message });
        }
        next(error);
    }
});

// DELETE /api/reviews/:reviewId - Delete a review (requires authentication, user must own review or be admin)
router.delete('/:reviewId', isAuthenticated, async (req, res, next) => {
    try {
        const reviewId = parseInt(req.params.reviewId);
        const userId = req.session.user.user_id;
        const userType = req.session.user.user_type;

        if (isNaN(reviewId)) {
            return res.status(400).json({ message: 'Invalid review ID format.' });
        }

        const success = await Review.delete(reviewId, userId, userType);
        if (success) {
            res.status(200).json({ message: 'Review deleted successfully.' });
        } else {
             // This case might not be reached if Review.delete throws an error for not found
            res.status(404).json({ message: 'Review not found or could not be deleted.' });
        }
    } catch (error) {
        console.error('Error deleting review:', error);
         if (error.message.includes('Forbidden') || error.message.includes('not found')) {
            return res.status(error.message.includes('Forbidden') ? 403 : 404).json({ message: error.message });
        }
        next(error);
    }
});


module.exports = router;
