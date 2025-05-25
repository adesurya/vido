const bcrypt = require('bcrypt');
const { getOne, testConnection } = require('../config/database');
require('dotenv').config();

async function verifyLogin(username, password) {
    try {
        console.log('🔍 Verifying login credentials...');
        
        // Test database connection
        const connected = await testConnection();
        if (!connected) {
            console.error('❌ Database connection failed');
            process.exit(1);
        }

        // Find user
        const user = await getOne('SELECT * FROM users WHERE username = ? OR email = ?', [username, username]);
        
        if (!user) {
            console.error('❌ User not found');
            console.log('📋 Available users:');
            
            const allUsers = await require('../config/database').executeQuery('SELECT id, username, email, role FROM users');
            console.table(allUsers);
            return false;
        }

        console.log('👤 User found:', {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            is_active: user.is_active
        });

        // Check if user is active
        if (!user.is_active) {
            console.error('❌ User account is deactivated');
            return false;
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.password_hash);
        
        if (isValid) {
            console.log('✅ Password is correct!');
            console.log('🎉 Login verification successful');
            return true;
        } else {
            console.error('❌ Password is incorrect');
            console.log('🔐 Stored hash:', user.password_hash);
            console.log('🔐 Testing password:', password);
            
            // Test with manual hash
            const testHash = await bcrypt.hash(password, 10);
            console.log('🔐 New hash would be:', testHash);
            
            return false;
        }

    } catch (error) {
        console.error('❌ Error verifying login:', error.message);
        return false;
    }
}

// Get command line arguments
const args = process.argv.slice(2);
const username = args[0] || 'admin';
const password = args[1] || 'admin123';

console.log(`Testing login: ${username} / ${password}`);
verifyLogin(username, password).then(() => process.exit(0));