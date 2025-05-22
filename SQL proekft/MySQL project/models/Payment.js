// models/Payment.js
const pool = require('./db');

class Payment {
    static async create(paymentData, connection) {
        // Destructure user_id but don't use it in the Payments table INSERT query
        const { booking_id, user_id, amount, payment_method, payment_status } = paymentData;
        const queryRunner = connection || pool;

        // Corrected INSERT statement: Removed user_id from columns and values
        const query = `
            INSERT INTO Payments (booking_id, amount, payment_method, payment_status, payment_date) 
            VALUES (?, ?, ?, ?, NOW())
        `;
        const values = [
            booking_id, 
            parseFloat(amount), 
            payment_method, 
            payment_status || 'Pending' // Default to 'Pending' if not provided
        ];
        
        const [result] = await queryRunner.execute(query, values);
        
        return {
            payment_id: result.insertId,
            booking_id, // Keep booking_id in the return object
            user_id: user_id, // Still useful to have user_id in the conceptual payment object if needed elsewhere, even if not in DB table
            amount: parseFloat(amount),
            payment_method,
            payment_status: payment_status || 'Pending',
            payment_date: new Date().toISOString() // Add payment_date to returned object
        };
    }

    static async getByBookingId(booking_id) {
        const [rows] = await pool.execute('SELECT * FROM Payments WHERE booking_id = ?', [booking_id]);
        return rows[0]; // Returns the payment record which includes payment_status
    }

    static async getById(payment_id) {
        const [rows] = await pool.execute('SELECT * FROM Payments WHERE payment_id = ?', [payment_id]);
        return rows[0];
    }

    static async updateStatus(payment_id, payment_status, connection) {
        const queryRunner = connection || pool;
        const [result] = await queryRunner.execute(
            'UPDATE Payments SET payment_status = ? WHERE payment_id = ?',
            [payment_status, payment_id]
        );
        return result.affectedRows > 0;
    }
}

module.exports = Payment;
