// models/Seat.js
const pool = require('./db');

class Seat {
    static async getByScreenId(screen_id) {
        const [rows] = await pool.execute('SELECT * FROM Seats WHERE screen_id = ? ORDER BY seat_id ASC', [screen_id]);
        return rows;
    }

    static async getById(id) {
        const [rows] = await pool.execute('SELECT * FROM Seats WHERE seat_id = ?', [id]);
        return rows[0];
    }

    static async create(seatData, connection) {
        const { screen_id, seat_number, seat_type } = seatData;
        const queryRunner = connection || pool;
        const [result] = await queryRunner.execute(
            'INSERT INTO Seats (screen_id, seat_number, seat_type) VALUES (?, ?, ?)',
            [screen_id, seat_number, seat_type]
        );
        return {
            seat_id: result.insertId,
            screen_id,
            seat_number,
            seat_type
        };
    }
    
    static async createMany(seatsDataArray, screen_id, connection) {
        const queryRunner = connection || pool;
        // For batch insert, it's more efficient to build a single query if possible,
        // but iterating is fine for clarity if the number of seats per screen isn't massive.
        const createdSeats = [];
        for (const seatData of seatsDataArray) {
            const [result] = await queryRunner.execute(
                'INSERT INTO Seats (screen_id, seat_number, seat_type) VALUES (?, ?, ?)',
                [screen_id, seatData.seat_number, seatData.seat_type]
            );
            createdSeats.push({
                seat_id: result.insertId,
                screen_id: screen_id,
                seat_number: seatData.seat_number,
                seat_type: seatData.seat_type
            });
        }
        return createdSeats;
    }

    static async getAvailableSeatsForShowtime(showtime_id) {
        // This query identifies seats for a showtime's screen that are NOT in the Bookings table for that showtime.
        const query = `
            SELECT s.*
            FROM Seats s
            JOIN Screens sc ON s.screen_id = sc.screen_id
            JOIN Showtimes st ON sc.screen_id = st.screen_id
            WHERE st.showtime_id = ? AND s.seat_id NOT IN (
                SELECT b.seat_id 
                FROM Bookings b 
                WHERE b.showtime_id = ? AND b.status = 'Confirmed'
            )
            ORDER BY s.seat_id ASC;
        `;
        const [rows] = await pool.execute(query, [showtime_id, showtime_id]);
        return rows;
    }

     static async getBookedSeatsForShowtime(showtime_id) {
        const query = `
            SELECT s.seat_id, s.seat_number, s.seat_type
            FROM Seats s
            JOIN Bookings b ON s.seat_id = b.seat_id
            WHERE b.showtime_id = ? AND b.status = 'Confirmed'
            ORDER BY s.seat_id ASC;
        `;
        const [rows] = await pool.execute(query, [showtime_id]);
        return rows;
    }
}

module.exports = Seat;
