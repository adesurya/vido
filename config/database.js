const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tiktok_downloader',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
    charset: 'utf8mb4',
    // Add these options for better compatibility
    supportBigNumbers: true,
    bigNumberStrings: true,
    dateStrings: true
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
};

// Execute query with better parameter handling
const executeQuery = async (query, params = []) => {
    try {
        // Use query() instead of execute() for better compatibility
        const [rows] = await pool.query(query, params);
        return rows;
    } catch (error) {
        console.error('Database query error:', {
            message: error.message,
            code: error.code,
            sql: query.trim(),
            params: params
        });
        throw error;
    }
};

// Get single row with error handling
const getOne = async (query, params = []) => {
    try {
        const rows = await executeQuery(query, params);
        return rows[0] || null;
    } catch (error) {
        console.error('Database getOne error:', error.message);
        throw error;
    }
};

// Transaction support
const transaction = async (callback) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const result = await callback(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

module.exports = {
    pool,
    testConnection,
    executeQuery,
    getOne,
    transaction
};