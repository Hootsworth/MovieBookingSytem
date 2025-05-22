// models/MovieCast.js
const pool = require('./db'); // Assuming your db connection pool is here

class MovieCast {
    /**
     * Creates a new cast member record.
     * @param {object} castMemberData - Data for the new cast member.
     * @param {number} castMemberData.movie_id - ID of the movie.
     * @param {string} castMemberData.person_name - Name of the person.
     * @param {string} castMemberData.role_type - Role type ('Actor' or 'Director').
     * @param {string} [castMemberData.character_name] - Character name (for actors).
     * @param {string} [castMemberData.image_url] - URL for the person's image.
     * @param {number} [castMemberData.display_order=0] - Order for display.
     * @returns {Promise<object>} The created cast member object with cast_id.
     */
    static async create(castMemberData) {
        const {
            movie_id,
            person_name,
            role_type,
            character_name = null, // Default to null if not provided
            image_url = null,      // Default to null if not provided
            display_order = 0    // Default to 0 if not provided
        } = castMemberData;

        if (!movie_id || !person_name || !role_type) {
            throw new Error('movie_id, person_name, and role_type are required for a cast member.');
        }
        if (role_type === 'Director' && character_name) {
            // Directors should not have character names, clear it if provided.
            // Or throw an error: throw new Error('Character name should not be provided for Directors.');
            console.warn(`Character name '${character_name}' provided for Director '${person_name}' will be ignored.`);
        }


        const query = `
            INSERT INTO Movie_Cast (movie_id, person_name, role_type, character_name, image_url, display_order)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        try {
            const [result] = await pool.execute(query, [
                movie_id,
                person_name,
                role_type,
                role_type === 'Actor' ? character_name : null, // Ensure character_name is null for directors
                image_url,
                display_order
            ]);
            return {
                cast_id: result.insertId,
                movie_id,
                person_name,
                role_type,
                character_name: role_type === 'Actor' ? character_name : null,
                image_url,
                display_order
            };
        } catch (error) {
            console.error("Error in MovieCast.create:", error);
            throw error;
        }
    }

    /**
     * Gets all cast members for a specific movie.
     * @param {number} movieId - The ID of the movie.
     * @returns {Promise<Array<object>>} An array of cast member objects.
     */
    static async getByMovieId(movieId) {
        const query = `
            SELECT cast_id, movie_id, person_name, role_type, character_name, image_url, display_order
            FROM Movie_Cast
            WHERE movie_id = ?
            ORDER BY role_type ASC, display_order ASC, person_name ASC
        `; // Directors first, then by display_order, then by name
        try {
            const [rows] = await pool.execute(query, [movieId]);
            return rows;
        } catch (error) {
            console.error(`Error in MovieCast.getByMovieId for movie ID ${movieId}:`, error);
            throw error;
        }
    }

    /**
     * Updates an existing cast member.
     * @param {number} castId - The ID of the cast member to update.
     * @param {object} updateData - The data to update.
     * @returns {Promise<boolean>} True if update was successful, false otherwise.
     */
    static async update(castId, updateData) {
        const {
            person_name,
            role_type,
            character_name,
            image_url,
            display_order
        } = updateData;

        // Build query dynamically based on provided fields
        const fields = [];
        const values = [];

        if (person_name !== undefined) { fields.push('person_name = ?'); values.push(person_name); }
        if (role_type !== undefined) { fields.push('role_type = ?'); values.push(role_type); }
        
        // Handle character_name carefully based on role_type
        if (character_name !== undefined) {
            if (role_type === 'Actor' || (role_type === undefined && updateData.original_role_type === 'Actor')) { // if role_type is not changing or changing to Actor
                 fields.push('character_name = ?'); values.push(character_name);
            } else if (role_type === 'Director') { // if role_type is changing to Director or is Director
                 fields.push('character_name = NULL'); // Set to NULL if role is Director
            }
        } else if (role_type === 'Director') { // If character_name is not provided but role is Director
             fields.push('character_name = NULL');
        }


        if (image_url !== undefined) { fields.push('image_url = ?'); values.push(image_url); }
        if (display_order !== undefined) { fields.push('display_order = ?'); values.push(display_order); }

        if (fields.length === 0) {
            console.log("No fields to update for cast member.");
            return false; // No fields to update
        }

        values.push(castId);
        const query = `UPDATE Movie_Cast SET ${fields.join(', ')} WHERE cast_id = ?`;

        try {
            const [result] = await pool.execute(query, values);
            return result.affectedRows > 0;
        } catch (error) {
            console.error(`Error in MovieCast.update for cast ID ${castId}:`, error);
            throw error;
        }
    }

    /**
     * Deletes a specific cast member by their cast_id.
     * @param {number} castId - The ID of the cast member to delete.
     * @returns {Promise<boolean>} True if deletion was successful, false otherwise.
     */
    static async deleteById(castId) {
        const query = 'DELETE FROM Movie_Cast WHERE cast_id = ?';
        try {
            const [result] = await pool.execute(query, [castId]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error(`Error in MovieCast.deleteById for cast ID ${castId}:`, error);
            throw error;
        }
    }

    /**
     * Deletes all cast members associated with a specific movie_id.
     * This is useful when updating a movie's cast list.
     * @param {number} movieId - The ID of the movie.
     * @returns {Promise<number>} The number of rows deleted.
     */
    static async deleteByMovieId(movieId) {
        const query = 'DELETE FROM Movie_Cast WHERE movie_id = ?';
        try {
            const [result] = await pool.execute(query, [movieId]);
            return result.affectedRows;
        } catch (error) {
            console.error(`Error in MovieCast.deleteByMovieId for movie ID ${movieId}:`, error);
            throw error;
        }
    }
}

module.exports = MovieCast;
