const rateLimit = require('express-rate-limit');
const { executeQuery, getOne } = require('../config/database');

// TikTok API rate limiting (2 requests per second)
const tiktokApiLimiter = async (req, res, next) => {
    try {
        const userId = req.session?.userId || req.ip;
        const endpoint = 'tiktok_api';
        const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 1000; // 1 second
        const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 2;
        const now = new Date();
        const windowStart = new Date(now.getTime() - windowMs);

        // Clean old rate limit records
        await executeQuery(
            'DELETE FROM rate_limits WHERE window_start < ?', 
            [windowStart]
        );

        // Get current rate limit for user/endpoint
        const currentLimit = await getOne(
            'SELECT * FROM rate_limits WHERE user_id = ? AND endpoint = ? AND window_start > ?',
            [userId, endpoint, windowStart]
        );

        if (currentLimit) {
            if (currentLimit.requests_count >= maxRequests) {
                return res.status(429).json({
                    success: false,
                    message: 'Rate limit exceeded. Maximum 2 requests per second.',
                    retryAfter: Math.ceil(windowMs / 1000)
                });
            }

            // Increment request count
            await executeQuery(
                'UPDATE rate_limits SET requests_count = requests_count + 1 WHERE id = ?',
                [currentLimit.id]
            );
        } else {
            // Create new rate limit record
            await executeQuery(
                'INSERT INTO rate_limits (user_id, endpoint, requests_count, window_start) VALUES (?, ?, 1, ?)',
                [userId, endpoint, now]
            );
        }

        next();
    } catch (error) {
        console.error('Rate limiting error:', error);
        // Allow request to proceed if rate limiting fails
        next();
    }
};

// General API rate limiting
const generalApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for authenticated admin users
        return req.session?.userId && req.user && req.user.isAdmin();
    }
});

// Login attempts rate limiting
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 login requests per windowMs
    message: {
        success: false,
        message: 'Too many login attempts, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true
});

// File upload rate limiting
const uploadLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // limit each IP to 5 uploads per minute
    message: {
        success: false,
        message: 'Too many file uploads, please wait before uploading again.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Download rate limiting per user
const downloadLimiter = async (req, res, next) => {
    try {
        if (!req.session?.userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const userId = req.session.userId;
        const endpoint = 'download';
        const windowMs = 60 * 1000; // 1 minute
        const maxRequests = 10; // 10 downloads per minute for regular users
        const now = new Date();
        const windowStart = new Date(now.getTime() - windowMs);

        // Clean old records
        await executeQuery(
            'DELETE FROM rate_limits WHERE window_start < ?', 
            [windowStart]
        );

        // Get current rate limit
        const currentLimit = await getOne(
            'SELECT * FROM rate_limits WHERE user_id = ? AND endpoint = ? AND window_start > ?',
            [userId, endpoint, windowStart]
        );

        if (currentLimit) {
            if (currentLimit.requests_count >= maxRequests) {
                return res.status(429).json({
                    success: false,
                    message: `Download limit exceeded. Maximum ${maxRequests} downloads per minute.`,
                    retryAfter: 60
                });
            }

            await executeQuery(
                'UPDATE rate_limits SET requests_count = requests_count + 1 WHERE id = ?',
                [currentLimit.id]
            );
        } else {
            await executeQuery(
                'INSERT INTO rate_limits (user_id, endpoint, requests_count, window_start) VALUES (?, ?, 1, ?)',
                [userId, endpoint, now]
            );
        }

        next();
    } catch (error) {
        console.error('Download rate limiting error:', error);
        next();
    }
};

// Bulk processing rate limiting
const bulkProcessingLimiter = async (req, res, next) => {
    try {
        if (!req.session?.userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Check if user has active bulk processing session
        const activeBulkSession = await getOne(
            'SELECT * FROM bulk_sessions WHERE user_id = ? AND status IN (?, ?) ORDER BY created_at DESC LIMIT 1',
            [req.session.userId, 'pending', 'processing']
        );

        if (activeBulkSession) {
            return res.status(429).json({
                success: false,
                message: 'You already have an active bulk processing session. Please wait for it to complete.',
                activeBatchId: activeBulkSession.batch_id
            });
        }

        next();
    } catch (error) {
        console.error('Bulk processing rate limiting error:', error);
        next();
    }
};

module.exports = {
    tiktokApiLimiter,
    generalApiLimiter,
    loginLimiter,
    uploadLimiter,
    downloadLimiter,
    bulkProcessingLimiter
};