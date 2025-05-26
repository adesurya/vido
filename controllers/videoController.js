const { validationResult } = require('express-validator');
const tiktokService = require('../services/tiktokService');
const Video = require('../models/Video');
const fs = require('fs').promises;
const path = require('path');

class VideoController {
    // Download single video
    async downloadSingle(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { url } = req.body;
            const userId = req.session.userId;

            console.log('📥 Single download request:', { url, userId });

            // Validate TikTok URL format
            if (!tiktokService.isValidTikTokUrl(url)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid TikTok URL format. Please provide a valid TikTok video URL.'
                });
            }

            // Clean and validate the URL
            const cleanUrl = tiktokService.extractTikTokUrl(url);
            console.log('🔗 Cleaned URL:', cleanUrl);

            // Check if API is configured
            if (!tiktokService.isServiceConfigured()) {
                console.log('📝 Processing in demo mode for URL:', cleanUrl);
            }

            // Download the video using the actual URL provided by user
            const result = await tiktokService.downloadVideo(cleanUrl, userId);

            res.json({
                success: true,
                message: tiktokService.isServiceConfigured() 
                    ? 'Video processed successfully' 
                    : 'Demo video processed (configure API for real downloads)',
                data: {
                    video: {
                        id: result.video.id,
                        title: result.video.title,
                        thumbnail: result.video.cover_url,
                        duration: result.video.getFormattedDuration(),
                        author: {
                            name: result.video.author_name,
                            avatar: result.video.author_avatar
                        },
                        stats: result.video.getFormattedCounts(),
                        downloadUrls: result.downloadUrls,
                        isDemoMode: !tiktokService.isServiceConfigured(),
                        originalUrl: cleanUrl // Include original URL for reference
                    }
                }
            });

        } catch (error) {
            console.error('Single download error:', error.message);
            
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to process video'
            });
        }
    }

    // Upload bulk download file
    async uploadBulk(req, res) {
        try {
            if (!req.files || !req.files.bulkFile) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }

            const file = req.files.bulkFile;
            const allowedTypes = ['text/csv', 'application/vnd.ms-excel'];
            
            if (!allowedTypes.includes(file.mimetype) && !file.name.endsWith('.csv')) {
                return res.status(400).json({
                    success: false,
                    message: 'Only CSV files are allowed'
                });
            }

            if (file.size > parseInt(process.env.MAX_FILE_SIZE) || 10485760) { // 10MB
                return res.status(400).json({
                    success: false,
                    message: 'File size exceeds 10MB limit'
                });
            }

            // Read and parse CSV content
            const csvContent = file.data.toString('utf8');
            const urls = tiktokService.parseBulkUrls(csvContent);

            if (urls.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No valid URLs found in the CSV file'
                });
            }

            if (urls.length > 100) { // Limit bulk downloads
                return res.status(400).json({
                    success: false,
                    message: 'Maximum 100 URLs allowed per bulk download'
                });
            }

            // Validate URLs
            const invalidUrls = urls.filter(url => !tiktokService.isValidTikTokUrl(url));
            if (invalidUrls.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid TikTok URL(s) found: ${invalidUrls.slice(0, 3).join(', ')}${invalidUrls.length > 3 ? '...' : ''}`
                });
            }

            // Create bulk session
            const batchId = await tiktokService.createBulkSession(req.session.userId, urls.length);

            // Start background processing
            setImmediate(async () => {
                try {
                    await tiktokService.processBulkDownload(urls, req.session.userId, batchId);
                } catch (error) {
                    console.error('Background bulk processing error:', error);
                }
            });

            res.json({
                success: true,
                message: 'Bulk download started',
                data: {
                    batchId: batchId,
                    totalUrls: urls.length,
                    status: 'processing'
                }
            });

        } catch (error) {
            console.error('Bulk upload error:', error.message);
            
            res.status(500).json({
                success: false,
                message: 'Failed to process bulk upload'
            });
        }
    }

    // Get bulk download status
    async getBulkStatus(req, res) {
        try {
            const { batchId } = req.params;
            
            if (!batchId) {
                return res.status(400).json({
                    success: false,
                    message: 'Batch ID is required'
                });
            }

            const status = await tiktokService.getBulkSessionStatus(batchId);

            res.json({
                success: true,
                data: status
            });

        } catch (error) {
            console.error('Get bulk status error:', error.message);
            
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get bulk status'
            });
        }
    }

    // Get bulk download results
    async getBulkResults(req, res) {
        try {
            const { batchId } = req.params;
            const { executeQuery } = require('../config/database');
            
            // Get bulk session info
            const session = await tiktokService.getBulkSessionStatus(batchId);
            
            if (session.status !== 'completed') {
                return res.status(400).json({
                    success: false,
                    message: 'Bulk download is not completed yet'
                });
            }

            // Get download results
            const results = await executeQuery(`
                SELECT 
                    dh.*,
                    v.title, v.cover_url, v.video_url, v.watermark_video_url,
                    v.duration, v.play_count, v.digg_count, v.comment_count,
                    v.share_count, v.download_count, v.author_name, v.author_avatar
                FROM download_history dh
                JOIN videos v ON dh.video_id = v.id
                WHERE dh.batch_id = ? AND dh.status = 'completed'
                ORDER BY dh.downloaded_at ASC
            `, [batchId]);

            const formattedResults = results.map(row => ({
                id: row.video_id,
                title: row.title,
                thumbnail: row.cover_url,
                duration: Math.floor(row.duration / 60) + ':' + (row.duration % 60).toString().padStart(2, '0'),
                author: {
                    name: row.author_name,
                    avatar: row.author_avatar
                },
                stats: {
                    play_count: Video.formatCount(row.play_count),
                    digg_count: Video.formatCount(row.digg_count),
                    comment_count: Video.formatCount(row.comment_count),
                    share_count: Video.formatCount(row.share_count),
                    download_count: Video.formatCount(row.download_count)
                },
                downloadUrls: {
                    hd: row.video_url,
                    watermark: row.watermark_video_url
                },
                downloadedAt: row.downloaded_at
            }));

            res.json({
                success: true,
                data: {
                    session: session,
                    results: formattedResults
                }
            });

        } catch (error) {
            console.error('Get bulk results error:', error.message);
            
            res.status(500).json({
                success: false,
                message: 'Failed to get bulk results'
            });
        }
    }

    // Get download template
    async getTemplate(req, res) {
        try {
            // Create CSV template content
            const templateContent = `url,title,notes
https://www.tiktok.com/@username/video/1234567890123456789,Sample Video Title,Optional notes
https://www.tiktok.com/@username/video/9876543210987654321,Another Video Title,Another note
`;

            // Set headers for file download
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="tiktok_bulk_download_template.csv"');
            
            res.send(templateContent);

        } catch (error) {
            console.error('Get template error:', error.message);
            
            res.status(500).json({
                success: false,
                message: 'Failed to generate template'
            });
        }
    }

    // Get user's download history
    async getDownloadHistory(req, res) {
    try {
        const userId = req.session.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        console.log(`Getting download history for user ${userId}, limit: ${limit}`);

        const { executeQuery, getOne } = require('../config/database');

        // Get total count
        const totalResult = await getOne(
            'SELECT COUNT(*) as count FROM download_history WHERE user_id = ?',
            [userId]
        );
        const total = totalResult?.count || 0;
        console.log(`Total downloads for user ${userId}: ${total}`);

        // Get download history with proper JOIN
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
            LIMIT ? OFFSET ?
        `, [userId, limit, offset]);

        console.log(`Found ${history.length} download records`);

        // Helper function to format duration
        const formatDuration = (seconds) => {
            if (!seconds || seconds === 0) return '00:00';
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        };

        // Helper function to format count
        const formatCount = (count) => {
            if (!count || count === 0) return '0';
            
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
        };

        // Format response data
        const formattedHistory = history.map(row => {
            try {
                return {
                    id: row.id,
                    video: {
                        id: row.video_id,
                        title: row.title || 'Untitled Video',
                        thumbnail: row.cover_url || 'https://via.placeholder.com/70x70/6366f1/ffffff?text=Video',
                        author: row.author_name || 'Unknown Author',
                        duration: formatDuration(row.duration || 0),
                        stats: {
                            play_count: formatCount(row.play_count || 0),
                            digg_count: formatCount(row.digg_count || 0),
                            comment_count: formatCount(row.comment_count || 0),
                            share_count: formatCount(row.share_count || 0),
                            download_count: formatCount(row.download_count || 0)
                        }
                    },
                    downloadType: row.download_type,
                    batchId: row.batch_id,
                    status: row.status,
                    downloadedAt: row.downloaded_at
                };
            } catch (formatError) {
                console.error('Error formatting row:', formatError, 'Row data:', row);
                // Return safe fallback
                return {
                    id: row.id || 0,
                    video: {
                        id: row.video_id || 0,
                        title: 'Error Loading Video',
                        thumbnail: 'https://via.placeholder.com/70x70/ff0000/ffffff?text=Error',
                        author: 'Unknown',
                        duration: '00:00',
                        stats: {
                            play_count: '0',
                            digg_count: '0',
                            comment_count: '0',
                            share_count: '0',
                            download_count: '0'
                        }
                    },
                    downloadType: row.download_type || 'single',
                    batchId: row.batch_id,
                    status: row.status || 'unknown',
                    downloadedAt: row.downloaded_at || new Date().toISOString()
                };
            }
        });

        const response = {
            success: true,
            data: {
                history: formattedHistory,
                pagination: {
                    page: page,
                    limit: limit,
                    total: total,
                    pages: Math.ceil(total / limit)
                }
            }
        };

        console.log(`Sending response with ${formattedHistory.length} items`);
        res.json(response);

    } catch (error) {
        console.error('Get download history error:', error);
        console.error('Error stack:', error.stack);
        
        res.status(500).json({
            success: false,
            message: 'Failed to get download history',
            error: process.env.NODE_ENV === 'development' ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
}

// JUGA TAMBAHKAN method getVideoDetails ini jika belum ada:
async getVideoDetails(req, res) {
    try {
        const { id } = req.params;
        const userId = req.session.userId;
        
        console.log(`Getting video details for ID: ${id}, User: ${userId}`);
        
        const { getOne } = require('../config/database');
        
        const video = await getOne(`
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
        `, [id, userId]);
        
        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Video not found or not accessible'
            });
        }

        // Helper functions
        const formatDuration = (seconds) => {
            if (!seconds || seconds === 0) return '00:00';
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        };

        const formatCount = (count) => {
            if (!count || count === 0) return '0';
            
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
        };

        const responseData = {
            id: video.id,
            title: video.title || 'Untitled Video',
            thumbnail: video.cover_url || 'https://via.placeholder.com/300x400/6366f1/ffffff?text=Video',
            duration: formatDuration(video.duration),
            author: {
                id: video.author_id || 'unknown',
                name: video.author_name || 'Unknown Author',
                avatar: video.author_avatar || 'https://via.placeholder.com/32x32/6366f1/ffffff?text=A'
            },
            music: {
                id: video.music_id || null,
                title: video.music_title || null,
                author: video.music_author || null
            },
            stats: {
                play_count: formatCount(video.play_count || 0),
                digg_count: formatCount(video.digg_count || 0),
                comment_count: formatCount(video.comment_count || 0),
                share_count: formatCount(video.share_count || 0),
                download_count: formatCount(video.download_count || 0)
            },
            downloadUrls: {
                hd: video.video_url || '#',
                watermark: video.watermark_video_url || '#'
            },
            downloadInfo: {
                type: video.download_type || 'single',
                downloadedAt: video.downloaded_at || new Date().toISOString(),
                batchId: video.batch_id || null,
                status: video.status || 'completed'
            },
            createdAt: video.created_at
        };

        res.json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error('Get video details error:', error);
        
        res.status(500).json({
            success: false,
            message: 'Failed to get video details',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

formatDuration(seconds) {
    if (!seconds || seconds === 0) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}


formatCount(count) {
    if (!count || count === 0) return '0';
    
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

    // Get video details
    async getVideoDetails(req, res) {
        try {
            const { id } = req.params;
            
            const video = await Video.findById(id);
            
            if (!video) {
                return res.status(404).json({
                    success: false,
                    message: 'Video not found'
                });
            }

            res.json({
                success: true,
                data: {
                    id: video.id,
                    title: video.title,
                    thumbnail: video.cover_url,
                    duration: video.getFormattedDuration(),
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
                    stats: video.getFormattedCounts(),
                    downloadUrls: {
                        hd: video.video_url,
                        watermark: video.watermark_video_url
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

    // Get download statistics
    async getStats(req, res) {
        try {
            const userId = req.session.userId;
            const stats = await tiktokService.getDownloadStats(userId);

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            console.error('Get stats error:', error.message);
            
            res.status(500).json({
                success: false,
                message: 'Failed to get statistics'
            });
        }
    }
}

module.exports = new VideoController();