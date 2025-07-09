const express = require('express');
const router = express.Router();
const userPackageController = require('./userPackage.controller');
const auth = require('../../middleware/auth');

// Get user packages by user ID (no authentication required) - MUST come before /:id
router.get('/by-user/:userId', userPackageController.getUserPackagesByUserId);

// Test endpoint - get user package by ID without authentication (for testing)
router.get('/test/:id', userPackageController.getUserPackageById);

// Debug endpoint - show current user info
router.get('/debug/user-info', userPackageController.getCurrentUserInfo);

// All other routes require authentication
router.use(auth);

// Get all user packages for current user
router.get('/', userPackageController.getUserPackages);

// Get active user packages (not expired)
router.get('/active', userPackageController.getActiveUserPackages);

// Get user package statistics
router.get('/stats', userPackageController.getUserPackageStats);

// Get specific user package by ID
router.get('/:id', userPackageController.getUserPackage);

// Update user package
router.put('/:id', userPackageController.updateUserPackage);

// Use a wash from user package
router.post('/:id/use-wash', userPackageController.useWash);

module.exports = router; 