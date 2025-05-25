#!/usr/bin/env node

/**
 * Setup script for TikTok Downloader Pro
 * Usage: node setup.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function setup() {
    console.log('🚀 TikTok Downloader Pro Setup\n');
    console.log('This script will help you configure your application.\n');
    
    // Check if .env exists
    const envPath = path.join(__dirname, '.env');
    const envExamplePath = path.join(__dirname, '.env.example');
    
    if (!fs.existsSync(envPath)) {
        console.log('📝 Creating .env file...');
        
        // Copy from .env.example if it exists
        if (fs.existsSync(envExamplePath)) {
            fs.copyFileSync(envExamplePath, envPath);
            console.log('✅ .env file created from template\n');
        } else {
            // Create basic .env file
            const basicEnv = `# TikTok Downloader Pro Configuration
NODE_ENV=development
PORT=3000
APP_NAME=TikTok Downloader Pro
APP_VERSION=1.0.0

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=tiktok_downloader

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
SESSION_MAX_AGE=86400000

# TikTok API Configuration (RapidAPI)
RAPIDAPI_KEY=
RAPIDAPI_HOST=tiktok-download-without-watermark.p.rapidapi.com
TIKTOK_API_BASE_URL=https://tiktok-download-without-watermark.p.rapidapi.com

# Rate Limiting Settings
RATE_LIMIT_WINDOW_MS=1000
RATE_LIMIT_MAX_REQUESTS=2
DOWNLOAD_TIMEOUT=30000
BULK_PROCESSING_DELAY=500
MAX_CONCURRENT_DOWNLOADS=5

# File Upload Settings
MAX_FILE_SIZE=10485760

# Security Settings
BCRYPT_ROUNDS=10
`;
            fs.writeFileSync(envPath, basicEnv);
            console.log('✅ Basic .env file created\n');
        }
    } else {
        console.log('📋 .env file already exists\n');
    }
    
    // Check API configuration
    console.log('🔑 API Configuration Check\n');
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const hasApiKey = envContent.includes('RAPIDAPI_KEY=') && 
                     !envContent.includes('RAPIDAPI_KEY=\n') &&
                     !envContent.includes('RAPIDAPI_KEY=""');
    
    if (!hasApiKey) {
        console.log('⚠️  No RapidAPI key found in .env file');
        console.log('');
        console.log('To enable real TikTok downloads:');
        console.log('1. Go to https://rapidapi.com/yi005/api/tiktok-download-without-watermark');
        console.log('2. Subscribe to the API (free tier available)');
        console.log('3. Copy your API key');
        console.log('4. Add it to your .env file as: RAPIDAPI_KEY=your_key_here');
        console.log('');
        
        const addKey = await question('Do you want to add your RapidAPI key now? (y/n): ');
        
        if (addKey.toLowerCase() === 'y' || addKey.toLowerCase() === 'yes') {
            const apiKey = await question('Enter your RapidAPI key: ');
            
            if (apiKey && apiKey.trim()) {
                // Update .env file with API key
                const updatedEnv = envContent.replace(
                    /RAPIDAPI_KEY=.*/,
                    `RAPIDAPI_KEY=${apiKey.trim()}`
                );
                fs.writeFileSync(envPath, updatedEnv);
                console.log('✅ API key added to .env file\n');
            }
        }
    } else {
        console.log('✅ RapidAPI key found in configuration\n');
    }
    
    // Database setup instructions
    console.log('🗄️  Database Setup\n');
    console.log('Please ensure you have:');
    console.log('1. MySQL/MariaDB installed and running');
    console.log('2. Created a database named "tiktok_downloader"');
    console.log('3. Updated database credentials in .env file if needed');
    console.log('');
    console.log('You can create the database and tables by running:');
    console.log('mysql -u root -p < database-schema.sql');
    console.log('');
    
    // Final instructions
    console.log('🎯 Next Steps:\n');
    console.log('1. Install dependencies: npm install');
    console.log('2. Set up your database using the SQL schema');
    console.log('3. Test API configuration: node test-api.js');
    console.log('4. Start the application: npm start');
    console.log('');
    console.log('📚 Default Admin Account:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   URL: http://localhost:3000/auth/login');
    console.log('');
    console.log('🎉 Setup complete! Ready to start downloading TikTok videos!');
    
    rl.close();
}

// Handle errors
process.on('uncaughtException', (error) => {
    console.error('Setup failed:', error.message);
    process.exit(1);
});

setup().catch((error) => {
    console.error('Setup failed:', error.message);
    process.exit(1);
});