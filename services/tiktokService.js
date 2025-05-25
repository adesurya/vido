const axios = require('axios');
const Video = require('../models/Video');

class TikTokService {
    constructor() {
        this.apiKey = process.env.RAPIDAPI_KEY;
        this.apiHost = process.env.RAPIDAPI_HOST || 'tiktok-download-without-watermark.p.rapidapi.com';
        this.baseUrl = process.env.TIKTOK_API_BASE_URL || 'https://tiktok-download-without-watermark.p.rapidapi.com';
        this.timeout = parseInt(process.env.DOWNLOAD_TIMEOUT) || 30000;
        
        // Check if API is configured - all three are required
        this.isConfigured = !!(this.apiKey && this.apiHost && this.baseUrl && 
                             this.apiKey.length > 10);
        
        console.log('🔧 TikTok Service Configuration:', {
            hasApiKey: !!this.apiKey,
            apiKeyLength: this.apiKey ? this.apiKey.length : 0,
            hasApiHost: !!this.apiHost,
            apiHost: this.apiHost,
            hasBaseUrl: !!this.baseUrl,
            baseUrl: this.baseUrl,
            isConfigured: this.isConfigured
        });
        
        if (!this.isConfigured) {
            console.warn('⚠️  TikTok API not properly configured - running in demo mode');
        } else {
            console.log('✅ TikTok API configured - real downloads enabled');
            
            this.axiosInstance = axios.create({
                baseURL: this.baseUrl,
                timeout: this.timeout,
                headers: {
                    'x-rapidapi-host': this.apiHost,
                    'x-rapidapi-key': this.apiKey,
                    'User-Agent': 'TikTokDownloader/1.0'
                }
            });
        }
    }

    // Check if service is properly configured
    isServiceConfigured() {
        return this.isConfigured;
    }

    // Extract TikTok URL from various formats
    extractTikTokUrl(input) {
        const cleanInput = input.trim();
        
        // Remove any tracking parameters and clean the URL
        const patterns = [
            /https?:\/\/(?:www\.)?tiktok\.com\/@[\w.-]+\/video\/(\d+)/,
            /https?:\/\/(?:www\.)?tiktok\.com\/t\/(\w+)/,
            /https?:\/\/vm\.tiktok\.com\/(\w+)/
        ];

        for (const pattern of patterns) {
            const match = cleanInput.match(pattern);
            if (match) {
                // Return the original URL for standard tiktok.com URLs
                if (pattern.test(cleanInput) && cleanInput.includes('tiktok.com/@')) {
                    return cleanInput.split('?')[0]; // Remove query parameters
                }
                return cleanInput;
            }
        }

        // If it's just a video ID, construct the URL
        if (/^\d{19}$/.test(cleanInput)) {
            return `https://www.tiktok.com/@unknown/video/${cleanInput}`;
        }

        throw new Error('Invalid TikTok URL format');
    }

    // Extract video ID from URL
    extractVideoIdFromUrl(url) {
        const match = url.match(/\/video\/(\d+)/);
        return match ? match[1] : null;
    }

