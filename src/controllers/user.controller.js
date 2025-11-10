const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User } = require('../models');
const otpService = require('../services/otp.service');

/**
 * REGISTRATION - Create User (Complete Registration)
 * ===================================================
 * User sends: phone_number, name
 * System does: Create user in DB as verified
 */
exports.register = async (req, res) => {
  try {
    const { phone_number, name } = req.body;
    
    if (!phone_number) {
      return res.status(400).json({
        message: 'Phone number is required'
      });
    }

    if (!name) {
      return res.status(400).json({
        message: 'Name is required for registration'
      });
    }
    
    // Format phone number (ensure it has country code)
    const formattedPhone = phone_number.startsWith('+') ? phone_number : `+${phone_number}`;
    
    // Check if user already exists
    const existingUser = await User.findOne({
      where: { phone_number: formattedPhone }
    });
    
    if (existingUser) {
      return res.status(400).json({
        message: 'User with this phone number already exists. Please use login instead.'
      });
    }
    
    // Create new user (verified, no OTP needed for registration)
    const user = await User.create({
      name,
      phone_number: formattedPhone,
      about: 'Hey there! I am using WhatsApp',
      is_verified: true
    });
    
    console.log('✅ New user registered with ID:', user.id);
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    // Return user data
    const userResponse = {
      id: user.id,
      name: user.name,
      phone_number: user.phone_number,
      profile_pic: user.profile_pic,
      about: user.about,
      email: user.email,
      created_at: user.created_at,
      is_verified: user.is_verified
    };
    
    res.status(201).json({
      message: 'Registration successful',
      user: userResponse,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      message: 'Server error during registration'
    });
  }
};

/**
 * LOGIN WORKFLOW - STEP 1: Generate OTP & Store in DB
 * ====================================================
 * User sends: phone_number
 * System does: Check if user EXISTS in DB → Store OTP in DB
 */
exports.login = async (req, res) => {
  try {
    const { phone_number } = req.body;
    
    if (!phone_number) {
      return res.status(400).json({
        message: 'Phone number is required'
      });
    }
    
    // Format phone number
    const formattedPhone = phone_number.startsWith('+') ? phone_number : `+${phone_number}`;
    
    // ✅ CHECK IF USER EXISTS IN DATABASE
    const user = await User.findOne({
      where: { phone_number: formattedPhone }
    });
    
    if (!user) {
      return res.status(404).json({
        message: 'User not found. Please register first.'
      });
    }
    
    // // Check if user is verified
    // if (!user.is_verified) {
    //   return res.status(400).json({
    //     message: 'User not verified. Please complete registration first.'
    //   });
    // }
    
    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Calculate expiry time - 5 minutes from now
    // Create a proper UTC timestamp
    const currentTime = new Date();
    const expiryTime = new Date(currentTime.getTime() + (5 * 60 * 1000)); // Add 5 minutes in milliseconds
  
    // ✅ STORE OTP IN DATABASE
    await user.update({
      otp,
      otp_expiry: expiryTime,
      otp_attempts: 0
    });
    
    
    // Send OTP via SMS (in development, this will just log to console)
    try {
      await otpService.sendOTP(formattedPhone, otp);
    } catch (error) {
      console.error('Error sending OTP:', error);
      // Continue anyway since OTP is stored in DB
    }
    
    // Prepare response
    const response = {
      message: 'OTP sent successfully. Please verify to login.',
      phone_number: formattedPhone,
      otp: otp // Include OTP for testing purposes only
    };
    
    // Include OTP in development mode only
    if (process.env.NODE_ENV === 'development') {
      response.otp = otp;
      console.log('✅ OTP included in response (development mode)');
    }
    
    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Server error during login'
    });
  }
};

/**
 * LOGIN WORKFLOW - STEP 2: Verify OTP from DB & Generate Token
 * =============================================================
 * User sends: phone_number, otp
 * System does: FETCH OTP FROM DB → Compare OTP → Generate token
 */
