const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const upload = require('../middlewares/upload.middleware');

// Get all users
router.get('/', userController.getAllUsers);

// Update user details (with optional profile picture upload)
router.put('/update', upload.single('profile_pic'), userController.updateUserDetails);

// Request login OTP
router.post('/request-otp', userController.requestLoginOTP);

// Verify login OTP
router.post('/verify-otp', userController.verifyLoginOTP);

module.exports = router;
