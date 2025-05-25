const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up TikTok Downloader Pro...\n');

// Create required directories
const directories = [
    'public/uploads',
    'logs',
    'scripts'
];

directories.forEach(dir => {
    const dirPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
    } else {
        console.log(`📁 Directory exists: ${dir}`);
    }
});

// Create .env file if it doesn't exist
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
    const envTemplate = `# Server Configuration
NODE_ENV=development
PORT=3000
HOST=localhost

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=tiktok_downloader
DB_USER=root
DB_PASSWORD=

# Session Configuration
SESSION_SECRET=your_super_secret_session_key_here_change_this_in_production
SESSION_MAX_AGE=86400000

# TikTok API Configuration
RAPIDAPI_KEY=your_rapidapi_key_here
RAPIDAPI_HOST=tiktok-download-without-watermark.p.rapidapi.com
TIKTOK_API_BASE_URL=https://tiktok-download-without-watermark.p.rapidapi.com

# Rate Limiting Configuration
RATE_LIMIT_WINDOW_MS=1000
RATE_LIMIT_MAX_REQUESTS=2
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=false

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./public/uploads/

# Security
BCRYPT_ROUNDS=10

# Application Configuration
APP_NAME=TikTok Downloader Pro
APP_VERSION=1.0.0
APP_DESCRIPTION=Professional TikTok Video Downloader with Bulk Processing

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Performance
MAX_CONCURRENT_DOWNLOADS=5
DOWNLOAD_TIMEOUT=30000
BULK_PROCESSING_DELAY=500
`;

    fs.writeFileSync(envPath, envTemplate);
    console.log('✅ Created .env file');
} else {
    console.log('📄 .env file exists');
}

console.log('\n🎉 Setup complete!');
console.log('\n📋 Next steps:');
console.log('1. Update .env file with your database credentials');
console.log('2. Update .env file with your RapidAPI key');
console.log('3. Create MySQL database: CREATE DATABASE tiktok_downloader;');
console.log('4. Run the application: npm run dev');
console.log('\n👤 Default admin login: admin / admin123');
console.log('🌐 Application will be available at: http://localhost:3000');