    // Generate demo video data for testing
    getDemoVideoData(url) {
        const videoId = this.extractVideoIdFromUrl(url) || Date.now().toString();
        const timestamp = Math.floor(Date.now() / 1000);
        
        const usernameMatch = url.match(/@([\w.-]+)\//);
        const username = usernameMatch ? usernameMatch[1] : 'demo_user';
        
        return {
            aweme_id: `demo_v14044g50000cvl3b5vog65qhtpvjft0_${videoId}`,
            id: videoId,
            region: "US",
            title: `Demo Video from @${username} - Configure API Key for Real Downloads 🎬`,
            cover: "https://via.placeholder.com/300x400/6366f1/ffffff?text=Demo+Video",
            ai_dynamic_cover: "https://via.placeholder.com/300x400/6366f1/ffffff?text=Demo+AI+Cover",
            origin_cover: "https://via.placeholder.com/300x360/6366f1/ffffff?text=Demo+Origin",
            duration: 15,
            play: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            wmplay: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            size: 2018260,
            wm_size: 1726709,
            music: "https://www.soundjay.com/misc/sounds/beep-07a.mp3",
            music_info: {
                id: "7461846526144710657",
                title: "Demo Background Music",
                play: "https://www.soundjay.com/misc/sounds/beep-07a.mp3",
                cover: "https://via.placeholder.com/720x720/6366f1/ffffff?text=Music",
                author: "Demo Artist",
                original: false,
                duration: 30,
                album: "Demo Album Collection"
            },
            play_count: 1000000,
            digg_count: 50000,
            comment_count: 1500,
            share_count: 2500,
            download_count: 500,
            collect_count: 8000,
            create_time: timestamp,
            anchors: null,
            anchors_extras: "",
            is_ad: false,
            commerce_info: {
                adv_promotable: false,
                auction_ad_invited: false,
                branded_content_type: 0,
                organic_log_extra: `{"req_id":"demo_${timestamp}"}`,
                with_comment_filter_words: false
            },
            commercial_video_info: "",
            item_comment_settings: 0,
            mentioned_users: "",
            author: {
                id: "demo_author_123",
                unique_id: username,
                nickname: `Demo Creator (@${username})`,
                avatar: "https://via.placeholder.com/300x300/6366f1/ffffff?text=Demo+User"
            }
        };
    }

    // Get video info from TikTok API (with demo mode fallback)
    async getVideoInfo(url, hdQuality = true) {
        try {
            const cleanUrl = this.extractTikTokUrl(url);
            
            // If API not configured, return demo data
            if (!this.isConfigured) {
                console.log('🎭 Returning demo data - API not configured');
                return this.getDemoVideoData(cleanUrl);
            }
            
            // Properly encode the URL for the API request
            const encodedUrl = encodeURIComponent(cleanUrl);
            const hdParam = hdQuality ? '1080' : '720';
            
            console.log('🔗 Making API request to:', `${this.baseUrl}/analysis`);
            console.log('📋 Request params:', { 
                url: cleanUrl, 
                encodedUrl: encodedUrl,
                hd: hdParam 
            });
            
            const response = await this.axiosInstance.get('/analysis', {
                params: {
                    url: cleanUrl,
                    hd: hdParam
                }
            });

            console.log('📥 API Response received:', {
                status: response.status,
                code: response.data?.code,
                msg: response.data?.msg,
                hasData: !!response.data?.data
            });

            if (response.data.code !== 0) {
                console.error('❌ API Error Response:', response.data);
                throw new Error(response.data.msg || 'Failed to fetch video info');
            }

            return response.data.data;
        } catch (error) {
            console.error('TikTok API Error Details:', {
                message: error.message,
                code: error.code,
                response: error.response?.data,
                status: error.response?.status,
                url: url
            });
            
            // If API fails, return demo data as fallback
            if (!this.isConfigured || error.code === 'ECONNABORTED' || error.response?.status >= 500) {
                console.log('🔄 Falling back to demo mode due to:', error.code || error.response?.status);
                return this.getDemoVideoData(url);
            }
            
            if (error.response) {
                const status = error.response.status;
                const message = error.response.data?.message || error.response.data?.msg || error.message;
                
                console.log('🚨 API Error Response:', { status, message, data: error.response.data });
                
                switch (status) {
                    case 400:
                        throw new Error('Invalid URL format or parameters');
                    case 404:
                        throw new Error('Video not found or has been deleted');
                    case 403:
                        throw new Error('Video is private or restricted');
                    case 429:
                        throw new Error('API rate limit exceeded. Please try again later');
                    case 500:
                        console.log('🔄 API server error, falling back to demo mode');
                        return this.getDemoVideoData(url);
                    default:
                        throw new Error(`API Error (${status}): ${message}`);
                }
            }

            if (error.code === 'ECONNABORTED') {
                throw new Error('Request timeout. Please try again');
            }

            if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                console.log('🔄 Connection error, falling back to demo mode');
                return this.getDemoVideoData(url);
            }

            throw new Error(`Network error: ${error.message}`);
        }
    }