exports.verifyLogin = async (req, res) => {
  try {
    const { phone_number, otp } = req.body;
    
    if (!phone_number || !otp) {
      return res.status(400).json({
        message: 'Phone number and OTP are required'
      });
    }
    
    // Format phone number
    const formattedPhone = phone_number.startsWith('+') ? phone_number : `+${phone_number}`;
    
    // Fetch user from database
    const user = await User.findOne({
      where: { phone_number: formattedPhone }
    });
    
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }
    
    console.log('🔍 Verifying OTP for user:', user.id);
    console.log('🔍 User OTP from DB:', user.otp);
    console.log('🔍 OTP Expiry from DB:', user.otp_expiry);
    console.log('🔍 Current time:', new Date());
    console.log('🔍 OTP from request:', otp);
    
    // Check if OTP exists
    if (!user.otp) {
      console.log('❌ No OTP found in database');
      return res.status(400).json({
        message: 'No OTP found. Please request a new one.'
      });
    }
    
    // // Check if OTP expiry exists
    // if (!user.otp_expiry) {
    //   console.log('❌ No OTP expiry found in database');
    //   return res.status(400).json({
    //     message: 'Invalid OTP session. Please request a new one.'
    //   });
    // }
    
    // Check if OTP expired FIRST (before comparing OTP value)
    const currentTime = new Date();
    const expiryTime = new Date(user.otp_expiry);
    const currentTimestamp = currentTime.getTime();
    const expiryTimestamp = expiryTime.getTime();
    
    console.log('🔍 Checking OTP expiry...');
    console.log('🔍 Current time:', currentTime.toISOString());
    console.log('🔍 Expiry time:', expiryTime.toISOString());
    console.log('🔍 Current timestamp (ms):', currentTimestamp);
    console.log('🔍 Expiry timestamp (ms):', expiryTimestamp);
    console.log('🔍 Time difference (seconds):', (expiryTimestamp - currentTimestamp) / 1000);
    console.log('🔍 Is expired (current > expiry)?', currentTimestamp > expiryTimestamp);
    
    // if (currentTimestamp > expiryTimestamp) {
    //   console.log('❌ OTP expired');
    //   // Clear expired OTP
    //   await user.update({
    //     otp: null,
    //     otp_expiry: null,
    //     otp_attempts: 0
    //   });
    //   return res.status(400).json({
    //     message: 'OTP has expired. Please request a new one.'
    //   });
    // }
    
    // Compare OTP with database (check OTP match AFTER expiry check)
    if (user.otp !== otp) {
      console.log('❌ OTP mismatch - Expected:', user.otp, 'Received:', otp);
      
      // Increment failed attempts
      const newAttempts = (user.otp_attempts || 0) + 1;
      await user.update({ otp_attempts: newAttempts });
      
      // Lock out after 3 failed attempts
      if (newAttempts >= 3) {
        console.log('❌ Too many failed attempts, clearing OTP');
        await user.update({
          otp: null,
          otp_expiry: null,
          otp_attempts: 0
        });
        return res.status(400).json({
          message: 'Too many failed attempts. Please request a new OTP.'
        });
      }
      
      return res.status(400).json({
        message: `Invalid OTP. ${3 - newAttempts} attempts remaining.`
      });
    }
    
    console.log('✅ OTP is valid and not expired');
    
    // OTP matched - Clear OTP data
    await user.update({
      otp: null,
      otp_expiry: null,
      otp_attempts: 0
    });
    
    console.log('✅ User logged in, ID:', user.id);
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    // Return user data
    const userResponse = {
      id: user.id,
      name: user.name,
      phone_number: user.phone_number,
      profile_pic: user.profile_pic,
      about: user.about,
      email: user.email,
      created_at: user.created_at,
      is_verified: user.is_verified,
      is_online: user.is_online,
      last_seen: user.last_seen
    };
    
    res.json({
      message: 'Login successful',
      user: userResponse,
      token
    });
  } catch (error) {
    console.error('Verify login error:', error);
    res.status(500).json({
      message: 'Server error during login verification'
    });
  }
};
