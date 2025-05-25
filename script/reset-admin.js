const bcrypt = require('bcrypt');
const { executeQuery, testConnection } = require('../config/database');
require('dotenv').config();

async function resetAdminPassword() {
    try {
        console.log('🔄 Resetting admin password...');
        
        // Test database connection
        const connected = await testConnection();
        if (!connected) {
            console.error('❌ Database connection failed');
            process.exit(1);
        }

        // Hash the password 'admin123'
        const password = 'admin123';
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        console.log('🔐 Generated password hash:', hashedPassword);

        // Delete existing admin user if exists
        await executeQuery('DELETE FROM users WHERE username = ? OR email = ?', ['admin', 'admin@tiktokdownloader.com']);
        console.log('🗑️  Removed existing admin user');

        // Insert new admin user
        const insertQuery = `
            INSERT INTO users (username, email, password_hash, role, is_active) 
            VALUES (?, ?, ?, ?, ?)
        `;
        
        const result = await executeQuery(insertQuery, [
            'admin',
            'admin@tiktokdownloader.com',
            hashedPassword,
            'admin',
            true
        ]);

        if (result.insertId) {
            console.log('✅ Admin user created successfully!');
            console.log('📋 Login details:');
            console.log('   Username: admin');
            console.log('   Password: admin123');
            console.log('   Email: admin@tiktokdownloader.com');
            console.log('   Role: admin');
        } else {
            console.error('❌ Failed to create admin user');
        }

    } catch (error) {
        console.error('❌ Error resetting admin password:', error.message);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

// Run the script
resetAdminPassword();