    // Download single video
    async downloadVideo(url, userId) {
        try {
            console.log('📥 Download request for URL:', url, 'User:', userId);
            
            // Get video info using the provided URL
            const videoInfo = await this.getVideoInfo(url);
            console.log('📊 Video info retrieved:', videoInfo.title);
            
            // Save/update video in database
            const video = await Video.createFromApiResponse(videoInfo);
            
            if (!video) {
                throw new Error('Failed to save video information');
            }

            console.log('💾 Video saved to database with ID:', video.id);

            // Record download history
            await this.recordDownload(userId, video.id, 'single');

            return {
                success: true,
                video: video,
                downloadUrls: {
                    hd: videoInfo.play,
                    watermark: videoInfo.wmplay
                }
            };
        } catch (error) {
            console.error('Download video error:', error.message);
            throw error;
        }
    }

    // Record download in history
    async recordDownload(userId, videoId, downloadType = 'single', batchId = null) {
        try {
            const DownloadHistory = require('../models/DownloadHistory');
            await DownloadHistory.create({
                user_id: userId,
                video_id: videoId,
                download_type: downloadType,
                batch_id: batchId,
                status: 'completed'
            });
            console.log('📝 Download recorded in history');
        } catch (error) {
            console.error('Error recording download:', error);
        }
    }

    // Process bulk download
    async processBulkDownload(urls, userId, batchId) {
        const results = {
            successful: [],
            failed: [],
            total: urls.length,
            batchId: batchId
        };

        // Update bulk session status
        await this.updateBulkSession(batchId, {
            status: 'processing',
            total_videos: urls.length
        });

        for (let i = 0; i < urls.length; i++) {
            try {
                // Add delay between requests (rate limiting)
                if (i > 0) {
                    await this.delay(parseInt(process.env.BULK_PROCESSING_DELAY) || 500);
                }

                const url = urls[i].trim();
                if (!url) continue;

                const result = await this.downloadVideo(url, userId);
                
                // Record bulk download
                await this.recordDownload(userId, result.video.id, 'bulk', batchId);
                
                results.successful.push({
                    url: url,
                    video: result.video,
                    downloadUrls: result.downloadUrls
                });

                // Update progress
                await this.updateBulkSession(batchId, {
                    processed_videos: i + 1,
                    successful_downloads: results.successful.length
                });

            } catch (error) {
                console.error(`Bulk download error for URL ${urls[i]}:`, error.message);
                
                results.failed.push({
                    url: urls[i],
                    error: error.message
                });

                // Update failed count
                await this.updateBulkSession(batchId, {
                    processed_videos: i + 1,
                    failed_downloads: results.failed.length
                });
            }
        }

        // Mark bulk session as completed
        await this.updateBulkSession(batchId, {
            status: 'completed',
            completed_at: new Date()
        });

        return results;
    }

    // Create bulk session
    async createBulkSession(userId, totalVideos) {
        try {
            const { executeQuery } = require('../config/database');
            const { v4: uuidv4 } = require('uuid');
            
            const batchId = uuidv4();
            
            const query = `INSERT INTO bulk_sessions (batch_id, user_id, total_videos, status) VALUES ('${batchId}', ${userId}, ${totalVideos}, 'pending')`;
            
            await executeQuery(query);
            return batchId;
        } catch (error) {
            console.error('Error creating bulk session:', error);
            throw error;
        }
    }

    // Update bulk session
    async updateBulkSession(batchId, updateData) {
        try {
            const { executeQuery } = require('../config/database');
            
            const updates = [];
            for (const [key, value] of Object.entries(updateData)) {
                if (value !== undefined) {
                    if (typeof value === 'string') {
                        updates.push(`${key} = '${value}'`);
                    } else {
                        updates.push(`${key} = ${value}`);
                    }
                }
            }

            if (updates.length === 0) return;

            const query = `UPDATE bulk_sessions SET ${updates.join(', ')} WHERE batch_id = '${batchId}'`;
            await executeQuery(query);
        } catch (error) {
            console.error('Error updating bulk session:', error);
        }
    }

