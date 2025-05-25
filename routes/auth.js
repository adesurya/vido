const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const { redirectIfAuth, loadUser, sensitiveOperationLimit } = authMiddleware;
const { loginLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// Validation rules
const loginValidation = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('Username must be between 3 and 50 characters')
        .matches(/^[a-zA-Z0-9._@-]+$/)
        .withMessage('Username can only contain letters, numbers, dots, underscores, @ and hyphens'),
    
    body('password')
        .isLength({ min: 6, max: 100 })
        .withMessage('Password must be between 6 and 100 characters')
];

const registerValidation = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('Username must be between 3 and 50 characters')
        .matches(/^[a-zA-Z0-9._-]+$/)
        .withMessage('Username can only contain letters, numbers, dots, underscores and hyphens')
        .custom((value) => {
            // Reserved usernames
            const reserved = ['admin', 'root', 'administrator', 'mod', 'moderator', 'api', 'www', 'mail', 'ftp'];
            if (reserved.includes(value.toLowerCase())) {
                throw new Error('This username is not available');
            }
            return true;
        }),
    
    body('email')
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail()
        .isLength({ max: 100 })
        .withMessage('Email must not exceed 100 characters'),
    
    body('password')
        .isLength({ min: 6, max: 100 })
        .withMessage('Password must be between 6 and 100 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Password confirmation does not match password');
            }
            return true;
        })
];

const profileUpdateValidation = [
    body('username')
        .optional()
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('Username must be between 3 and 50 characters')
        .matches(/^[a-zA-Z0-9._-]+$/)
        .withMessage('Username can only contain letters, numbers, dots, underscores and hyphens'),
    
    body('email')
        .optional()
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail()
        .isLength({ max: 100 })
        .withMessage('Email must not exceed 100 characters')
];

const changePasswordValidation = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
    
    body('newPassword')
        .isLength({ min: 6, max: 100 })
        .withMessage('New password must be between 6 and 100 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
    
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Password confirmation does not match new password');
            }
            return true;
        })
];

// Apply middleware to all auth routes
router.use(loadUser);

// Login routes
router.get('/login', redirectIfAuth, authController.showLogin);
router.post('/login', 
    redirectIfAuth, 
    loginLimiter, 
    loginValidation, 
    authController.login
);

// Register routes
router.get('/register', redirectIfAuth, authController.showRegister);
router.post('/register', 
    redirectIfAuth, 
    loginLimiter, 
    registerValidation, 
    authController.register
);

// Logout
router.post('/logout', authController.logout);
router.get('/logout', authController.logout);

// Profile management routes (require authentication)
router.get('/profile', 
    authMiddleware.requireAuth, 
    authController.getProfile
);

router.put('/profile', 
    authMiddleware.requireAuth,
    profileUpdateValidation,
    authController.updateProfile
);

router.post('/change-password', 
    authMiddleware.requireAuth,
    sensitiveOperationLimit(3, 15 * 60 * 1000), // 3 attempts per 15 minutes
    changePasswordValidation,
    authController.changePassword
);

// Authentication status check
router.get('/check', authController.checkAuth);

// Password reset routes (future implementation)
router.get('/forgot-password', redirectIfAuth, (req, res) => {
    res.render('auth/forgot-password', {
        title: 'Forgot Password - TikTok Downloader Pro',
        layout: 'main',
        messages: req.flash()
    });
});

router.post('/forgot-password', redirectIfAuth, [
    body('email')
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail()
], (req, res) => {
    // TODO: Implement password reset functionality
    req.flash('info', 'Password reset functionality will be available soon');
    res.redirect('/auth/forgot-password');
});

module.exports = router;