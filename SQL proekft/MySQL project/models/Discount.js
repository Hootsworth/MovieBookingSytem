// models/Discount.js
const pool = require('./db');

class Discount {
    /**
     * Creates a new discount code.
     * @param {object} discountData - Data for the new discount.
     * @param {string} discountData.code - The discount code.
     * @param {number} discountData.discount_percentage - The percentage of the discount.
     * @param {string} discountData.valid_from - The start date of validity (YYYY-MM-DD).
     * @param {string} discountData.valid_until - The end date of validity (YYYY-MM-DD).
     * @returns {Promise<object>} The created discount object.
     */
    static async create({ code, discount_percentage, valid_from, valid_until }) {
        if (!code || discount_percentage === undefined || !valid_from || !valid_until) {
            throw new Error('Code, discount percentage, valid_from, and valid_until are required.');
        }
        if (parseFloat(discount_percentage) <= 0 || parseFloat(discount_percentage) > 100) {
            throw new Error('Discount percentage must be between 0 (exclusive) and 100 (inclusive).');
        }

        const query = `
            INSERT INTO Discounts (code, discount_percentage, valid_from, valid_until)
            VALUES (?, ?, ?, ?)
        `;
        const [result] = await pool.execute(query, [code.toUpperCase(), discount_percentage, valid_from, valid_until]);
        return {
            discount_id: result.insertId,
            code: code.toUpperCase(),
            discount_percentage,
            valid_from,
            valid_until
        };
    }

    /**
     * Retrieves all discounts.
     * @returns {Promise<Array<object>>} An array of all discount objects.
     */
    static async getAll() {
        const query = 'SELECT * FROM Discounts ORDER BY valid_until DESC, code ASC';
        const [rows] = await pool.execute(query);
        return rows;
    }

    /**
     * Retrieves a discount by its code.
     * Only returns if the discount is currently valid (between valid_from and valid_until).
     * @param {string} code - The discount code.
     * @returns {Promise<object|null>} The discount object if found and valid, otherwise null.
     */
    static async getByCode(code) {
        if (!code) return null;
        const query = `
            SELECT * FROM Discounts 
            WHERE code = ? AND CURDATE() >= valid_from AND CURDATE() <= valid_until
        `;
        const [rows] = await pool.execute(query, [code.toUpperCase()]);
        return rows[0] || null;
    }

    /**
     * Retrieves a discount by its ID.
     * @param {number} discountId - The ID of the discount.
     * @returns {Promise<object|null>} The discount object if found, otherwise null.
     */
    static async getById(discountId) {
        const query = 'SELECT * FROM Discounts WHERE discount_id = ?';
        const [rows] = await pool.execute(query, [discountId]);
        return rows[0] || null;
    }
    
    /**
     * Records that a discount was used for a specific booking.
     * @param {number} booking_id - The ID of the booking.
     * @param {number} discount_id - The ID of the discount used.
     * @param {object} connection - Optional database connection for transactions.
     * @returns {Promise<boolean>} True if successful.
     */
    static async recordBookingDiscount(booking_id, discount_id, connection) {
        const queryRunner = connection || pool;
        const query = 'INSERT INTO Booking_Discounts (booking_id, discount_id) VALUES (?, ?)';
        try {
            await queryRunner.execute(query, [booking_id, discount_id]);
            return true;
        } catch (error) {
            // Handle potential duplicate entry if discount already recorded for this booking
            if (error.code === 'ER_DUP_ENTRY') {
                console.warn(`Discount ${discount_id} already recorded for booking ${booking_id}`);
                return true; // Or false, depending on desired behavior
            }
            throw error; // Re-throw other errors
        }
    }

    // Add update and delete methods if needed for admin management
    // static async update(discount_id, { code, discount_percentage, valid_from, valid_until }) { ... }
    // static async delete(discount_id) { ... }
}

module.exports = Discount;
