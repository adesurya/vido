const User = require('../models/User');
const Video = require('../models/Video');
const tiktokService = require('../services/tiktokService');

// Helper function to format duration
function formatDuration(seconds) {
    if (!seconds || seconds === 0) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

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
            
            // Get recent downloads with proper JOIN and error handling
            let recentDownloads = [];
            try {
                const { executeQuery } = require('../config/database');
                
                recentDownloads = await executeQuery(`
                    SELECT 
                        dh.id as download_id,
                        dh.download_type, 
                        dh.downloaded_at, 
                        dh.status,
                        dh.batch_id,
                        v.id as video_id,
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
                    WHERE dh.user_id = ? AND dh.status = 'completed'
                    ORDER BY dh.downloaded_at DESC
                    LIMIT 6
                `, [userId]);
                
                console.log(`Found ${recentDownloads.length} recent downloads for user ${userId}`);
                
            } catch (error) {
                console.error('Error getting recent downloads:', error);
                recentDownloads = [];
            }

            // Get popular videos from database
            let popularVideos = [];
            try {
                popularVideos = await Video.getPopular(5);
                console.log(`Found ${popularVideos.length} popular videos`);
            } catch (error) {
                console.error('Error getting popular videos:', error);
                popularVideos = [];
            }

            res.render('dashboard/index', {
                title: 'Dashboard - TikTok Downloader Pro',
                layout: 'main',
                stats: userStats,
                recentDownloads: recentDownloads.map(download => ({
                    ...download,
                    formattedDuration: formatDuration(download.duration || 0),
                    formattedCounts: {
                        play_count: Video.formatCount(download.play_count || 0),
                        digg_count: Video.formatCount(download.digg_count || 0),
                        comment_count: Video.formatCount(download.comment_count || 0),
                        share_count: Video.formatCount(download.share_count || 0),
                        download_count: Video.formatCount(download.download_count || 0)
                    }
                })),
                popularVideos: popularVideos.map(video => ({
                    id: video.id,
                    title: video.title,
                    cover_url: video.cover_url,
                    author_name: video.author_name,
                    duration: video.duration,
                    play_count: video.play_count,
                    digg_count: video.digg_count,
                    comment_count: video.comment_count,
                    share_count: video.share_count,
                    download_count: video.download_count,
                    created_at: video.created_at,
                    formattedCounts: video.getFormattedCounts(),
                    formattedDuration: video.getFormattedDuration()
                })),
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

    // Get video details for modal
    async getVideoDetails(req, res) {
        try {
            const { id } = req.params;
            const userId = req.session.userId;
            
            // Get video with download history
            const { executeQuery, getOne } = require('../config/database');
            
            const video = await getOne(`
                SELECT 
                    v.*,
                    dh.download_type,
                    dh.downloaded_at,
                    dh.batch_id
                FROM videos v
                INNER JOIN download_history dh ON v.id = dh.video_id
                WHERE v.id = ? AND dh.user_id = ?
                ORDER BY dh.downloaded_at DESC
                LIMIT 1
            `, [id, userId]);
            
            if (!video) {
                return res.status(404).json({
                    success: false,
                    message: 'Video not found or not accessible'
                });
            }

            res.json({
                success: true,
                data: {
                    id: video.id,
                    title: video.title,
                    thumbnail: video.cover_url,
                    duration: formatDuration(video.duration),
                    author: {
                        id: video.author_id,
                        name: video.author_name,
                        avatar: video.author_avatar
                    },
                    music: {
                        id: video.music_id,
                        title: video.music_title,
                        author: video.music_author
                    },
                    stats: {
                        play_count: Video.formatCount(video.play_count),
                        digg_count: Video.formatCount(video.digg_count),
                        comment_count: Video.formatCount(video.comment_count),
                        share_count: Video.formatCount(video.share_count),
                        download_count: Video.formatCount(video.download_count)
                    },
                    downloadUrls: {
                        hd: video.video_url,
                        watermark: video.watermark_video_url
                    },
                    downloadInfo: {
                        type: video.download_type,
                        downloadedAt: video.downloaded_at,
                        batchId: video.batch_id
                    },
                    createdAt: video.created_at
                }
            });

        } catch (error) {
            console.error('Get video details error:', error.message);
            
            res.status(500).json({
                success: false,
                message: 'Failed to get video details'
            });
        }
    }

    // Show admin panel
    async showAdmin(req, res) {
        try {
            if (!req.user || !req.user.isAdmin()) {
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
                    id: video.id,
                    title: video.title,
                    cover_url: video.cover_url,
                    author_name: video.author_name,
                    duration: video.duration,
                    play_count: video.play_count,
                    digg_count: video.digg_count,
                    comment_count: video.comment_count,
                    share_count: video.share_count,
                    download_count: video.download_count,
                    created_at: video.created_at,
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
                    v.id as video_id,
                    v.title,
                    v.cover_url,
                    v.author_name,
                    v.duration,
                    v.video_url,
                    v.watermark_video_url,
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
                data: activities.map(activity => ({
                    ...activity,
                    formattedDuration: formatDuration(activity.duration)
                }))
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
            if (!req.user || !req.user.isAdmin()) {
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

    
// Show download history page (ADD THIS METHOD TO DashboardController class)
    async showHistory(req, res) {
        try {
            res.render('dashboard/history', {
                title: 'Download History - TikTok Downloader Pro',
                layout: 'main',
                messages: req.flash()
            });
        } catch (error) {
            console.error('Show history page error:', error);
            res.status(500).render('error', { 
                message: 'Failed to load history page',
                layout: 'main' 
            });
        }
    }
}

module.exports = new DashboardController();