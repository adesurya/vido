const bcrypt = require('bcrypt');
const { executeQuery, getOne } = require('../config/database');

class User {
    constructor(data = {}) {
        this.id = data.id;
        this.username = data.username;
        this.email = data.email;
        this.password_hash = data.password_hash;
        this.role = data.role || 'user';
        this.is_active = data.is_active !== undefined ? data.is_active : true;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Create new user
    static async create(userData) {
        try {
            const { username, email, password, role = 'user' } = userData;
            
            // Hash password
            const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
            const password_hash = await bcrypt.hash(password, saltRounds);
            
            const query = `
                INSERT INTO users (username, email, password_hash, role) 
                VALUES (?, ?, ?, ?)
            `;
            
            const result = await executeQuery(query, [username, email, password_hash, role]);
            
            if (result.insertId) {
                return await User.findById(result.insertId);
            }
            
            return null;
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('Username or email already exists');
            }
            throw error;
        }
    }

    // Find user by ID
    static async findById(id) {
        const query = 'SELECT * FROM users WHERE id = ? AND is_active = true';
        const userData = await getOne(query, [id]);
        return userData ? new User(userData) : null;
    }

    // Find user by username
    static async findByUsername(username) {
        const query = 'SELECT * FROM users WHERE username = ? AND is_active = true';
        const userData = await getOne(query, [username]);
        return userData ? new User(userData) : null;
    }

    // Find user by email
    static async findByEmail(email) {
        const query = 'SELECT * FROM users WHERE email = ? AND is_active = true';
        const userData = await getOne(query, [email]);
        return userData ? new User(userData) : null;
    }

    // Validate password
    async validatePassword(password) {
        return await bcrypt.compare(password, this.password_hash);
    }

    // Update user
    async update(updateData) {
        try {
            const allowedFields = ['username', 'email', 'role', 'is_active'];
            const updates = [];
            const values = [];

            for (const [key, value] of Object.entries(updateData)) {
                if (allowedFields.includes(key) && value !== undefined) {
                    updates.push(`${key} = ?`);
                    values.push(value);
                }
            }

            if (updates.length === 0) {
                return false;
            }

            values.push(this.id);
            const query = `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
            
            const result = await executeQuery(query, values);
            return result.affectedRows > 0;
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('Username or email already exists');
            }
            throw error;
        }
    }

    // Change password
    async changePassword(newPassword) {
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
        const password_hash = await bcrypt.hash(newPassword, saltRounds);
        
        const query = 'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        const result = await executeQuery(query, [password_hash, this.id]);
        return result.affectedRows > 0;
    }

    // Get all users (admin only)
    static async getAll(limit = 50, offset = 0) {
        const query = `
            SELECT id, username, email, role, is_active, created_at, updated_at 
            FROM users 
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        `;
        const users = await executeQuery(query, [limit, offset]);
        return users.map(userData => new User(userData));
    }

    // Count total users
    static async count() {
        const query = 'SELECT COUNT(*) as total FROM users WHERE is_active = true';
        const result = await getOne(query);
        return result ? result.total : 0;
    }

    // Soft delete user
    async delete() {
        const query = 'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        const result = await executeQuery(query, [this.id]);
        return result.affectedRows > 0;
    }

    // Get user download statistics
    async getDownloadStats() {
        const query = `
            SELECT 
                COUNT(*) as total_downloads,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_downloads,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_downloads,
                COUNT(CASE WHEN download_type = 'bulk' THEN 1 END) as bulk_downloads
            FROM download_history 
            WHERE user_id = ?
        `;
        return await getOne(query, [this.id]);
    }

    // Serialize user data (remove sensitive info)
    toJSON() {
        const { password_hash, ...userWithoutPassword } = this;
        return userWithoutPassword;
    }

    // Check if user is admin
    isAdmin() {
        return this.role === 'admin';
    }
}

module.exports = User;