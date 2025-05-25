require('dotenv').config();

console.log('🔍 Checking TikTok API Configuration...\n');

const config = {
    RAPIDAPI_KEY: process.env.RAPIDAPI_KEY,
    RAPIDAPI_HOST: process.env.RAPIDAPI_HOST,
    TIKTOK_API_BASE_URL: process.env.TIKTOK_API_BASE_URL
};

console.log('📋 Current Configuration:');
console.log('RAPIDAPI_KEY:', config.RAPIDAPI_KEY ? `${config.RAPIDAPI_KEY.substring(0, 8)}...` : '❌ NOT SET');
console.log('RAPIDAPI_HOST:', config.RAPIDAPI_HOST || '❌ NOT SET');
console.log('TIKTOK_API_BASE_URL:', config.TIKTOK_API_BASE_URL || '❌ NOT SET');

const isConfigured = !!(config.RAPIDAPI_KEY && config.RAPIDAPI_HOST && config.TIKTOK_API_BASE_URL &&
                       config.RAPIDAPI_KEY.length > 10 &&
                       config.RAPIDAPI_HOST.includes('tiktok') &&
                       config.TIKTOK_API_BASE_URL.includes('https'));

console.log('\n🎯 Configuration Status:', isConfigured ? '✅ CONFIGURED' : '❌ NOT CONFIGURED');

if (!isConfigured) {
    console.log('\n💡 To configure the API:');
    console.log('1. Edit your .env file and add:');
    console.log('   RAPIDAPI_KEY=your_rapidapi_key_here');
    console.log('   RAPIDAPI_HOST=tiktok-download-without-watermark.p.rapidapi.com');
    console.log('   TIKTOK_API_BASE_URL=https://tiktok-download-without-watermark.p.rapidapi.com');
    console.log('\n2. Or run: npm run configure-api');
    console.log('\n3. Restart the server: npm run dev');
} else {
    console.log('\n✅ API is properly configured for real downloads!');
}

// Test URL validation
console.log('\n🧪 Testing URL Validation:');
const testUrls = [
    'https://www.tiktok.com/@tiktok/video/7487857534544383250',
    'https://vm.tiktok.com/ZMhvBQxYz',
    'https://www.tiktok.com/t/ZTRfoBALp',
    'invalid-url'
];

const TikTokService = require('../services/tiktokService');

testUrls.forEach(url => {
    const isValid = TikTokService.isValidTikTokUrl(url);
    console.log(`${isValid ? '✅' : '❌'} ${url}`);
});

process.exit(0);