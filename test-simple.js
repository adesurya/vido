// BUAT FILE: test-simple.js
// Jalankan: node test-simple.js

const { executeQuery, getOne } = require('./config/database');

async function testSimple() {
    try {
        console.log('Testing database queries...');
        
        // Test 1: Check users
        const users = await executeQuery('SELECT * FROM users LIMIT 1');
        console.log('Users:', users.length);
        if (users.length > 0) {
            console.log('First user:', users[0]);
            
            const userId = users[0].id;
            
            // Test 2: Check download history for this user
            const downloads = await executeQuery(`
                SELECT dh.*, v.title 
                FROM download_history dh 
                LEFT JOIN videos v ON dh.video_id = v.id 
                WHERE dh.user_id = ? 
                LIMIT 5
            `, [userId]);
            
            console.log(`Downloads for user ${userId}:`, downloads.length);
            downloads.forEach(d => {
                console.log(`  - ${d.title} (status: ${d.status})`);
            });
            
            // Test 3: Test the exact query from getDownloadHistory
            console.log('\nTesting exact getDownloadHistory query...');
            const history = await executeQuery(`
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
            
            console.log('History query result:', history.length);
            if (history.length > 0) {
                console.log('First history item:', {
                    id: history[0].id,
                    title: history[0].title,
                    status: history[0].status,
                    author: history[0].author_name
                });
            }
        }
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testSimple();