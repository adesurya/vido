const User = require('../models/User');
const Video = require('../models/Video');
const tiktokService = require('../services/tiktokService');

class DashboardController {
    // Show main dashboard
    async showDashboard(req, res) {
        try {
            const userId = req.session.userId;
            
            // Get user statistics (with error handling)
            let userStats;
            try {
                userStats = await tiktokService.getDownloadStats(userId);
            } catch (error) {
                console.error('Error getting user stats:', error);
                userStats = {
                    total_downloads: 0,
                    successful_downloads: 0,
                    failed_downloads: 0,
                    bulk_downloads: 0,
                    single_downloads: 0,
                    recent_downloads: 0,
                    success_rate: 0
                };
            }
            
            // Get recent downloads (with error handling) - Only if videos exist
            let recentDownloads = [];
            try {
                const { executeQuery } = require('../config/database');
                // First check if we have any download history
                const historyCount = await executeQuery('SELECT COUNT(*) as count FROM download_history WHERE user_id = ?', [userId]);
                
                if (historyCount[0]?.count > 0) {
                    recentDownloads = await executeQuery(`
                        SELECT 
                            dh.download_type, dh.downloaded_at, dh.status,
                            COALESCE(v.title, 'Unknown Video') as title,
                            COALESCE(v.cover_url, 'https://via.placeholder.com/60x60/6366f1/ffffff?text=Video') as cover_url,
                            COALESCE(v.author_name, 'Unknown Author') as author_name,
                            COALESCE(v.duration, 0) as duration
                        FROM download_history dh
                        LEFT JOIN videos v ON dh.video_id = v.id
                        WHERE dh.user_id = ? AND dh.status = 'completed'
                        ORDER BY dh.downloaded_at DESC
                        LIMIT 5
                    `, [userId]);
                }
            } catch (error) {
                console.error('Error getting recent downloads:', error);
                recentDownloads = [];
            }

            // Skip popular videos for now to avoid the MySQL error
            const popularVideos = [];

            res.render('dashboard/index', {
                title: 'Dashboard - TikTok Downloader Pro',
                layout: 'main',
                stats: userStats,
                recentDownloads: recentDownloads.map(download => ({
                    ...download,
                    formattedDuration: this.formatDuration(download.duration || 0)
                })),
                popularVideos: popularVideos,
                messages: req.flash()
            });

        } catch (error) {
            console.error('Show dashboard error:', error);
            req.flash('error', 'Failed to load dashboard');
            res.render('dashboard/index', {
                title: 'Dashboard - TikTok Downloader Pro',
                layout: 'main',
                stats: { 
                    total_downloads: 0, 
                    successful_downloads: 0, 
                    failed_downloads: 0,
                    bulk_downloads: 0,
                    single_downloads: 0,
                    recent_downloads: 0,
                    success_rate: 0
                },
                recentDownloads: [],
                popularVideos: [],
                messages: req.flash()
            });
        }
    }

