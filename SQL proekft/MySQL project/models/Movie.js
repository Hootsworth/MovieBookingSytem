// models/Movie.js
const pool = require('./db'); // Assuming db.js sets up the MySQL connection pool
const MovieCast = require('./MovieCast'); // Assuming MovieCast model exists

class Movie {
    static async getAll() {
        const query = `
            SELECT 
                m.movie_id, 
                m.title, 
                m.genre, 
                m.duration, 
                m.release_date,
                m.poster_image_url, 
                m.backdrop_image_url,
                m.synopsis,
                m.trailer_youtube_url,
                COALESCE(AVG(r.rating), 0) AS average_rating, 
                COUNT(DISTINCT r.review_id) AS review_count
            FROM Movies m
            LEFT JOIN Reviews r ON m.movie_id = r.movie_id
            GROUP BY m.movie_id, m.title, m.genre, m.duration, m.release_date, m.poster_image_url, m.backdrop_image_url, m.synopsis, m.trailer_youtube_url
            ORDER BY m.release_date DESC, m.title ASC;
        `;
        try {
            const [movies] = await pool.execute(query);
            return movies.map(movie => ({
                ...movie,
                average_rating: parseFloat(movie.average_rating) 
            }));
        } catch (error) {
            console.error("Error in Movie.getAll:", error);
            throw error;
        }
    }

    static async getById(id) {
        const movieQuery = `
            SELECT 
                m.movie_id, 
                m.title, 
                m.genre, 
                m.duration, 
                m.release_date,
                m.poster_image_url,
                m.backdrop_image_url,
                m.synopsis,
                m.trailer_youtube_url,
                COALESCE(AVG(r.rating), 0) AS average_rating, 
                COUNT(DISTINCT r.review_id) AS review_count
            FROM Movies m
            LEFT JOIN Reviews r ON m.movie_id = r.movie_id
            WHERE m.movie_id = ?
            GROUP BY m.movie_id, m.title, m.genre, m.duration, m.release_date, m.poster_image_url, m.backdrop_image_url, m.synopsis, m.trailer_youtube_url;
        `;
        try {
            const [movieRows] = await pool.execute(movieQuery, [id]);
            if (movieRows.length > 0) {
                const movie = movieRows[0];
                const castAndCrew = await MovieCast.getByMovieId(id);
                return {
                    ...movie,
                    average_rating: parseFloat(movie.average_rating),
                    cast_and_crew: castAndCrew || []
                };
            }
            return null; 
        } catch (error) {
            console.error(`Error in Movie.getById for ID ${id}:`, error);
            throw error;
        }
    }

    static async getPopularMovies() {
        const query = `
            SELECT
    m.movie_id,
    m.title,
    m.genre,
    m.duration,
    m.release_date,
    m.poster_image_url,
    m.backdrop_image_url,
    m.synopsis,
    m.trailer_youtube_url,
    COALESCE(AVG(r.rating), 0) AS average_rating,
    COUNT(DISTINCT r.review_id) AS review_count,
    (
        COUNT(b.booking_id) * 1.0 +
        COALESCE(AVG(r.rating), 0) * 2.0 -
        COALESCE(DATEDIFF(NOW(), MAX(b.booking_date)), 365) * 0.5 
    ) AS popularity_score
FROM
    Movies m
LEFT JOIN
    Showtimes s ON m.movie_id = s.movie_id
LEFT JOIN
    Bookings b ON s.showtime_id = b.showtime_id
LEFT JOIN
    Reviews r ON m.movie_id = r.movie_id
GROUP BY
    m.movie_id, m.title, m.genre, m.duration, m.release_date, 
    m.poster_image_url, m.backdrop_image_url, m.synopsis, m.trailer_youtube_url
ORDER BY
    popularity_score DESC
LIMIT 10;

        `;
        try {
            const [movies] = await pool.execute(query);
            return movies.map(movie => ({
                ...movie,
                average_rating: parseFloat(movie.average_rating),
                popularity_score: parseFloat(movie.popularity_score)
            }));
        } catch (error) {
            console.error("Error in Movie.getPopularMovies:", error);
            throw error;
        }
    }

