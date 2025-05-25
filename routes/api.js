const express = require('express');
const { body } = require('express-validator');
const videoController = require('../controllers/videoController');
const authMiddleware = require('../middleware/auth');
const { requireAuth, loadUser } = authMiddleware;
const rateLimitMiddleware = require('../middleware/rateLimit');
const { 
    tiktokApiLimiter, 
    generalApiLimiter, 
    downloadLimiter, 
    bulkProcessingLimiter 
} = rateLimitMiddleware;

const router = express.Router();

// Apply middleware to all API routes
router.use(loadUser);
router.use(generalApiLimiter);

// Validation rules
const downloadValidation = [
    body('url')
        .trim()
        .notEmpty()
        .withMessage('TikTok URL is required')
        .isLength({ min: 10, max: 500 })
        .withMessage('URL must be between 10 and 500 characters')
        .matches(/tiktok\.com|vm\.tiktok\.com/)
        .withMessage('Please provide a valid TikTok URL')
];

// Single video download
router.post('/download/single', 
    requireAuth,
    tiktokApiLimiter,
    downloadLimiter,
    downloadValidation,
    videoController.downloadSingle
);

// Bulk video upload
router.post('/download/bulk/upload',
    requireAuth,
    bulkProcessingLimiter,
    videoController.uploadBulk
);

// Get bulk download status
router.get('/download/bulk/status/:batchId',
    requireAuth,
    videoController.getBulkStatus
);

// Get bulk download results
router.get('/download/bulk/results/:batchId',
    requireAuth,
    videoController.getBulkResults
);

// Download template
router.get('/download/template',
    requireAuth,
    videoController.getTemplate
);

// Get download history
router.get('/download/history',
    requireAuth,
    videoController.getDownloadHistory
);

// Get video details
router.get('/video/:id',
    requireAuth,
    videoController.getVideoDetails
);

// Get download statistics
router.get('/stats',
    requireAuth,
    videoController.getStats
);

// Health check endpoint
router.get('/health', (req, res) => {
    const tiktokService = require('../services/tiktokService');
    const isConfigured = tiktokService.isServiceConfigured();
    
    res.json({
        success: true,
        message: isConfigured ? 'API is running' : 'API running in demo mode - configure RapidAPI key for real downloads',
        timestamp: new Date().toISOString(),
        version: process.env.APP_VERSION || '1.0.0',
        apiConfigured: isConfigured,
        features: {
            singleDownload: true,
            bulkDownload: true,
            demoMode: !isConfigured
        }
    });
});

// API documentation endpoint
router.get('/docs', (req, res) => {
    const apiDocs = {
        title: 'TikTok Downloader API Documentation',
        version: '1.0.0',
        endpoints: [
            {
                method: 'POST',
                path: '/api/download/single',
                description: 'Download a single TikTok video',
                authentication: 'Required',
                rateLimit: '2 requests per second',
                parameters: {
                    url: 'string (required) - TikTok video URL'
                },
                response: {
                    success: 'boolean',
                    message: 'string',
                    data: {
                        video: {
                            id: 'number',
                            title: 'string',
                            thumbnail: 'string',
                            duration: 'string',
                            author: 'object',
                            stats: 'object',
                            downloadUrls: 'object'
                        }
                    }
                }
            },
            {
                method: 'POST',
                path: '/api/download/bulk/upload',
                description: 'Upload CSV file for bulk download',
                authentication: 'Required',
                rateLimit: '1 active session per user',
                parameters: {
                    bulkFile: 'file (required) - CSV file with TikTok URLs'
                },
                response: {
                    success: 'boolean',
                    message: 'string',
                    data: {
                        batchId: 'string',
                        totalUrls: 'number',
                        status: 'string'
                    }
                }
            },
            {
                method: 'GET',
                path: '/api/download/bulk/status/:batchId',
                description: 'Get bulk download progress',
                authentication: 'Required',
                response: {
                    success: 'boolean',
                    data: {
                        batchId: 'string',
                        status: 'string',
                        progress: 'number',
                        totalVideos: 'number',
                        processedVideos: 'number'
                    }
                }
            },
            {
                method: 'GET',
                path: '/api/download/template',
                description: 'Download CSV template for bulk upload',
                authentication: 'Required',
                response: 'CSV file download'
            },
            {
                method: 'GET',
                path: '/api/download/history',
                description: 'Get user download history',
                authentication: 'Required',
                parameters: {
                    page: 'number (optional) - Page number',
                    limit: 'number (optional) - Items per page'
                }
            },
            {
                method: 'GET',
                path: '/api/video/:id',
                description: 'Get video details by ID',
                authentication: 'Required'
            },
            {
                method: 'GET',
                path: '/api/stats',
                description: 'Get user download statistics',
                authentication: 'Required'
            }
        ],
        errors: {
            400: 'Bad Request - Invalid parameters',
            401: 'Unauthorized - Authentication required',
            403: 'Forbidden - Access denied',
            404: 'Not Found - Resource not found',
            429: 'Too Many Requests - Rate limit exceeded',
            500: 'Internal Server Error - Server error'
        },
        rateLimit: {
            general: '100 requests per 15 minutes per IP',
            tiktokApi: '2 requests per second per user',
            download: '10 downloads per minute per user',
            bulk: '1 active session per user'
        }
    };

    res.json(apiDocs);
});

// Error handling middleware for API routes
router.use((error, req, res, next) => {
    console.error('API Error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: error.details || []
        });
    }

    // Handle rate limit errors
    if (error.status === 429) {
        return res.status(429).json({
            success: false,
            message: 'Rate limit exceeded',
            retryAfter: error.retryAfter || 60
        });
    }

    // Handle authentication errors
    if (error.status === 401) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    // Handle authorization errors
    if (error.status === 403) {
        return res.status(403).json({
            success: false,
            message: 'Access denied'
        });
    }

    // Default error response
    const status = error.status || 500;
    const message = process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message;

    res.status(status).json({
        success: false,
        message: message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
});

module.exports = router;