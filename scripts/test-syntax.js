// Quick syntax test for TikTok Service
require('dotenv').config();

console.log('🧪 Testing TikTok Service syntax...');

try {
    // Test if file can be required without syntax error
    const tiktokService = require('../services/tiktokService');
    console.log('✅ TikTok Service loaded successfully');
    
    // Test basic methods
    console.log('🔍 API Configured:', tiktokService.isServiceConfigured());
    console.log('🔗 URL Validation:', tiktokService.isValidTikTokUrl('https://www.tiktok.com/@test/video/123'));
    
    // Test demo data generation
    const demoData = tiktokService.getDemoVideoData('https://www.tiktok.com/@test/video/123');
    console.log('📊 Demo data generated:', demoData.title);
    
    console.log('🎉 All syntax tests passed!');
    
} catch (error) {
    console.error('❌ Syntax error:', error.message);
    console.error(error.stack);
    process.exit(1);
}

process.exit(0);