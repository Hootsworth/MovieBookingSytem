// models/Screen.js
const pool = require('./db');

class Screen {
    static async getByTheatreId(theater_id) {
        const [rows] = await pool.execute('SELECT * FROM Screens WHERE theater_id = ? ORDER BY screen_number ASC', [theater_id]);
        return rows;
    }

    static async getById(id) {
        const [rows] = await pool.execute('SELECT * FROM Screens WHERE screen_id = ?', [id]);
        return rows[0];
    }

    static async create(screenData, connection) {
        const { theater_id, screen_number, total_seats } = screenData;
        const queryRunner = connection || pool;
        const [result] = await queryRunner.execute(
            'INSERT INTO Screens (theater_id, screen_number, total_seats) VALUES (?, ?, ?)',
            [theater_id, parseInt(screen_number), parseInt(total_seats)]
        );
        return {
            screen_id: result.insertId,
            theater_id,
            screen_number: parseInt(screen_number),
            total_seats: parseInt(total_seats)
        };
    }

    static async update(id, screenData) {
        const { theater_id, screen_number, total_seats } = screenData;
        // Be cautious: changing total_seats might require seat re-generation.
        const [result] = await pool.execute(
            'UPDATE Screens SET theater_id = ?, screen_number = ?, total_seats = ? WHERE screen_id = ?',
            [theater_id, parseInt(screen_number), parseInt(total_seats), id]
        );
        if (result.affectedRows === 0) return null;
        return { screen_id: id, ...screenData };
    }

    static async delete(id) {
        // ON DELETE CASCADE should handle Seats and Showtimes for this screen.
        const [result] = await pool.execute('DELETE FROM Screens WHERE screen_id = ?', [id]);
        return result.affectedRows > 0;
    }
}

module.exports = Screen;
