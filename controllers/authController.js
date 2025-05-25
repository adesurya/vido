const { validationResult } = require('express-validator');
const User = require('../models/User');
const sanitizeHtml = require('sanitize-html');

class AuthController {
    // Show login page
    async showLogin(req, res) {
        try {
            res.render('auth/login', {
                title: 'Login - TikTok Downloader Pro',
                layout: 'main',
                messages: req.flash()
            });
        } catch (error) {
            console.error('Show login error:', error);
            res.status(500).render('error', { 
                message: 'Internal server error',
                layout: 'main' 
            });
        }
    }

    // Handle login
    async login(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                console.log('Validation errors:', errors.array());
                if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                    return res.status(400).json({
                        success: false,
                        message: 'Validation failed',
                        errors: errors.array()
                    });
                }
                
                req.flash('error', 'Please provide valid login credentials');
                return res.redirect('/auth/login');
            }

            const { username, password } = req.body;
            console.log('Login attempt:', { username, passwordLength: password?.length });
            
            // Sanitize input
            const cleanUsername = sanitizeHtml(username.trim(), { allowedTags: [], allowedAttributes: {} });
            
            // Find user by username or email
            let user = await User.findByUsername(cleanUsername);
            if (!user) {
                user = await User.findByEmail(cleanUsername);
            }

            if (!user) {
                console.log('User not found:', cleanUsername);
                if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid username or password'
                    });
                }
                
                req.flash('error', 'Invalid username or password');
                return res.redirect('/auth/login');
            }

            console.log('User found:', { 
                id: user.id, 
                username: user.username, 
                email: user.email, 
                role: user.role,
                is_active: user.is_active,
                hasPassword: !!user.password_hash 
            });

            // Check if user is active
            if (!user.is_active) {
                console.log('User account is deactivated');
                if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                    return res.status(401).json({
                        success: false,
                        message: 'Account is deactivated'
                    });
                }
                
                req.flash('error', 'Account is deactivated');
                return res.redirect('/auth/login');
            }

            // Validate password
            console.log('Validating password...');
            const isValidPassword = await user.validatePassword(password);
            console.log('Password validation result:', isValidPassword);
            
            if (!isValidPassword) {
                console.log('Password validation failed');
                if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid username or password'
                    });
                }
                
                req.flash('error', 'Invalid username or password');
                return res.redirect('/auth/login');
            }

            // Create session
            req.session.userId = user.id;
            req.session.username = user.username;
            req.session.role = user.role;

            console.log('Login successful for user:', user.username);

            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    message: 'Login successful',
                    data: {
                        user: user.toJSON(),
                        redirectUrl: '/dashboard'
                    }
                });
            }

            req.flash('success', `Welcome back, ${user.username}!`);
            res.redirect('/dashboard');

        } catch (error) {
            console.error('Login error:', error);
            
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(500).json({
                    success: false,
                    message: 'Login failed. Please try again.'
                });
            }
            
            req.flash('error', 'Login failed. Please try again.');
            res.redirect('/auth/login');
        }
    }

    // Show register page
    async showRegister(req, res) {
        try {
            res.render('auth/register', {
                title: 'Register - TikTok Downloader Pro',
                layout: 'main',
                messages: req.flash()
            });
        } catch (error) {
            console.error('Show register error:', error);
            res.status(500).render('error', { 
                message: 'Internal server error',
                layout: 'main' 
            });
        }
    }

    // Handle registration
    async register(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                    return res.status(400).json({
                        success: false,
                        message: 'Validation failed',
                        errors: errors.array()
                    });
                }
                
                const errorMessages = errors.array().map(error => error.msg);
                req.flash('error', errorMessages);
                return res.redirect('/auth/register');
            }

            const { username, email, password, confirmPassword } = req.body;

            // Sanitize input
            const cleanUsername = sanitizeHtml(username.trim(), { allowedTags: [], allowedAttributes: {} });
            const cleanEmail = sanitizeHtml(email.trim().toLowerCase(), { allowedTags: [], allowedAttributes: {} });

            // Check password confirmation
            if (password !== confirmPassword) {
                if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                    return res.status(400).json({
                        success: false,
                        message: 'Passwords do not match'
                    });
                }
                
                req.flash('error', 'Passwords do not match');
                return res.redirect('/auth/register');
            }

            // Create user
            const user = await User.create({
                username: cleanUsername,
                email: cleanEmail,
                password: password,
                role: 'user'
            });

            if (!user) {
                if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to create user account'
                    });
                }
                
                req.flash('error', 'Failed to create user account');
                return res.redirect('/auth/register');
            }

            // Auto login after registration
            req.session.userId = user.id;
            req.session.username = user.username;
            req.session.role = user.role;

            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    message: 'Account created successfully',
                    data: {
                        user: user.toJSON(),
                        redirectUrl: '/dashboard'
                    }
                });
            }

            req.flash('success', `Welcome to TikTok Downloader Pro, ${user.username}!`);
            res.redirect('/dashboard');

        } catch (error) {
            console.error('Registration error:', error);
            
            let errorMessage = 'Registration failed. Please try again.';
            if (error.message.includes('already exists')) {
                errorMessage = 'Username or email already exists';
            }

            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(500).json({
                    success: false,
                    message: errorMessage
                });
            }
            
            req.flash('error', errorMessage);
            res.redirect('/auth/register');
        }
    }

    // Handle logout
    async logout(req, res) {
        try {
            const username = req.session.username;
            
            req.session.destroy((err) => {
                if (err) {
                    console.error('Session destroy error:', err);
                }
                
                if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                    return res.json({
                        success: true,
                        message: 'Logged out successfully',
                        redirectUrl: '/auth/login'
                    });
                }
                
                req.flash('success', 'You have been logged out successfully');
                res.redirect('/auth/login');
            });

        } catch (error) {
            console.error('Logout error:', error);
            
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(500).json({
                    success: false,
                    message: 'Logout failed'
                });
            }
            
            res.redirect('/auth/login');
        }
    }

    // Get current user profile
    async getProfile(req, res) {
        try {
            const user = await User.findById(req.session.userId);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const stats = await user.getDownloadStats();

            res.json({
                success: true,
                data: {
                    user: user.toJSON(),
                    stats: stats
                }
            });

        } catch (error) {
            console.error('Get profile error:', error);
            
            res.status(500).json({
                success: false,
                message: 'Failed to get user profile'
            });
        }
    }

    // Update user profile
    async updateProfile(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const user = await User.findById(req.session.userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const { username, email } = req.body;
            
            // Sanitize input
            const updateData = {};
            if (username && username.trim() !== user.username) {
                updateData.username = sanitizeHtml(username.trim(), { allowedTags: [], allowedAttributes: {} });
            }
            if (email && email.trim().toLowerCase() !== user.email) {
                updateData.email = sanitizeHtml(email.trim().toLowerCase(), { allowedTags: [], allowedAttributes: {} });
            }

            if (Object.keys(updateData).length === 0) {
                return res.json({
                    success: true,
                    message: 'No changes detected'
                });
            }

            const updated = await user.update(updateData);
            
            if (!updated) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to update profile'
                });
            }

            // Update session if username changed
            if (updateData.username) {
                req.session.username = updateData.username;
            }

            res.json({
                success: true,
                message: 'Profile updated successfully'
            });

        } catch (error) {
            console.error('Update profile error:', error);
            
            let errorMessage = 'Failed to update profile';
            if (error.message.includes('already exists')) {
                errorMessage = 'Username or email already exists';
            }

            res.status(500).json({
                success: false,
                message: errorMessage
            });
        }
    }

    // Change password
    async changePassword(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { currentPassword, newPassword, confirmPassword } = req.body;

            // Check password confirmation
            if (newPassword !== confirmPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'New passwords do not match'
                });
            }

            const user = await User.findById(req.session.userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Validate current password
            const isValidPassword = await user.validatePassword(currentPassword);
            if (!isValidPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password is incorrect'
                });
            }

            // Change password
            const changed = await user.changePassword(newPassword);
            
            if (!changed) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to change password'
                });
            }

            res.json({
                success: true,
                message: 'Password changed successfully'
            });

        } catch (error) {
            console.error('Change password error:', error);
            
            res.status(500).json({
                success: false,
                message: 'Failed to change password'
            });
        }
    }

    // Check authentication status
    async checkAuth(req, res) {
        try {
            if (!req.session.userId) {
                return res.json({
                    success: false,
                    authenticated: false
                });
            }

            const user = await User.findById(req.session.userId);
            if (!user) {
                req.session.destroy();
                return res.json({
                    success: false,
                    authenticated: false
                });
            }

            res.json({
                success: true,
                authenticated: true,
                user: user.toJSON()
            });

        } catch (error) {
            console.error('Check auth error:', error);
            
            res.json({
                success: false,
                authenticated: false
            });
        }
    }
}

module.exports = new AuthController();