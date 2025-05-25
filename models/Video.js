const { executeQuery, getOne } = require('../config/database');

class Video {
    constructor(data = {}) {
        this.id = data.id;
        this.aweme_id = data.aweme_id;
        this.tiktok_id = data.tiktok_id;
        this.title = data.title;
        this.cover_url = data.cover_url;
        this.video_url = data.video_url;
        this.watermark_video_url = data.watermark_video_url;
        this.duration = data.duration;
        this.play_count = data.play_count;
        this.digg_count = data.digg_count;
        this.comment_count = data.comment_count;
        this.share_count = data.share_count;
        this.download_count = data.download_count;
        this.collect_count = data.collect_count;
        this.author_id = data.author_id;
        this.author_name = data.author_name;
        this.author_avatar = data.author_avatar;
        this.music_id = data.music_id;
        this.music_title = data.music_title;
        this.music_author = data.music_author;
        this.file_size = data.file_size;
        this.watermark_file_size = data.watermark_file_size;
        this.region = data.region;
        this.create_time = data.create_time;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Create or update video from TikTok API response
    static async createFromApiResponse(apiData) {
        try {
            console.log('💾 Creating video from API data:', apiData.title);
            
            const videoData = {
                aweme_id: apiData.aweme_id,
                tiktok_id: apiData.id,
                title: apiData.title || 'Untitled Video',
                cover_url: apiData.cover,
                video_url: apiData.play,
                watermark_video_url: apiData.wmplay,
                duration: apiData.duration || 0,
                play_count: apiData.play_count || 0,
                digg_count: apiData.digg_count || 0,
                comment_count: apiData.comment_count || 0,
                share_count: apiData.share_count || 0,
                download_count: apiData.download_count || 0,
                collect_count: apiData.collect_count || 0,
                author_id: apiData.author?.id || 'unknown',
                author_name: apiData.author?.nickname || 'Unknown Author',
                author_avatar: apiData.author?.avatar,
                music_id: apiData.music_info?.id,
                music_title: apiData.music_info?.title,
                music_author: apiData.music_info?.author,
                file_size: apiData.size || 0,
                watermark_file_size: apiData.wm_size || 0,
                region: apiData.region || 'US',
                create_time: apiData.create_time || Math.floor(Date.now() / 1000)
            };

            // Check if video already exists
            const existingVideo = await Video.findByAwemeId(videoData.aweme_id);
            if (existingVideo) {
                console.log('📝 Updating existing video:', existingVideo.id);
                // Update existing video with latest data
                await existingVideo.update(videoData);
                return existingVideo;
            }

            // Create new video with error handling
            const query = `
                INSERT INTO videos (
                    aweme_id, tiktok_id, title, cover_url, video_url, watermark_video_url,
                    duration, play_count, digg_count, comment_count, share_count, 
                    download_count, collect_count, author_id, author_name, author_avatar,
                    music_id, music_title, music_author, file_size, watermark_file_size,
                    region, create_time
                ) VALUES (
                    '${videoData.aweme_id}', '${videoData.tiktok_id}', '${videoData.title.replace(/'/g, "''")}', 
                    '${videoData.cover_url}', '${videoData.video_url}', '${videoData.watermark_video_url}',
                    ${videoData.duration}, ${videoData.play_count}, ${videoData.digg_count}, 
                    ${videoData.comment_count}, ${videoData.share_count}, ${videoData.download_count}, 
                    ${videoData.collect_count}, '${videoData.author_id}', '${videoData.author_name.replace(/'/g, "''")}', 
                    '${videoData.author_avatar || ''}', '${videoData.music_id || ''}', 
                    '${videoData.music_title?.replace(/'/g, "''") || ''}', '${videoData.music_author?.replace(/'/g, "''") || ''}',
                    ${videoData.file_size}, ${videoData.watermark_file_size}, '${videoData.region}', ${videoData.create_time}
                )
            `;

            const result = await executeQuery(query);
            
            if (result.insertId) {
                console.log('✅ Video created with ID:', result.insertId);
                return await Video.findById(result.insertId);
            }
            
            throw new Error('Failed to insert video');
        } catch (error) {
            console.error('Error creating video from API response:', error);
            throw error;
        }
    }

    // Find video by ID
    static async findById(id) {
        const query = 'SELECT * FROM videos WHERE id = ?';
        const videoData = await getOne(query, [id]);
        return videoData ? new Video(videoData) : null;
    }

    // Find video by aweme_id
    static async findByAwemeId(aweme_id) {
        const query = 'SELECT * FROM videos WHERE aweme_id = ?';
        const videoData = await getOne(query, [aweme_id]);
        return videoData ? new Video(videoData) : null;
    }

    // Find video by TikTok ID
    static async findByTikTokId(tiktok_id) {
        const query = 'SELECT * FROM videos WHERE tiktok_id = ?';
        const videoData = await getOne(query, [tiktok_id]);
        return videoData ? new Video(videoData) : null;
    }

    // Get all videos with pagination
    static async getAll(limit = 20, offset = 0, orderBy = 'created_at', orderDirection = 'DESC') {
        try {
            const allowedOrderBy = ['created_at', 'play_count', 'digg_count', 'download_count', 'title'];
            const allowedDirection = ['ASC', 'DESC'];
            
            const safeOrderBy = allowedOrderBy.includes(orderBy) ? orderBy : 'created_at';
            const safeDirection = allowedDirection.includes(orderDirection) ? orderDirection : 'DESC';
            
            const query = `
                SELECT * FROM videos 
                ORDER BY ${safeOrderBy} ${safeDirection} 
                LIMIT ? OFFSET ?
            `;
            
            const videos = await executeQuery(query, [parseInt(limit), parseInt(offset)]);
            return videos.map(videoData => new Video(videoData));
        } catch (error) {
            console.error('Error getting all videos:', error);
            return [];
        }
    }

    // Search videos
    static async search(searchTerm, limit = 20, offset = 0) {
        try {
            const query = `
                SELECT * FROM videos 
                WHERE title LIKE ? OR author_name LIKE ? OR music_title LIKE ?
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?
            `;
            
            const searchPattern = `%${searchTerm}%`;
            const videos = await executeQuery(query, [
                searchPattern, 
                searchPattern, 
                searchPattern, 
                parseInt(limit), 
                parseInt(offset)
            ]);
            return videos.map(videoData => new Video(videoData));
        } catch (error) {
            console.error('Error searching videos:', error);
            return [];
        }
    }

    // Count total videos
    static async count() {
        try {
            const query = 'SELECT COUNT(*) as total FROM videos';
            const result = await getOne(query);
            return result ? result.total : 0;
        } catch (error) {
            console.error('Error counting videos:', error);
            return 0;
        }
    }

    // Update video
    async update(updateData) {
        try {
            const allowedFields = [
                'title', 'cover_url', 'video_url', 'watermark_video_url', 'duration',
                'play_count', 'digg_count', 'comment_count', 'share_count', 'download_count',
                'collect_count', 'author_name', 'author_avatar', 'music_title', 'music_author',
                'file_size', 'watermark_file_size'
            ];
            
            const updates = [];
            const values = [];

            for (const [key, value] of Object.entries(updateData)) {
                if (allowedFields.includes(key) && value !== undefined) {
                    updates.push(`${key} = ?`);
                    values.push(value);
                }
            }

            if (updates.length === 0) {
                return false;
            }

            values.push(this.id);
            const query = `UPDATE videos SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
            
            const result = await executeQuery(query, values);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating video:', error);
            throw error;
        }
    }

    // Get video download history
    async getDownloadHistory(limit = 10) {
        const query = `
            SELECT dh.*, u.username 
            FROM download_history dh
            JOIN users u ON dh.user_id = u.id
            WHERE dh.video_id = ?
            ORDER BY dh.downloaded_at DESC
            LIMIT ?
        `;
        return await executeQuery(query, [this.id, limit]);
    }

    // Get popular videos
    static async getPopular(limit = 10) {
        try {
            const query = `
                SELECT * FROM videos 
                ORDER BY (play_count + digg_count + share_count) DESC 
                LIMIT ?
            `;
            const videos = await executeQuery(query, [parseInt(limit)]);
            return videos.map(videoData => new Video(videoData));
        } catch (error) {
            console.error('Error getting popular videos:', error);
            return [];
        }
    }

    // Get recent videos
    static async getRecent(limit = 10) {
        try {
            const query = `
                SELECT * FROM videos 
                ORDER BY created_at DESC 
                LIMIT ?
            `;
            const videos = await executeQuery(query, [parseInt(limit)]);
            return videos.map(videoData => new Video(videoData));
        } catch (error) {
            console.error('Error getting recent videos:', error);
            return [];
        }
    }

    // Format duration in human readable format
    getFormattedDuration() {
        if (!this.duration) return '00:00';
        
        const minutes = Math.floor(this.duration / 60);
        const seconds = this.duration % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Format numbers in human readable format (K, M, B)
    static formatCount(count) {
        if (!count) return '0';
        
        if (count >= 1000000000) {
            return (count / 1000000000).toFixed(1) + 'B';
        }
        if (count >= 1000000) {
            return (count / 1000000).toFixed(1) + 'M';
        }
        if (count >= 1000) {
            return (count / 1000).toFixed(1) + 'K';
        }
        return count.toString();
    }

    // Get formatted counts
    getFormattedCounts() {
        return {
            play_count: Video.formatCount(this.play_count),
            digg_count: Video.formatCount(this.digg_count),
            comment_count: Video.formatCount(this.comment_count),
            share_count: Video.formatCount(this.share_count),
            download_count: Video.formatCount(this.download_count),
            collect_count: Video.formatCount(this.collect_count)
        };
    }

    // Delete video
    async delete() {
        const query = 'DELETE FROM videos WHERE id = ?';
        const result = await executeQuery(query, [this.id]);
        return result.affectedRows > 0;
    }
}

module.exports = Video;