// models/db.js
const mysql = require('mysql2/promise');
require('dotenv').config(); // Load environment variables from .env file

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true // To ensure dates are returned as strings, not JS Date objects
});

// Test database connection and log success or failure
async function testConnection() {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('Successfully connected to the database.');
        return true;
    } catch (error) {
        console.error('Failed to connect to the database:', error.message);
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('Check your database username and password in the .env file.');
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            console.error(`Database '${process.env.DB_NAME}' does not exist. Please create it.`);
        }
        // Exit process if DB connection fails on startup for critical operations
        // process.exit(1); // Or handle more gracefully depending on app requirements
        return false;
    } finally {
        if (connection) connection.release();
    }
}

// Call testConnection when the module loads
testConnection();

module.exports = pool; // Export the pool directly for transactions and queries
