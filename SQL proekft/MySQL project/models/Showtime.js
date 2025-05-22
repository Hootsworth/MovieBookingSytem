// models/Showtime.js
const pool = require('./db');

class Showtime {
    static async getAll() {
        const query = `
            SELECT st.*, m.title AS movie_title, t.name AS theatre_name, s.screen_number
            FROM Showtimes st
            JOIN Movies m ON st.movie_id = m.movie_id
            JOIN Screens s ON st.screen_id = s.screen_id
            JOIN Theatre t ON st.theater_id = t.theater_id 
            ORDER BY st.show_date DESC, st.show_time DESC;
        `;
        const [rows] = await pool.execute(query);
        return rows;
    }

    static async getById(id) {
        const query = `
            SELECT st.*, m.title AS movie_title, m.duration AS movie_duration, m.genre AS movie_genre,
                   t.name AS theatre_name, t.location AS theatre_location, 
                   s.screen_number, s.total_seats AS screen_capacity
            FROM Showtimes st
            JOIN Movies m ON st.movie_id = m.movie_id
            JOIN Screens s ON st.screen_id = s.screen_id
            JOIN Theatre t ON st.theater_id = t.theater_id
            WHERE st.showtime_id = ?;
        `;
        const [rows] = await pool.execute(query, [id]);
        return rows[0];
    }

    static async getByMovieId(movie_id) {
        const query = `
            SELECT st.*, t.name AS theatre_name, s.screen_number
            FROM Showtimes st
            JOIN Screens s ON st.screen_id = s.screen_id
            JOIN Theatre t ON st.theater_id = t.theater_id
            WHERE st.movie_id = ? AND CONCAT(st.show_date, ' ', st.show_time) >= NOW()
            ORDER BY st.show_date ASC, st.show_time ASC;
        `;
        const [rows] = await pool.execute(query, [movie_id]);
        return rows;
    }
    
    static async getByTheatreId(theater_id) {
        const query = `
            SELECT st.*, m.title AS movie_title, s.screen_number
            FROM Showtimes st
            JOIN Movies m ON st.movie_id = m.movie_id
            JOIN Screens s ON st.screen_id = s.screen_id
            WHERE st.theater_id = ? AND CONCAT(st.show_date, ' ', st.show_time) >= NOW()
            ORDER BY st.show_date ASC, st.show_time ASC;
        `;
        const [rows] = await pool.execute(query, [theater_id]);
        return rows;
    }


    static async create(showtimeData, connection) {
        const { movie_id, theater_id, screen_id, show_date, show_time, available_seats } = showtimeData;
        const queryRunner = connection || pool;
        const [result] = await queryRunner.execute(
            'INSERT INTO Showtimes (movie_id, theater_id, screen_id, show_date, show_time, available_seats) VALUES (?, ?, ?, ?, ?, ?)',
            [movie_id, theater_id, screen_id, show_date, show_time, parseInt(available_seats)]
        );
        return {
            showtime_id: result.insertId,
            ...showtimeData
        };
    }

    static async update(id, showtimeData) {
        const { movie_id, theater_id, screen_id, show_date, show_time, available_seats } = showtimeData;
        const [result] = await pool.execute(
            'UPDATE Showtimes SET movie_id = ?, theater_id = ?, screen_id = ?, show_date = ?, show_time = ?, available_seats = ? WHERE showtime_id = ?',
            [movie_id, theater_id, screen_id, show_date, show_time, parseInt(available_seats), id]
        );
        if (result.affectedRows === 0) return null;
        return { showtime_id: id, ...showtimeData };
    }
    
    static async updateAvailableSeats(showtime_id, seat_count_change, connection) {
        // seat_count_change can be negative (for booking) or positive (for cancellation)
        const queryRunner = connection || pool;
        const query = 'UPDATE Showtimes SET available_seats = available_seats + ? WHERE showtime_id = ? AND available_seats + ? >= 0';
        const [result] = await queryRunner.execute(query, [seat_count_change, showtime_id, seat_count_change]);
        if (result.affectedRows === 0) {
            throw new Error('Failed to update available seats or not enough seats available.');
        }
        return true;
    }

    static async delete(id) {
        // ON DELETE CASCADE in Bookings table should handle related bookings.
        const [result] = await pool.execute('DELETE FROM Showtimes WHERE showtime_id = ?', [id]);
        return result.affectedRows > 0;
    }
}

module.exports = Showtime;
