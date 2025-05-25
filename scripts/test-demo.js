const { testConnection } = require('../config/database');
require('dotenv').config();

async function testDemo() {
    try {
        console.log('🧪 Testing TikTok Service Demo Mode...');
        
        // Test database connection first
        const connected = await testConnection();
        if (!connected) {
            console.error('❌ Database connection failed');
            process.exit(1);
        }

        // Test TikTok service
        const TikTokService = require('../services/tiktokService');
        
        console.log('🔍 API Configuration Status:', TikTokService.isServiceConfigured());
        
        // Test URL validation
        const testUrl = 'https://www.tiktok.com/@username/video/1234567890123456789';
        console.log('🔗 Testing URL validation:', TikTokService.isValidTikTokUrl(testUrl));
        
        // Test demo video info generation
        console.log('📊 Testing demo video info generation...');
        const demoVideo = TikTokService.getDemoVideoData(testUrl);
        console.log('✅ Demo video generated:', {
            id: demoVideo.id,
            title: demoVideo.title,
            author: demoVideo.author.nickname
        });
        
        // Test complete download process
        console.log('📥 Testing complete download process...');
        try {
            const result = await TikTokService.downloadVideo(testUrl, 1); // Assuming admin user ID = 1
            console.log('✅ Download process completed:', {
                success: result.success,
                videoId: result.video.id,
                title: result.video.title
            });
        } catch (error) {
            console.error('❌ Download process failed:', error.message);
        }
        
        console.log('🎉 Demo test completed!');

    } catch (error) {
        console.error('❌ Demo test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

testDemo();