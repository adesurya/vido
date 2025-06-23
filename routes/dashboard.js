const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/auth');
const { requireAuth, requireAdmin, loadUser } = authMiddleware;

const router = express.Router();

// Apply middleware to all dashboard routes
router.use(loadUser);
router.use(requireAuth);

// Main dashboard
router.get('/', dashboardController.showDashboard);

// Download page
router.get('/download', dashboardController.showDownload);

// History page (NEW)
router.get('/history', dashboardController.showHistory);

// Dashboard API endpoints
router.get('/api/stats', dashboardController.getStats);
router.get('/api/activity', dashboardController.getRecentActivity);
router.get('/api/search', dashboardController.searchVideos);
router.get('/api/video/:id', dashboardController.getVideoDetails);

// Admin routes
router.get('/admin', requireAdmin, dashboardController.showAdmin);
router.get('/api/admin/system', requireAdmin, dashboardController.getSystemInfo);

// User management routes (admin only)
router.get('/admin/users', requireAdmin, async (req, res) => {
    try {
        const User = require('../models/User');
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const users = await User.getAll(limit, offset);
        const totalUsers = await User.count();

        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.json({
                success: true,
                data: {
                    users: users.map(user => user.toJSON()),
                    pagination: {
                        page: page,
                        limit: limit,
                        total: totalUsers,
                        pages: Math.ceil(totalUsers / limit)
                    }
                }
            });
        }

        res.render('dashboard/admin-users', {
            title: 'User Management - Admin Panel',
            layout: 'main',
            users: users.map(user => user.toJSON()),
            pagination: {
                page: page,
                limit: limit,
                total: totalUsers,
                pages: Math.ceil(totalUsers / limit)
            },
            messages: req.flash()
        });

    } catch (error) {
        console.error('Admin users error:', error);
        
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(500).json({
                success: false,
                message: 'Failed to load users'
            });
        }
        
        req.flash('error', 'Failed to load users');
        res.redirect('/dashboard/admin');
    }
});

// Video management routes (admin only)
router.get('/admin/videos', requireAdmin, async (req, res) => {
    try {
        const Video = require('../models/Video');
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const orderBy = req.query.sort || 'created_at';
        const orderDirection = req.query.order || 'DESC';

        const videos = await Video.getAll(limit, offset, orderBy, orderDirection);
        const totalVideos = await Video.count();

        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.json({
                success: true,
                data: {
                    videos: videos.map(video => ({
                        ...video,
                        formattedCounts: video.getFormattedCounts(),
                        formattedDuration: video.getFormattedDuration()
                    })),
                    pagination: {
                        page: page,
                        limit: limit,
                        total: totalVideos,
                        pages: Math.ceil(totalVideos / limit)
                    }
                }
            });
        }

        res.render('dashboard/admin-videos', {
            title: 'Video Management - Admin Panel',
            layout: 'main',
            videos: videos.map(video => ({
                ...video,
                formattedCounts: video.getFormattedCounts(),
                formattedDuration: video.getFormattedDuration()
            })),
            pagination: {
                page: page,
                limit: limit,
                total: totalVideos,
                pages: Math.ceil(totalVideos / limit)
            },
            messages: req.flash()
        });

    } catch (error) {
        console.error('Admin videos error:', error);
        
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(500).json({
                success: false,
                message: 'Failed to load videos'
            });
        }
        
        req.flash('error', 'Failed to load videos');
        res.redirect('/dashboard/admin');
    }
});

// Download history management (admin only)
router.get('/admin/downloads', requireAdmin, async (req, res) => {
    try {
        const { executeQuery, getOne } = require('../config/database');
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        // Get total count
        const totalResult = await getOne('SELECT COUNT(*) as total FROM download_history');
        const total = totalResult?.total || 0;

        // Get download history with user and video info
        const downloads = await executeQuery(`
            SELECT 
                dh.*,
                u.username,
                v.title as video_title,
                v.author_name
            FROM download_history dh
            JOIN users u ON dh.user_id = u.id
            JOIN videos v ON dh.video_id = v.id
            ORDER BY dh.downloaded_at DESC
            LIMIT ? OFFSET ?
        `, [limit, offset]);

        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.json({
                success: true,
                data: {
                    downloads: downloads,
                    pagination: {
                        page: page,
                        limit: limit,
                        total: total,
                        pages: Math.ceil(total / limit)
                    }
                }
            });
        }

        res.render('dashboard/admin-downloads', {
            title: 'Download History - Admin Panel',
            layout: 'main',
            downloads: downloads,
            pagination: {
                page: page,
                limit: limit,
                total: total,
                pages: Math.ceil(total / limit)
            },
            messages: req.flash()
        });

    } catch (error) {
        console.error('Admin downloads error:', error);
        
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(500).json({
                success: false,
                message: 'Failed to load download history'
            });
        }
        
        req.flash('error', 'Failed to load download history');
        res.redirect('/dashboard/admin');
    }
});

// Bulk session management (admin only)
router.get('/admin/bulk-sessions', requireAdmin, async (req, res) => {
    try {
        const { executeQuery, getOne } = require('../config/database');
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        // Get total count
        const totalResult = await getOne('SELECT COUNT(*) as total FROM bulk_sessions');
        const total = totalResult?.total || 0;

        // Get bulk sessions with user info
        const sessions = await executeQuery(`
            SELECT 
                bs.*,
                u.username
            FROM bulk_sessions bs
            JOIN users u ON bs.user_id = u.id
            ORDER BY bs.created_at DESC
            LIMIT ? OFFSET ?
        `, [limit, offset]);

        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.json({
                success: true,
                data: {
                    sessions: sessions,
                    pagination: {
                        page: page,
                        limit: limit,
                        total: total,
                        pages: Math.ceil(total / limit)
                    }
                }
            });
        }

        res.render('dashboard/admin-bulk-sessions', {
            title: 'Bulk Sessions - Admin Panel',
            layout: 'main',
            sessions: sessions,
            pagination: {
                page: page,
                limit: limit,
                total: total,
                pages: Math.ceil(total / limit)
            },
            messages: req.flash()
        });

    } catch (error) {
        console.error('Admin bulk sessions error:', error);
        
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(500).json({
                success: false,
                message: 'Failed to load bulk sessions'
            });
        }
        
        req.flash('error', 'Failed to load bulk sessions');
        res.redirect('/dashboard/admin');
    }
});

// System logs (admin only)
router.get('/admin/logs', requireAdmin, (req, res) => {
    // TODO: Implement log viewing functionality
    res.render('dashboard/admin-logs', {
        title: 'System Logs - Admin Panel',
        layout: 'main',
        logs: [],
        messages: req.flash()
    });
});

// Settings (admin only)
router.get('/admin/settings', requireAdmin, (req, res) => {
    const settings = {
        rateLimitWindow: process.env.RATE_LIMIT_WINDOW_MS || 1000,
        rateLimitMax: process.env.RATE_LIMIT_MAX_REQUESTS || 2,
        maxFileSize: process.env.MAX_FILE_SIZE || 10485760,
        maxConcurrentDownloads: process.env.MAX_CONCURRENT_DOWNLOADS || 5,
        downloadTimeout: process.env.DOWNLOAD_TIMEOUT || 30000,
        bulkProcessingDelay: process.env.BULK_PROCESSING_DELAY || 500
    };

    res.render('dashboard/admin-settings', {
        title: 'System Settings - Admin Panel',
        layout: 'main',
        settings: settings,
        messages: req.flash()
    });
});

module.exports = router;