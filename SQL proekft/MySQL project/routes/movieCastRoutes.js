// routes/movieCastRoutes.js
const express = require('express');
const router = express.Router();
const MovieCast = require('../models/MovieCast');
const { isAdmin } = require('./middleware'); // Assuming your isAdmin middleware

// GET /api/movie-cast/movie/:movieId - Get all cast for a specific movie
router.get('/movie/:movieId', async (req, res, next) => {
    try {
        const movieId = parseInt(req.params.movieId);
        if (isNaN(movieId)) {
            return res.status(400).json({ message: 'Invalid movie ID format.' });
        }
        const castMembers = await MovieCast.getByMovieId(movieId);
        res.status(200).json(castMembers);
    } catch (error) {
        next(error);
    }
});

// POST /api/movie-cast - Add a new cast member (Admin only)
router.post('/', isAdmin, async (req, res, next) => {
    try {
        const { movie_id, person_name, role_type, character_name, image_url, display_order } = req.body;
        if (!movie_id || !person_name || !role_type) {
            return res.status(400).json({ message: 'Movie ID, person name, and role type are required.' });
        }
        if (role_type === 'Director' && character_name) {
             return res.status(400).json({ message: 'Directors cannot have a character name.' });
        }
        if (role_type === 'Actor' && !character_name) {
            // return res.status(400).json({ message: 'Actors must have a character name.' });
            // Allowing actor without character name for now, can be made stricter
            console.warn(`Actor '${person_name}' is being added without a character name.`);
        }


        const newCastMember = await MovieCast.create({
            movie_id: parseInt(movie_id),
            person_name,
            role_type,
            character_name,
            image_url,
            display_order: display_order ? parseInt(display_order) : 0
        });
        res.status(201).json({ message: 'Cast member added successfully.', castMember: newCastMember });
    } catch (error) {
        next(error);
    }
});

// PUT /api/movie-cast/:castId - Update a cast member (Admin only)
router.put('/:castId', isAdmin, async (req, res, next) => {
    try {
        const castId = parseInt(req.params.castId);
        if (isNaN(castId)) {
            return res.status(400).json({ message: 'Invalid cast ID format.' });
        }
        const updateData = req.body;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: 'No update data provided.' });
        }
        
        // If role_type is being changed to 'Director', ensure character_name is handled (set to null by model or here)
        if (updateData.role_type === 'Director') {
            updateData.character_name = null; 
        }
        // If role_type is 'Actor' and character_name is missing, it could be an issue (depends on strictness)
        // if (updateData.role_type === 'Actor' && updateData.character_name === undefined) {
        //    const existingCast = await MovieCast.getById(castId); // Need a getById in Model
        //    if(existingCast && !existingCast.character_name) // if it was already null, it's fine
        // }


        const success = await MovieCast.update(castId, updateData);
        if (!success) {
            // Could be that cast member wasn't found or data was identical
            const existingCast = await pool.query("SELECT * FROM Movie_Cast WHERE cast_id = ?", [castId]); // Quick check
            if (existingCast[0].length === 0) {
                 return res.status(404).json({ message: 'Cast member not found for update.' });
            }
            return res.status(304).json({ message: 'Cast member not modified. Data might be identical or update failed.' });
        }
        // Fetch the updated cast member to return it (requires a getByCastId method in MovieCast model)
        // For now, just success message
        res.status(200).json({ message: 'Cast member updated successfully.' });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/movie-cast/:castId - Delete a cast member (Admin only)
router.delete('/:castId', isAdmin, async (req, res, next) => {
    try {
        const castId = parseInt(req.params.castId);
        if (isNaN(castId)) {
            return res.status(400).json({ message: 'Invalid cast ID format.' });
        }
        const success = await MovieCast.deleteById(castId);
        if (!success) {
            return res.status(404).json({ message: 'Cast member not found or already deleted.' });
        }
        res.status(200).json({ message: 'Cast member deleted successfully.' });
    } catch (error)
        {
        next(error);
    }
});

// DELETE /api/movie-cast/movie/:movieId - Delete all cast for a movie (Admin only)
// Potentially useful for a "clear all cast" button before re-adding.
router.delete('/movie/:movieId', isAdmin, async (req, res, next) => {
    try {
        const movieId = parseInt(req.params.movieId);
        if (isNaN(movieId)) {
            return res.status(400).json({ message: 'Invalid movie ID format.' });
        }
        const deletedCount = await MovieCast.deleteByMovieId(movieId);
        res.status(200).json({ message: `Successfully deleted ${deletedCount} cast members for movie ID ${movieId}.` });
    } catch (error) {
        next(error);
    }
});


module.exports = router;
