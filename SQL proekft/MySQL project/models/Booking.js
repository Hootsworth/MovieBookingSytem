// models/Booking.js
const pool = require('./db');

class Booking {
    static async getById(id) {
        const query = `
            SELECT b.*, 
                   u.username, u.email AS user_email,
                   st.show_date, st.show_time,
                   m.title AS movie_title, m.genre AS movie_genre, m.duration AS movie_duration, m.poster_image_url,
                   th.name AS theatre_name, th.location AS theatre_location,
                   s.screen_number,
                   seat.seat_number, seat.seat_type
            FROM Bookings b
            JOIN Users u ON b.user_id = u.user_id
            JOIN Showtimes st ON b.showtime_id = st.showtime_id
            JOIN Movies m ON st.movie_id = m.movie_id
            JOIN Screens s ON st.screen_id = s.screen_id
            JOIN Theatre th ON st.theater_id = th.theater_id
            JOIN Seats seat ON b.seat_id = seat.seat_id
            WHERE b.booking_id = ?;
        `;
        const [rows] = await pool.execute(query, [id]);
        const booking = rows[0];
        if (booking) {
            // Map poster_image_url to poster_url for frontend consistency if needed
            booking.poster_url = booking.poster_image_url || '/images/placeholder-poster.png';
        }
        return booking;
    }

    static async getByUserId(user_id) {
        const query = `
            SELECT b.booking_id, b.showtime_id, b.seat_id, b.seats_booked, b.booking_date, b.status, 
                   st.show_date, st.show_time,
                   m.title AS movie_title, m.poster_image_url, /* Added poster_image_url */
                   th.name AS theatre_name,
                   s.screen_number,
                   seat.seat_number, seat.seat_type
            FROM Bookings b
            JOIN Showtimes st ON b.showtime_id = st.showtime_id
            JOIN Movies m ON st.movie_id = m.movie_id
            JOIN Screens s ON st.screen_id = s.screen_id
            JOIN Theatre th ON st.theater_id = th.theater_id
            JOIN Seats seat ON b.seat_id = seat.seat_id
            WHERE b.user_id = ?
            ORDER BY b.booking_date DESC;
        `;
        const [rows] = await pool.execute(query, [user_id]);
        return rows.map(booking => ({
            ...booking,
            poster_url: booking.poster_image_url || '/images/placeholder-poster.png' // Ensure poster_url for frontend
        }));
    }

    static async getAll() {
        const query = `
            SELECT b.*, 
                   u.username,
                   st.show_date, st.show_time,
                   m.title AS movie_title, m.poster_image_url,
                   th.name AS theatre_name,
                   seat.seat_number
            FROM Bookings b
            JOIN Users u ON b.user_id = u.user_id
            JOIN Showtimes st ON b.showtime_id = st.showtime_id
            JOIN Movies m ON st.movie_id = m.movie_id
            JOIN Theatre th ON st.theater_id = th.theater_id
            JOIN Seats seat ON b.seat_id = seat.seat_id
            ORDER BY b.booking_date DESC;
        `;
        const [rows] = await pool.execute(query);
         return rows.map(booking => ({
            ...booking,
            poster_url: booking.poster_image_url || '/images/placeholder-poster.png'
        }));
    }

    static async createMany(bookingDataArray, connection) {
        const queryRunner = connection || pool; 
        const createdBookingIds = [];
        let firstBookingId = null;

        for (const booking of bookingDataArray) {
            const [result] = await queryRunner.execute(
                'INSERT INTO Bookings (user_id, showtime_id, seat_id, seats_booked, booking_date, status) VALUES (?, ?, ?, ?, NOW(), ?)',
                [
                    booking.user_id,
                    booking.showtime_id,
                    booking.seat_id,
                    1, 
                    booking.status || 'Confirmed'
                ]
            );
            if (!firstBookingId) {
                firstBookingId = result.insertId;
            }
            createdBookingIds.push(result.insertId);
        }
        return { firstBookingId, allBookingIds: createdBookingIds };
    }

    static async cancel(booking_id, connection) {
        const queryRunner = connection || pool;
        const [result] = await queryRunner.execute(
            "UPDATE Bookings SET status = 'Cancelled' WHERE booking_id = ?",
            [booking_id]
        );
        return result.affectedRows > 0;
    }

    static async getByUserIdAndShowtimeIdForTransaction(user_id, showtime_id, transaction_timestamp, connection) {
        const queryRunner = connection || pool;
        const query = `
            SELECT b.booking_id, b.seat_id, s.seat_number, s.seat_type, 
                   m.title as movie_title, m.poster_image_url,
                   th.name as theatre_name, 
                   sc.screen_number, 
                   st.show_date, st.show_time
            FROM Bookings b
            JOIN Seats s ON b.seat_id = s.seat_id
            JOIN Showtimes st ON b.showtime_id = st.showtime_id
            JOIN Movies m ON st.movie_id = m.movie_id
            JOIN Theatre th ON st.theater_id = th.theater_id
            JOIN Screens sc ON st.screen_id = sc.screen_id
            WHERE b.user_id = ? 
              AND b.showtime_id = ? 
              AND ABS(TIMESTAMPDIFF(SECOND, b.booking_date, ?)) < 15
            ORDER BY b.booking_id ASC; 
        `;
        const [rows] = await queryRunner.execute(query, [user_id, showtime_id, transaction_timestamp]);
        return rows.map(booking => ({
            ...booking,
            poster_url: booking.poster_image_url || '/images/placeholder-poster.png'
        }));
    }
}

module.exports = Booking;
