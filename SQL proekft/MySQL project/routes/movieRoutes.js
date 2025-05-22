// routes/movieRoutes.js
const express = require('express');
const router = express.Router();
const Movie = require('../models/Movie'); 
const { isAdmin } = require('./middleware'); // Assuming middleware for admin check

// GET /api/movies (Public - Get all movies)
router.get('/', async (req, res, next) => {
    try {
        const movies = await Movie.getAll(); 
        res.status(200).json(movies);
    } catch (error) {
        console.error("Error in GET /api/movies:", error);
        next(error); 
    }
});

// GET /api/movies/popular (Public - Get popular movies)
router.get('/popular', async (req, res, next) => {
    try {
        const movies = await Movie.getPopularMovies();
        res.status(200).json(movies);
    } catch (error) {
        console.error("Error in GET /api/movies/popular:", error);
        next(error);
    }
});

// GET /api/movies/:id (Public - Get a single movie by ID)
router.get('/:id', async (req, res, next) => {
    try {
        const movie_id = parseInt(req.params.id);
        if (isNaN(movie_id)) {
            return res.status(400).json({ message: 'Invalid movie ID format.' });
        }
        const movie = await Movie.getById(movie_id);
        if (!movie) {
            return res.status(404).json({ message: 'Movie not found.' });
        }
        res.status(200).json(movie);
    } catch (error) {
        console.error(`Error in GET /api/movies/${req.params.id}:`, error);
        next(error);
    }
});

// POST /api/movies (Admin only - Add a new movie)
router.post('/', isAdmin, async (req, res, next) => {
    try {
        const { 
            title, 
            genre, 
            duration, 
            release_date, 
            poster_image_url, 
            backdrop_image_url, 
            synopsis,
            trailer_youtube_url,
            cast_and_crew 
        } = req.body;

        if (!title || !genre || !duration || !release_date) {
            return res.status(400).json({ message: 'Title, genre, duration, and release_date are required.' });
        }
        if (isNaN(parseInt(duration)) || parseInt(duration) <= 0) {
            return res.status(400).json({ message: 'Duration must be a positive number.'});
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(release_date)) { 
            return res.status(400).json({ message: 'Invalid release_date format. Use YYYY-MM-DD.' });
        }
        if (trailer_youtube_url && typeof trailer_youtube_url !== 'string') {
            return res.status(400).json({ message: 'Invalid trailer YouTube URL format.' });
        }
        
        const movieData = { 
            title, 
            genre, 
            duration: parseInt(duration), 
            release_date,
            poster_image_url,
            backdrop_image_url,
            synopsis,
            trailer_youtube_url
        };

        const castData = cast_and_crew || [];
        for (const member of castData) {
            if (!member.person_name || !member.role_type) {
                return res.status(400).json({ message: 'Each cast member must have person_name and role_type.' });
            }
            if (member.role_type !== 'Actor' && member.character_name) {
                 return res.status(400).json({ message: `Role '${member.role_type}' for '${member.person_name}' cannot have a character name.` });
            }
        }

        const newMovie = await Movie.create(movieData, castData);
        res.status(201).json({ message: 'Movie and cast added successfully.', movie: newMovie });
    } catch (error) {
        console.error("Error in POST /api/movies:", error);
        next(error);
    }
});

// PUT /api/movies/:id (Admin only - Update an existing movie)
router.put('/:id', isAdmin, async (req, res, next) => {
    try {
        const movie_id = parseInt(req.params.id);
        if (isNaN(movie_id)) {
            return res.status(400).json({ message: 'Invalid movie ID format.' });
        }

        const existingMovie = await Movie.getById(movie_id);
         if (!existingMovie) {
            return res.status(404).json({ message: 'Movie not found for update.' });
        }

        const { 
            title, 
            genre, 
            duration, 
            release_date, 
            poster_image_url, 
            backdrop_image_url, 
            synopsis,
            trailer_youtube_url,
            cast_and_crew 
        } = req.body;
        
        const movieDataToUpdate = {
            title: title !== undefined ? title : existingMovie.title,
            genre: genre !== undefined ? genre : existingMovie.genre,
            duration: duration !== undefined ? parseInt(duration) : existingMovie.duration,
            release_date: release_date !== undefined ? release_date : existingMovie.release_date,
            poster_image_url: poster_image_url,
            backdrop_image_url: backdrop_image_url,
            synopsis: synopsis,
            trailer_youtube_url: trailer_youtube_url
        };
        
        if (movieDataToUpdate.duration != null && (isNaN(movieDataToUpdate.duration) || movieDataToUpdate.duration <= 0)) {
             return res.status(400).json({ message: 'Duration must be a positive number.'});
        }
        if (movieDataToUpdate.release_date && !/^\d{4}-\d{2}-\d{2}$/.test(movieDataToUpdate.release_date)) {
            return res.status(400).json({ message: 'Invalid release_date format. Use YYYY-MM-DD.' });
        }
        if (movieDataToUpdate.trailer_youtube_url && typeof movieDataToUpdate.trailer_youtube_url !== 'string') {
             if (movieDataToUpdate.trailer_youtube_url !== null) {
                return res.status(400).json({ message: 'Invalid trailer YouTube URL format.' });
            }
        }
        
        const castData = cast_and_crew;
        if (castData) {
            for (const member of castData) {
                if (!member.person_name || !member.role_type) {
                    return res.status(400).json({ message: 'Each cast member must have person_name and role_type.' });
                }
                 if (member.role_type !== 'Actor' && member.character_name) {
                     return res.status(400).json({ message: `Role '${member.role_type}' for '${member.person_name}' cannot have a character name.` });
                }
            }
        }

        const success = await Movie.update(movie_id, movieDataToUpdate, castData); 
        if (!success) { 
            const potentiallyUnchangedMovie = await Movie.getById(movie_id);
            return res.status(200).json({ message: 'Movie update processed. No changes detected or data is current.', movie: potentiallyUnchangedMovie });
        }
        
        const updatedMovie = await Movie.getById(movie_id); 
        res.status(200).json({ message: 'Movie and cast updated successfully.', movie: updatedMovie });
    } catch (error) {
        console.error(`Error in PUT /api/movies/${req.params.id}:`, error);
        next(error);
    }
});

// DELETE /api/movies/:id (Admin only - Delete a movie)
router.delete('/:id', isAdmin, async (req, res, next) => {
    try {
        const movie_id = parseInt(req.params.id);
        if (isNaN(movie_id)) {
            return res.status(400).json({ message: 'Invalid movie ID format.' });
        }
        
        const movieExists = await Movie.getById(movie_id); 
        if (!movieExists) {
             return res.status(404).json({ message: 'Movie not found or already deleted.' });
        }

        const success = await Movie.delete(movie_id);
        if (!success) {
            return res.status(500).json({ message: 'Movie could not be deleted due to an unexpected issue.' });
        }
        res.status(200).json({ message: 'Movie and associated data (cast, reviews, showtimes via CASCADE) deleted successfully.' });
    } catch (error) {
        console.error(`Error in DELETE /api/movies/${req.params.id}:`, error);
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({ message: 'Cannot delete movie. It is referenced by other records (e.g., bookings) that do not have cascading deletes set up properly.' });
        }
        next(error);
    }
});

module.exports = router;