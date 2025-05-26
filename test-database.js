// BUAT FILE BARU: test-database.js di root project
// Jalankan dengan: node test-database.js

const { executeQuery, getOne, testConnection } = require('./config/database');

async function testDatabase() {
    console.log('=== Testing Database Connection ===');
    
    try {
        // Test connection
        const connected = await testConnection();
        if (!connected) {
            console.error('❌ Database connection failed');
            return;
        }
        console.log('✅ Database connected');

        // Test users table
        console.log('\n=== Testing Users Table ===');
        const users = await executeQuery('SELECT id, username, email, role FROM users LIMIT 5');
        console.log('Users found:', users.length);
        users.forEach(user => {
            console.log(`- User ${user.id}: ${user.username} (${user.email}) - ${user.role}`);
        });

        // Test videos table
        console.log('\n=== Testing Videos Table ===');
        const videos = await executeQuery('SELECT id, title, author_name, duration, created_at FROM videos LIMIT 5');
        console.log('Videos found:', videos.length);
        videos.forEach(video => {
            console.log(`- Video ${video.id}: ${video.title} by ${video.author_name} (${video.duration}s)`);
        });

        // Test download_history table
        console.log('\n=== Testing Download History Table ===');
        const downloads = await executeQuery(`
            SELECT 
                dh.id, dh.user_id, dh.video_id, dh.download_type, dh.status, dh.downloaded_at,
                v.title, v.author_name
            FROM download_history dh
            LEFT JOIN videos v ON dh.video_id = v.id
            ORDER BY dh.downloaded_at DESC 
            LIMIT 5
        `);
        console.log('Download history found:', downloads.length);
        downloads.forEach(download => {
            console.log(`- Download ${download.id}: User ${download.user_id} -> Video "${download.title}" (${download.status})`);
        });

        // Test the specific query used by getDownloadHistory
        console.log('\n=== Testing Recent Downloads Query ===');
        if (users.length > 0) {
            const userId = users[0].id;
            console.log(`Testing for user ID: ${userId}`);
            
            const recentDownloads = await executeQuery(`
                SELECT 
                    dh.id,
                    dh.user_id,
                    dh.video_id,
                    dh.download_type,
                    dh.batch_id,
                    dh.status,
                    dh.downloaded_at,
                    v.title,
                    v.cover_url,
                    v.author_name,
                    v.duration,
                    v.play_count,
                    v.digg_count,
                    v.comment_count,
                    v.share_count,
                    v.download_count,
                    v.video_url,
                    v.watermark_video_url
                FROM download_history dh
                INNER JOIN videos v ON dh.video_id = v.id
                WHERE dh.user_id = ?
                ORDER BY dh.downloaded_at DESC
                LIMIT 6
            `, [userId]);
            
            console.log(`Recent downloads for user ${userId}:`, recentDownloads.length);
            recentDownloads.forEach(item => {
                console.log(`  - ${item.title} (${item.status}) - ${item.downloaded_at}`);
            });

            // Test video details query
            if (recentDownloads.length > 0) {
                console.log('\n=== Testing Video Details Query ===');
                const videoId = recentDownloads[0].video_id;
                const videoDetails = await getOne(`
                    SELECT 
                        v.*,
                        dh.download_type,
                        dh.downloaded_at,
                        dh.batch_id,
                        dh.status
                    FROM videos v
                    INNER JOIN download_history dh ON v.id = dh.video_id
                    WHERE v.id = ? AND dh.user_id = ?
                    ORDER BY dh.downloaded_at DESC
                    LIMIT 1
                `, [videoId, userId]);
                
                console.log(`Video details for ID ${videoId}:`, videoDetails ? 'Found' : 'Not found');
                if (videoDetails) {
                    console.log(`  - Title: ${videoDetails.title}`);
                    console.log(`  - Author: ${videoDetails.author_name}`);
                    console.log(`  - Duration: ${videoDetails.duration}s`);
                    console.log(`  - Status: ${videoDetails.status}`);
                }
            }
        }

        console.log('\n✅ Database test completed successfully');

    } catch (error) {
        console.error('❌ Database test failed:', error);
        console.error('Error details:', error.message);
    }
}

// Run the test
testDatabase().then(() => {
    console.log('\n=== Test completed ===');
    process.exit(0);
}).catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});