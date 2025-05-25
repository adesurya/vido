const User = require('../models/User');

// Check if user is authenticated
const requireAuth = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
        return res.status(401).json({ 
            success: false, 
            message: 'Authentication required' 
        });
    }
    
    req.flash('error', 'Please log in to access this page');
    return res.redirect('/auth/login');
};

// Check if user is admin
const requireAdmin = async (req, res, next) => {
    try {
        if (!req.session || !req.session.userId) {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Authentication required' 
                });
            }
            req.flash('error', 'Please log in to access this page');
            return res.redirect('/auth/login');
        }

        const user = await User.findById(req.session.userId);
        if (!user || !user.isAdmin()) {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Admin access required' 
                });
            }
            req.flash('error', 'Admin access required');
            return res.redirect('/dashboard');
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Admin auth error:', error);
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(500).json({ 
                success: false, 
                message: 'Authentication error' 
            });
        }
        req.flash('error', 'Authentication error occurred');
        return res.redirect('/auth/login');
    }
};

// Load current user data
const loadUser = async (req, res, next) => {
    try {
        if (req.session && req.session.userId) {
            const user = await User.findById(req.session.userId);
            if (user) {
                req.user = user;
                res.locals.user = user;
                res.locals.isAuthenticated = true;
                res.locals.isAdmin = user.isAdmin();
            } else {
                // User not found, clear session
                req.session.destroy();
                res.locals.isAuthenticated = false;
                res.locals.isAdmin = false;
            }
        } else {
            res.locals.isAuthenticated = false;
            res.locals.isAdmin = false;
        }
        
        next();
    } catch (error) {
        console.error('Load user error:', error);
        res.locals.isAuthenticated = false;
        res.locals.isAdmin = false;
        next();
    }
};

// Redirect if already authenticated
const redirectIfAuth = (req, res, next) => {
    if (req.session && req.session.userId) {
        return res.redirect('/dashboard');
    }
    next();
};

// Rate limiting for sensitive operations
const sensitiveOperationLimit = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
    const attempts = new Map();
    
    return (req, res, next) => {
        const key = req.ip + req.path;
        const now = Date.now();
        
        if (!attempts.has(key)) {
            attempts.set(key, { count: 1, resetTime: now + windowMs });
            return next();
        }
        
        const attempt = attempts.get(key);
        
        if (now > attempt.resetTime) {
            attempts.set(key, { count: 1, resetTime: now + windowMs });
            return next();
        }
        
        if (attempt.count >= maxAttempts) {
            return res.status(429).json({
                success: false,
                message: 'Too many attempts. Please try again later.',
                retryAfter: Math.ceil((attempt.resetTime - now) / 1000)
            });
        }
        
        attempt.count++;
        next();
    };
};

// CSRF Protection for forms
const csrfProtection = (req, res, next) => {
    if (req.method === 'GET') {
        return next();
    }
    
    const token = req.body._csrf || req.headers['x-csrf-token'];
    const sessionToken = req.session.csrfToken;
    
    if (!token || !sessionToken || token !== sessionToken) {
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(403).json({ 
                success: false, 
                message: 'Invalid CSRF token' 
            });
        }
        req.flash('error', 'Invalid security token. Please try again.');
        return res.redirect('back');
    }
    
    next();
};

// Generate CSRF token
const generateCSRF = (req, res, next) => {
    if (!req.session.csrfToken) {
        req.session.csrfToken = require('crypto').randomBytes(32).toString('hex');
    }
    res.locals.csrfToken = req.session.csrfToken;
    next();
};

module.exports = {
    requireAuth,
    requireAdmin,
    loadUser,
    redirectIfAuth,
    sensitiveOperationLimit,
    csrfProtection,
    generateCSRF
};