    static async create(movieData, castData = []) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const { 
                title, 
                genre, 
                duration, 
                release_date, 
                poster_image_url, 
                backdrop_image_url, 
                synopsis,
                trailer_youtube_url
            } = movieData;
            
            const movieQuery = `
                INSERT INTO Movies (title, genre, duration, release_date, poster_image_url, backdrop_image_url, synopsis, trailer_youtube_url) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const [movieResult] = await connection.execute(movieQuery, [
                title, 
                genre, 
                parseInt(duration), 
                release_date, 
                poster_image_url || null, 
                backdrop_image_url || null, 
                synopsis || null,
                trailer_youtube_url || null
            ]);
            const movieId = movieResult.insertId;

            if (castData && castData.length > 0) {
                for (const castMember of castData) {
                    await connection.execute(
                        `INSERT INTO Movie_Cast (movie_id, person_name, role_type, character_name, image_url, display_order)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [
                            movieId,
                            castMember.person_name,
                            castMember.role_type,
                            castMember.role_type === 'Actor' ? castMember.character_name : null,
                            castMember.image_url || null,
                            castMember.display_order || 0
                        ]
                    );
                }
            }

            await connection.commit();
            return { 
                movie_id: movieId, 
                ...movieData,
                average_rating: 0, 
                review_count: 0,
                cast_and_crew: castData 
            };
        } catch (error) {
            await connection.rollback();
            console.error("Error in Movie.create (with transaction):", error);
            throw error;
        } finally {
            connection.release();
        }
    }

    static async update(id, movieData, castData = []) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const { 
                title, 
                genre, 
                duration, 
                release_date, 
                poster_image_url, 
                backdrop_image_url, 
                synopsis,
                trailer_youtube_url
            } = movieData;
            
            const movieQuery = `
                UPDATE Movies 
                SET title = ?, genre = ?, duration = ?, release_date = ?, 
                    poster_image_url = ?, backdrop_image_url = ?, synopsis = ?, trailer_youtube_url = ?
                WHERE movie_id = ?
            `;
            const [movieResult] = await connection.execute(movieQuery, [
                title, 
                genre, 
                parseInt(duration), 
                release_date, 
                poster_image_url !== undefined ? poster_image_url : null, 
                backdrop_image_url !== undefined ? backdrop_image_url : null, 
                synopsis !== undefined ? synopsis : null, 
                trailer_youtube_url !== undefined ? trailer_youtube_url : null,
                id
            ]);

            await connection.execute('DELETE FROM Movie_Cast WHERE movie_id = ?', [id]);

            if (castData && castData.length > 0) {
                for (const castMember of castData) {
                     await connection.execute(
                        `INSERT INTO Movie_Cast (movie_id, person_name, role_type, character_name, image_url, display_order)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [
                            id, 
                            castMember.person_name,
                            castMember.role_type,
                            castMember.role_type === 'Actor' ? castMember.character_name : null,
                            castMember.image_url || null,
                            castMember.display_order || 0
                        ]
                    );
                }
            }

            await connection.commit();
            const movieUpdated = movieResult.affectedRows > 0;
            const castPotentiallyUpdated = castData !== undefined; 
            return movieUpdated || castPotentiallyUpdated;
        } catch (error) {
            await connection.rollback();
            console.error(`Error in Movie.update (with transaction) for ID ${id}:`, error);
            throw error;
        } finally {
            connection.release();
        }
    }

    static async delete(id) {
        const query = 'DELETE FROM Movies WHERE movie_id = ?';
        try {
            const [result] = await pool.execute(query, [id]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error(`Error in Movie.delete for ID ${id}:`, error);
            throw error;
        }
    }
}

module.exports = Movie;