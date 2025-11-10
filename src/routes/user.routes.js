const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');

// Update user details
router.put('/update', userController.updateUserDetails);

// Request login OTP
router.post('/request-otp', userController.requestLoginOTP);

// Verify login OTP
router.post('/verify-otp', userController.verifyLoginOTP);

module.exports = router;