    // Helper method to format duration
    formatDuration(seconds) {
        if (!seconds || seconds === 0) return '00:00';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    // Show download page
    async showDownload(req, res) {
        try {
            res.render('dashboard/download', {
                title: 'Download Videos - TikTok Downloader Pro',
                layout: 'main',
                messages: req.flash()
            });
        } catch (error) {
            console.error('Show download page error:', error);
            res.status(500).render('error', { 
                message: 'Failed to load download page',
                layout: 'main' 
            });
        }
    }

    // Show admin panel
    async showAdmin(req, res) {
        try {
            if (!req.user.isAdmin()) {
                req.flash('error', 'Access denied');
                return res.redirect('/dashboard');
            }

            // Get system statistics
            const systemStats = await this.getSystemStats();
            
            // Get recent users
            const recentUsers = await User.getAll(10, 0);
            
            // Get recent videos
            const recentVideos = await Video.getRecent(10);

            res.render('dashboard/admin', {
                title: 'Admin Panel - TikTok Downloader Pro',
                layout: 'main',
                systemStats,
                recentUsers,
                recentVideos: recentVideos.map(video => ({
                    ...video,
                    formattedCounts: video.getFormattedCounts(),
                    formattedDuration: video.getFormattedDuration()
                })),
                messages: req.flash()
            });

        } catch (error) {
            console.error('Show admin panel error:', error);
            req.flash('error', 'Failed to load admin panel');
            res.redirect('/dashboard');
        }
    }

    // Get system statistics for admin
    async getSystemStats() {
        try {
            const { getOne } = require('../config/database');

            // Get user statistics
            const userStats = await getOne(`
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as new_users_today,
                    COUNT(CASE WHEN created_at > DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as new_users_week
                FROM users 
                WHERE is_active = true
            `);

            // Get video statistics
            const videoStats = await getOne(`
                SELECT 
                    COUNT(*) as total_videos,
                    COUNT(CASE WHEN created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as videos_today,
                    SUM(play_count) as total_views,
                    AVG(duration) as avg_duration
                FROM videos
            `);

            // Get download statistics
            const downloadStats = await tiktokService.getDownloadStats();

            // Get bulk session statistics
            const bulkStats = await getOne(`
                SELECT 
                    COUNT(*) as total_bulk_sessions,
                    COUNT(CASE WHEN status = 'processing' THEN 1 END) as active_sessions,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
                    COUNT(CASE WHEN created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as sessions_today
                FROM bulk_sessions
            `);

            return {
                users: userStats || { total_users: 0, new_users_today: 0, new_users_week: 0 },
                videos: videoStats || { total_videos: 0, videos_today: 0, total_views: 0, avg_duration: 0 },
                downloads: downloadStats,
                bulkSessions: bulkStats || { total_bulk_sessions: 0, active_sessions: 0, completed_sessions: 0, sessions_today: 0 }
            };

        } catch (error) {
            console.error('Get system stats error:', error);
            return {
                users: { total_users: 0, new_users_today: 0, new_users_week: 0 },
                videos: { total_videos: 0, videos_today: 0, total_views: 0, avg_duration: 0 },
                downloads: { total_downloads: 0, successful_downloads: 0, failed_downloads: 0 },
                bulkSessions: { total_bulk_sessions: 0, active_sessions: 0, completed_sessions: 0, sessions_today: 0 }
            };
        }
    }

    // Get dashboard stats API
    async getStats(req, res) {
        try {
            const userId = req.session.userId;
            const stats = await tiktokService.getDownloadStats(userId);

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            console.error('Get dashboard stats error:', error);
            
            res.status(500).json({
                success: false,
                message: 'Failed to get statistics'
            });
        }
    }

    // Get recent activity
    async getRecentActivity(req, res) {
        try {
            const userId = req.session.userId;
            const limit = parseInt(req.query.limit) || 10;

            const { executeQuery } = require('../config/database');
            
            const activities = await executeQuery(`
                SELECT 
                    'download' as type,
                    v.title,
                    v.cover_url,
                    v.author_name,
                    dh.download_type,
                    dh.status,
                    dh.downloaded_at as created_at
                FROM download_history dh
                JOIN videos v ON dh.video_id = v.id
                WHERE dh.user_id = ?
                ORDER BY dh.downloaded_at DESC
                LIMIT ?
            `, [userId, limit]);

            res.json({
                success: true,
                data: activities
            });

        } catch (error) {
            console.error('Get recent activity error:', error);
            
            res.status(500).json({
                success: false,
                message: 'Failed to get recent activity'
            });
        }
    }

    // Search videos
    async searchVideos(req, res) {
        try {
            const { q: searchTerm, page = 1, limit = 20 } = req.query;
            
            if (!searchTerm || searchTerm.trim().length < 2) {
                return res.status(400).json({
                    success: false,
                    message: 'Search term must be at least 2 characters long'
                });
            }

            const offset = (parseInt(page) - 1) * parseInt(limit);
            const videos = await Video.search(searchTerm.trim(), parseInt(limit), offset);

            const formattedVideos = videos.map(video => ({
                id: video.id,
                title: video.title,
                thumbnail: video.cover_url,
                duration: video.getFormattedDuration(),
                author: {
                    name: video.author_name,
                    avatar: video.author_avatar
                },
                stats: video.getFormattedCounts(),
                createdAt: video.created_at
            }));

            res.json({
                success: true,
                data: {
                    videos: formattedVideos,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        hasMore: videos.length === parseInt(limit)
                    }
                }
            });

        } catch (error) {
            console.error('Search videos error:', error);
            
            res.status(500).json({
                success: false,
                message: 'Failed to search videos'
            });
        }
    }

    // Get admin system info
    async getSystemInfo(req, res) {
        try {
            if (!req.user.isAdmin()) {
                return res.status(403).json({
                    success: false,
                    message: 'Admin access required'
                });
            }

            const systemStats = await this.getSystemStats();

            res.json({
                success: true,
                data: systemStats
            });

        } catch (error) {
            console.error('Get system info error:', error);
            
            res.status(500).json({
                success: false,
                message: 'Failed to get system information'
            });
        }
    }
}

module.exports = new DashboardController();