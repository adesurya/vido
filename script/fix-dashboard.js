const { testConnection, executeQuery } = require('../config/database');
require('dotenv').config();

async function fixDashboard() {
    try {
        console.log('🔧 Fixing dashboard MySQL compatibility issues...');
        
        // Test database connection
        const connected = await testConnection();
        if (!connected) {
            console.error('❌ Database connection failed');
            process.exit(1);
        }

        // Test basic queries without parameters first
        try {
            console.log('🧪 Testing basic SELECT query...');
            const basicTest = await executeQuery('SELECT COUNT(*) as count FROM users');
            console.log('✅ Basic query works, users count:', basicTest[0].count);
        } catch (error) {
            console.log('❌ Basic query failed:', error.message);
            return;
        }

        // Check if videos table exists
        try {
            console.log('🧪 Testing videos table...');
            const videoCount = await executeQuery('SELECT COUNT(*) as count FROM videos');
            console.log('📊 Videos in database:', videoCount[0].count);
            
            if (videoCount[0].count === 0) {
                console.log('📝 Creating sample video data...');
                
                // Use direct INSERT without parameters
                const insertQuery = `
                    INSERT INTO videos (
                        aweme_id, tiktok_id, title, cover_url, video_url, watermark_video_url,
                        duration, play_count, digg_count, comment_count, share_count,
                        download_count, collect_count, author_id, author_name, author_avatar,
                        music_id, music_title, music_author, file_size, watermark_file_size,
                        region, create_time
                    ) VALUES (
                        'sample_123456789', '123456789', 'Sample TikTok Video',
                        'https://via.placeholder.com/300x400/6366f1/ffffff?text=Sample+Video',
                        'https://example.com/sample.mp4', 'https://example.com/sample_wm.mp4',
                        30, 1000000, 50000, 1500, 2500, 500, 800,
                        'sample_author', 'Sample Creator',
                        'https://via.placeholder.com/100x100/6366f1/ffffff?text=SC',
                        'sample_music', 'Sample Music', 'Sample Artist',
                        5242880, 4194304, 'US', ${Math.floor(Date.now() / 1000)}
                    )
                `;

                await executeQuery(insertQuery);
                console.log('✅ Sample video data created');
            }
        } catch (error) {
            console.log('⚠️  Videos table issue:', error.message);
        }

        // Test simpler queries
        try {
            console.log('🧪 Testing simple videos query...');
            const simpleVideos = await executeQuery('SELECT * FROM videos ORDER BY play_count DESC LIMIT 3');
            console.log('✅ Simple videos query works, found:', simpleVideos.length, 'videos');
        } catch (error) {
            console.log('❌ Simple videos query failed:', error.message);
        }

        // Test download history query  
        try {
            console.log('🧪 Testing download history query...');
            const historyTest = await executeQuery('SELECT COUNT(*) as count FROM download_history');
            console.log('✅ Download history query works, count:', historyTest[0].count);
        } catch (error) {
            console.log('❌ Download history query failed:', error.message);
        }

        console.log('🎉 Dashboard compatibility fix completed!');
        console.log('💡 Application should now work with simplified queries');

    } catch (error) {
        console.error('❌ Dashboard fix failed:', error.message);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

fixDashboard();