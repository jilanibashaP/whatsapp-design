const express = require('express');
const controller = require('../controllers/user.controller');

const router = express.Router();

// Registration (1 step)
router.post('/register', controller.register);

// Login flow (2 steps)
router.post('/login', controller.login);  // Step 1: Request OTP
router.post('/verify-login', controller.verifyLogin);  // Step 2: Verify OTP & Login

module.exports = router;
