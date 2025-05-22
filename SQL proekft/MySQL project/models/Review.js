// models/Review.js
const pool = require('./db'); // Assuming your db.js is in the same models folder

class Review {
    /**
     * Creates a new review in the database.
     * @param {object} reviewData - Object containing review details.
     * @param {number} reviewData.user_id - The ID of the user submitting the review.
     * @param {number} reviewData.movie_id - The ID of the movie being reviewed.
     * @param {number} reviewData.rating - The rating given (1-5).
     * @param {string} reviewData.review_text - The text content of the review.
     * @returns {Promise<object>} The newly created review object.
     */
    static async create({ user_id, movie_id, rating, review_text }) {
        if (!user_id || !movie_id || rating === undefined) {
            throw new Error('User ID, Movie ID, and Rating are required to create a review.');
        }
        if (rating < 1 || rating > 5) {
            throw new Error('Rating must be between 1 and 5.');
        }

        const query = `
            INSERT INTO Reviews (user_id, movie_id, rating, review_text, review_date)
            VALUES (?, ?, ?, ?, NOW())
        `;
        const [result] = await pool.execute(query, [user_id, movie_id, rating, review_text]);
        
        if (result.insertId) {
            return { review_id: result.insertId, user_id, movie_id, rating, review_text, review_date: new Date().toISOString() };
        } else {
            throw new Error('Failed to create review.');
        }
    }

    /**
     * Fetches all reviews for a specific movie.
     * Includes username for display.
     * @param {number} movieId - The ID of the movie.
     * @returns {Promise<Array<object>>} An array of review objects for the movie.
     */
    static async getByMovieId(movieId) {
        const query = `
            SELECT r.*, u.username 
            FROM Reviews r
            JOIN Users u ON r.user_id = u.user_id
            WHERE r.movie_id = ?
            ORDER BY r.review_date DESC
        `;
        const [rows] = await pool.execute(query, [movieId]);
        return rows;
    }

    /**
     * Fetches a single review by its ID.
     * @param {number} reviewId - The ID of the review.
     * @returns {Promise<object|null>} The review object or null if not found.
     */
    static async getById(reviewId) {
        const query = `
            SELECT r.*, u.username 
            FROM Reviews r
            JOIN Users u ON r.user_id = u.user_id
            WHERE r.review_id = ?
        `;
        const [rows] = await pool.execute(query, [reviewId]);
        return rows[0] || null;
    }

    /**
     * Updates an existing review.
     * @param {number} reviewId - The ID of the review to update.
     * @param {object} updateData - Object containing data to update (rating, review_text).
     * @param {number} userId - The ID of the user attempting the update (for authorization).
     * @returns {Promise<boolean>} True if update was successful, false otherwise.
     */
    static async update(reviewId, { rating, review_text }, userId) {
        // First, verify the review exists and belongs to the user
        const review = await this.getById(reviewId);
        if (!review) {
            throw new Error('Review not found.');
        }
        if (review.user_id !== userId) {
            throw new Error('Forbidden: You can only update your own reviews.');
        }
        if (rating !== undefined && (rating < 1 || rating > 5)) {
            throw new Error('Rating must be between 1 and 5.');
        }

        const fields = [];
        const values = [];
        if (rating !== undefined) {
            fields.push('rating = ?');
            values.push(rating);
        }
        if (review_text !== undefined) {
            fields.push('review_text = ?');
            values.push(review_text);
        }

        if (fields.length === 0) {
            return false; // No actual update data provided
        }

        values.push(reviewId); // For the WHERE clause
        const query = `UPDATE Reviews SET ${fields.join(', ')}, review_date = NOW() WHERE review_id = ?`;
        
        const [result] = await pool.execute(query, values);
        return result.affectedRows > 0;
    }

    /**
     * Deletes a review.
     * @param {number} reviewId - The ID of the review to delete.
     * @param {number} userId - The ID of the user attempting the delete (for authorization).
     * @param {string} userType - The type of the user ('Admin' or 'Customer').
     * @returns {Promise<boolean>} True if deletion was successful, false otherwise.
     */
    static async delete(reviewId, userId, userType) {
        const review = await this.getById(reviewId);
        if (!review) {
            throw new Error('Review not found.');
        }
        // Allow deletion if it's the user's own review OR if the user is an Admin
        if (review.user_id !== userId && userType !== 'Admin' && userType !== 'admin') {
            throw new Error('Forbidden: You can only delete your own reviews or you must be an admin.');
        }

        const query = 'DELETE FROM Reviews WHERE review_id = ?';
        const [result] = await pool.execute(query, [reviewId]);
        return result.affectedRows > 0;
    }
}

module.exports = Review;
