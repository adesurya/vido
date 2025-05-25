const axios = require('axios');
require('dotenv').config();

async function testRealAPI() {
    console.log('🧪 Testing Real TikTok API...');
    
    const apiKey = process.env.RAPIDAPI_KEY;
    const apiHost = process.env.RAPIDAPI_HOST;
    const baseUrl = process.env.TIKTOK_API_BASE_URL;
    
    console.log('🔑 API Key configured:', !!apiKey);
    console.log('🏠 API Host:', apiHost);
    console.log('🌐 Base URL:', baseUrl);
    
    if (!apiKey || !apiHost || !baseUrl) {
        console.log('⚠️  API not configured, testing demo mode...');
        const tiktokService = require('../services/tiktokService');
        const demoData = tiktokService.getDemoVideoData('https://www.tiktok.com/@test/video/123');
        console.log('✅ Demo data generated:', demoData.title);
        return;
    }
    
    const testUrl = 'https://www.tiktok.com/@tiktok/video/7487857534544383250';
    
    try {
        console.log('📞 Making API request...');
        console.log('🔗 Test URL:', testUrl);
        
        const axiosInstance = axios.create({
            timeout: 30000,
            headers: {
                'x-rapidapi-host': apiHost,
                'x-rapidapi-key': apiKey,
                'User-Agent': 'TikTokDownloader/1.0'
            }
        });
        
        const response = await axiosInstance.get(baseUrl + '/analysis', {
            params: {
                url: testUrl,
                hd: '1080'
            }
        });
        
        console.log('📊 Response Status:', response.status);
        console.log('📋 Response Code:', response.data?.code);
        console.log('📝 Response Message:', response.data?.msg);
        
        if (response.data.code === 0) {
            console.log('✅ API working correctly!');
            console.log('🎬 Video Title:', response.data.data.title);
            console.log('👤 Author:', response.data.data.author?.nickname);
            console.log('⏱️  Duration:', response.data.data.duration, 'seconds');
        } else {
            console.log('❌ API returned error:', response.data.msg);
        }
        
    } catch (error) {
        console.error('❌ API Test Failed:');
        console.error('Error Type:', error.constructor.name);
        console.error('Error Message:', error.message);
        
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', error.response.data);
        }
        
        if (error.code) {
            console.error('Error Code:', error.code);
        }
        
        console.log('\n💡 Troubleshooting:');
        console.log('1. Check your RAPIDAPI_KEY in .env');
        console.log('2. Verify API subscription is active');
        console.log('3. Check API quota/rate limits');
        console.log('4. Ensure the TikTok URL is valid and public');
    }
    
    process.exit(0);
}

testRealAPI();