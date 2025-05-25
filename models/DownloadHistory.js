const { executeQuery, getOne } = require('../config/database');

class DownloadHistory {
    constructor(data = {}) {
        this.id = data.id;
        this.user_id = data.user_id;
        this.video_id = data.video_id;
        this.download_type = data.download_type || 'single';
        this.batch_id = data.batch_id;
        this.status = data.status || 'pending';
        this.error_message = data.error_message;
        this.downloaded_at = data.downloaded_at;
    }

    // Create new download record
    static async create(downloadData) {
        try {
            const { user_id, video_id, download_type = 'single', batch_id = null, status = 'completed' } = downloadData;
            
            const query = `
                INSERT INTO download_history (user_id, video_id, download_type, batch_id, status) 
                VALUES (?, ?, ?, ?, ?)
            `;
            
            const result = await executeQuery(query, [user_id, video_id, download_type, batch_id, status]);
            
            if (result.insertId) {
                return await DownloadHistory.findById(result.insertId);
            }
            
            return null;
        } catch (error) {
            console.error('Error creating download history:', error);
            throw error;
        }
    }

    // Find download by ID
    static async findById(id) {
        const query = 'SELECT * FROM download_history WHERE id = ?';
        const data = await getOne(query, [id]);
        return data ? new DownloadHistory(data) : null;
    }

    // Get user download history
    static async getUserHistory(userId, limit = 20, offset = 0) {
        const query = `
            SELECT 
                dh.*,
                v.title, v.cover_url, v.author_name, v.duration,
                v.play_count, v.digg_count, v.comment_count, v.share_count, v.download_count
            FROM download_history dh
            JOIN videos v ON dh.video_id = v.id
            WHERE dh.user_id = ?
            ORDER BY dh.downloaded_at DESC
            LIMIT ? OFFSET ?
        `;
        
        const history = await executeQuery(query, [userId, limit, offset]);
        return history.map(data => new DownloadHistory(data));
    }

    // Get download count by user
    static async getUserDownloadCount(userId) {
        const query = 'SELECT COUNT(*) as total FROM download_history WHERE user_id = ?';
        const result = await getOne(query, [userId]);
        return result ? result.total : 0;
    }

    // Update download status
    async updateStatus(status, errorMessage = null) {
        try {
            const query = `
                UPDATE download_history 
                SET status = ?, error_message = ?, downloaded_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `;
            
            const result = await executeQuery(query, [status, errorMessage, this.id]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating download status:', error);
            throw error;
        }
    }

    // Get bulk download results
    static async getBulkResults(batchId) {
        const query = `
            SELECT 
                dh.*,
                v.title, v.cover_url, v.video_url, v.watermark_video_url,
                v.duration, v.play_count, v.digg_count, v.comment_count,
                v.share_count, v.download_count, v.author_name, v.author_avatar
            FROM download_history dh
            JOIN videos v ON dh.video_id = v.id
            WHERE dh.batch_id = ? AND dh.status = 'completed'
            ORDER BY dh.downloaded_at ASC
        `;
        
        return await executeQuery(query, [batchId]);
    }

    // Delete download record
    async delete() {
        const query = 'DELETE FROM download_history WHERE id = ?';
        const result = await executeQuery(query, [this.id]);
        return result.affectedRows > 0;
    }
}

module.exports = DownloadHistory;