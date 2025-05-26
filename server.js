const express = require('express');
const { engine } = require('express-handlebars');
const session = require('express-session');
const flash = require('connect-flash');
const fileUpload = require('express-fileupload');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Import database and test connection
const { testConnection } = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const dashboardRoutes = require('./routes/dashboard');

// Import middleware
const { loadUser, generateCSRF } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
            scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers
            imgSrc: ["'self'", "data:", "https:", "http:"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
            connectSrc: ["'self'"],
            mediaSrc: ["'self'", "https:", "http:", "data:"], // Allow video/audio sources
            objectSrc: ["'none'"],
            frameSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false
}));


// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? process.env.ALLOWED_ORIGINS?.split(',') || false
        : true,
    credentials: true
}));

// Logging
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// File upload middleware
app.use(fileUpload({
    limits: { 
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
    },
    abortOnLimit: true,
    responseOnLimit: 'File size exceeds the maximum allowed limit'
}));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: parseInt(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000 // 24 hours
    },
    name: 'tiktok_downloader_session'
}));

// Flash messages
app.use(flash());

// Static files
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0
}));

// View engine setup
app.engine('hbs', engine({
    extname: 'hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views/layouts'),
    partialsDir: path.join(__dirname, 'views/partials'),
    helpers: {
        // Handlebars helpers
        eq: (a, b) => a === b,
        ne: (a, b) => a !== b,
        gt: (a, b) => a > b,
        lt: (a, b) => a < b,
        gte: (a, b) => a >= b,
        lte: (a, b) => a <= b,
        and: (a, b) => a && b,
        or: (a, b) => a || b,
        not: (a) => !a,
        json: (obj) => JSON.stringify(obj),
        formatDate: (date) => {
            if (!date) return '';
            return new Date(date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        },
        formatNumber: (num) => {
            if (!num) return '0';
            return new Intl.NumberFormat().format(num);
        },
        truncate: (str, length) => {
            if (!str) return '';
            return str.length > length ? str.substring(0, length) + '...' : str;
        },
        percentage: (value, total) => {
            if (!total || total === 0) return '0%';
            return Math.round((value / total) * 100) + '%';
        },
        times: (n, block) => {
            let result = '';
            for (let i = 0; i < n; i++) {
                result += block.fn(i);
            }
            return result;
        }
    }
}));

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Global middleware
app.use(loadUser);
app.use(generateCSRF);

// Global template variables
app.use((req, res, next) => {
    res.locals.appName = process.env.APP_NAME || 'TikTok Downloader Pro';
    res.locals.appVersion = process.env.APP_VERSION || '1.0.0';
    res.locals.currentYear = new Date().getFullYear();
    res.locals.nodeEnv = process.env.NODE_ENV;
    res.locals.currentPath = req.path;
    next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/dashboard', dashboardRoutes);

// Home page route
app.get('/', (req, res) => {
    if (req.session && req.session.userId) {
        return res.redirect('/dashboard');
    }
    
    res.render('home', {
        title: 'Welcome - TikTok Downloader Pro',
        layout: 'main',
        showNavbar: false,
        messages: req.flash()
    });
});

// About page
app.get('/about', (req, res) => {
    res.render('about', {
        title: 'About - TikTok Downloader Pro',
        layout: 'main'
    });
});

// Privacy policy
app.get('/privacy', (req, res) => {
    res.render('privacy', {
        title: 'Privacy Policy - TikTok Downloader Pro',
        layout: 'main'
    });
});

// Terms of service
app.get('/terms', (req, res) => {
    res.render('terms', {
        title: 'Terms of Service - TikTok Downloader Pro',
        layout: 'main'
    });
});

// API documentation
app.get('/docs', (req, res) => {
    res.render('docs', {
        title: 'API Documentation - TikTok Downloader Pro',
        layout: 'main'
    });
});

// Favicon
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

// 404 Error handler
app.use((req, res, next) => {
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
        return res.status(404).json({
            success: false,
            message: 'API endpoint not found'
        });
    }
    
    res.status(404).render('error', {
        title: 'Page Not Found - TikTok Downloader Pro',
        layout: 'main',
        error: {
            status: 404,
            message: 'The page you are looking for could not be found.'
        }
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);

    // Handle specific error types
    if (error.code === 'LIMIT_FILE_SIZE') {
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(413).json({
                success: false,
                message: 'File too large. Maximum size is 10MB'
            });
        }
        req.flash('error', 'File too large. Maximum size is 10MB');
        return res.redirect('back');
    }

    if (error.type === 'entity.too.large') {
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(413).json({
                success: false,
                message: 'Request entity too large'
            });
        }
        req.flash('error', 'Request too large');
        return res.redirect('back');
    }

    // API error response
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
        const status = error.status || 500;
        return res.status(status).json({
            success: false,
            message: process.env.NODE_ENV === 'production' 
                ? 'Internal server error' 
                : error.message,
            ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
        });
    }

    // HTML error response
    const status = error.status || 500;
    res.status(status).render('error', {
        title: 'Error - TikTok Downloader Pro',
        layout: 'main',
        error: {
            status: status,
            message: process.env.NODE_ENV === 'production' 
                ? 'Something went wrong. Please try again later.' 
                : error.message
        }
    });
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
    console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
    
    server.close((err) => {
        if (err) {
            console.error('Error during server shutdown:', err);
            process.exit(1);
        }
        
        console.log('Server closed successfully');
        process.exit(0);
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};

// Start server
const startServer = async () => {
    try {
        // Test database connection
        const dbConnected = await testConnection();
        if (!dbConnected) {
            console.error('❌ Cannot start server: Database connection failed');
            process.exit(1);
        }

        const server = app.listen(PORT, () => {
            console.log(`
🚀 TikTok Downloader Pro Server Started!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Environment: ${process.env.NODE_ENV || 'development'}
🌐 Server URL: http://localhost:${PORT}
🔗 Admin Panel: http://localhost:${PORT}/dashboard/admin
📚 API Docs: http://localhost:${PORT}/docs
🗄️  Database: Connected
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 Admin Login:
   Username: admin
   Password: admin123

✨ Ready to process TikTok downloads!
            `);
        });

        // Handle graceful shutdown
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        return server;

    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
};

// Start the server if this file is run directly
if (require.main === module) {
    startServer();
}

module.exports = app;