    // Get bulk session status
    async getBulkSessionStatus(batchId) {
        try {
            const { getOne } = require('../config/database');
            
            const session = await getOne(
                `SELECT * FROM bulk_sessions WHERE batch_id = '${batchId}'`
            );

            if (!session) {
                throw new Error('Bulk session not found');
            }

            return {
                batchId: session.batch_id,
                status: session.status,
                totalVideos: session.total_videos,
                processedVideos: session.processed_videos,
                successfulDownloads: session.successful_downloads,
                failedDownloads: session.failed_downloads,
                progress: session.total_videos > 0 ? 
                    Math.round((session.processed_videos / session.total_videos) * 100) : 0,
                createdAt: session.created_at,
                completedAt: session.completed_at
            };
        } catch (error) {
            console.error('Error getting bulk session status:', error);
            throw error;
        }
    }

    // Parse CSV content for bulk download
    parseBulkUrls(csvContent) {
        const lines = csvContent.split('\n');
        const urls = [];

        for (let i = 1; i < lines.length; i++) { // Skip header
            const line = lines[i].trim();
            if (line) {
                const columns = line.split(',');
                if (columns.length > 0) {
                    const url = columns[0].replace(/"/g, '').trim();
                    if (url && url !== 'url') {
                        urls.push(url);
                    }
                }
            }
        }

        return urls;
    }

    // Validate TikTok URL
    isValidTikTokUrl(url) {
        try {
            this.extractTikTokUrl(url);
            return true;
        } catch {
            return false;
        }
    }

    // Delay helper for rate limiting
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Get download statistics
    async getDownloadStats(userId = null) {
        try {
            const { getOne } = require('../config/database');
            
            let query, recentQuery;
            
            if (userId) {
                query = `
                    SELECT 
                        COUNT(*) as total_downloads,
                        COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_downloads,
                        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_downloads,
                        COUNT(CASE WHEN download_type = 'bulk' THEN 1 END) as bulk_downloads,
                        COUNT(CASE WHEN download_type = 'single' THEN 1 END) as single_downloads
                    FROM download_history 
                    WHERE user_id = ${userId}
                `;
                recentQuery = `SELECT COUNT(*) as recent_downloads FROM download_history WHERE user_id = ${userId} AND downloaded_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)`;
            } else {
                query = `
                    SELECT 
                        COUNT(*) as total_downloads,
                        COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_downloads,
                        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_downloads,
                        COUNT(CASE WHEN download_type = 'bulk' THEN 1 END) as bulk_downloads,
                        COUNT(CASE WHEN download_type = 'single' THEN 1 END) as single_downloads
                    FROM download_history
                `;
                recentQuery = `SELECT COUNT(*) as recent_downloads FROM download_history WHERE downloaded_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)`;
            }

            const stats = await getOne(query);
            const recentStats = await getOne(recentQuery);

            return {
                total_downloads: stats?.total_downloads || 0,
                successful_downloads: stats?.successful_downloads || 0,
                failed_downloads: stats?.failed_downloads || 0,
                bulk_downloads: stats?.bulk_downloads || 0,
                single_downloads: stats?.single_downloads || 0,
                recent_downloads: recentStats?.recent_downloads || 0,
                success_rate: stats?.total_downloads > 0 
                    ? Math.round((stats.successful_downloads / stats.total_downloads) * 100) 
                    : 0
            };
        } catch (error) {
            console.error('Error getting download stats:', error);
            return {
                total_downloads: 0,
                successful_downloads: 0,
                failed_downloads: 0,
                bulk_downloads: 0,
                single_downloads: 0,
                recent_downloads: 0,
                success_rate: 0
            };
        }
    }
}

module.exports = new TikTokService();