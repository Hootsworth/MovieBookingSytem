// models/Theatre.js
const pool = require('./db');

class Theatre {
    static async getAll() {
        // Corrected table name from Theaters to Theatres
        const [rows] = await pool.execute('SELECT * FROM Theatre ORDER BY name');
        return rows;
    }

    static async getById(id) {
        const [rows] = await pool.execute('SELECT * FROM Theatre WHERE theater_id = ?', [id]);
        return rows[0];
    }

    static async create(theatreData, connection) {
        const { name, location, total_seats } = theatreData;
        const queryRunner = connection || pool;
        const [result] = await queryRunner.execute(
            'INSERT INTO Theatre (name, location, total_seats) VALUES (?, ?, ?)',
            [name, location, parseInt(total_seats)]
        );
        return {
            theater_id: result.insertId,
            name,
            location,
            total_seats: parseInt(total_seats)
        };
    }

    static async update(id, theatreData) {
        const { name, location, total_seats } = theatreData;
        const [result] = await pool.execute(
            'UPDATE Theatre SET name = ?, location = ?, total_seats = ? WHERE theater_id = ?',
            [name, location, parseInt(total_seats), id]
        );
        if (result.affectedRows === 0) return null;
        return { theater_id: id, ...theatreData };
    }

    static async delete(id) {
        // ON DELETE CASCADE in DB schema should handle related Screens, Showtimes, etc.
        const [result] = await pool.execute('DELETE FROM Theatre WHERE theater_id = ?', [id]);
        return result.affectedRows > 0;
    }
}

module.exports = Theatre;
