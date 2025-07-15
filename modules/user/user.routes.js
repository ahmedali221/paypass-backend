const express = require('express');
const router = express.Router();
const userController = require('./user.controller');
const auth = require('../../middleware/auth');

router.post('/register', userController.register);
router.post('/login', userController.login);
router.get('/profile', auth, userController.getProfile);
router.put('/profile', auth, userController.updateProfile);
router.delete('/profile', auth, userController.deleteProfile);
router.get('/barcodes', auth, userController.getActiveUserPackages);
router.get('/referral-link', auth, userController.generateReferralLink);
router.post('/accept-referral', auth, userController.acceptReferral);
router.post('/reward-referral', auth, userController.rewardReferral);
router.post('/send-otp', auth, userController.sendOTP);
router.post('/verify-otp', auth, userController.verifyOTP);
router.get('/referral-status', auth, userController.getReferralStatus);

module.exports = router; 