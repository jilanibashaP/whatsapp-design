const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User } = require('../models');
const otpService = require('../services/otp.service');
const s3Service = require('../services/s3.service');

// Get all users from the database
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'phone_number', 'name', 'profile_pic', 'about', 'email', 'is_online', 'last_seen', 'created_at'],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users,
        count: users.length
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
};

// update the users detals based on the phone number
exports.updateUserDetails = async (req, res) => {
  try {
    const { phone_number, name, about, email } = req.body;
    const profilePicFile = req.file; // Multer file object

    if (!phone_number) {
      return res.status(400).json({ message: 'Phone number is required' });
    } 
    
    const user = await User.findOne({ where: { phone_number } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    } 

    // Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (about !== undefined) updateData.about = about;
    if (email !== undefined) updateData.email = email;

    // Handle profile picture upload to S3
    const folderName = process.env.AWS_S3_FOLDER_NAME || 'profile-pictures';
    if (profilePicFile) {
      try {
        // Upload to S3 with user ID as filename
        const profilePicUrl = await s3Service.uploadProfilePicture(
          profilePicFile.buffer,
          profilePicFile.originalname,
          profilePicFile.mimetype,
          user.id,
          folderName
        );
        
        updateData.profile_pic = profilePicUrl;

        // Delete old profile picture if it exists
        if (user.profile_pic) {
          await s3Service.deleteFile(user.profile_pic);
        }
      } catch (uploadError) {
        console.error('Error uploading profile picture to S3:', uploadError);
        return res.status(500).json({ 
          message: 'Failed to upload profile picture',
          error: uploadError.message 
        });
      }
    }

    // Update user in database
    await user.update(updateData);
    
    res.json({ 
      message: 'User details updated successfully', 
      user: {
        id: user.id,
        phone_number: user.phone_number,
        name: user.name,
        profile_pic: user.profile_pic,
        about: user.about,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error updating user details:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.requestLoginOTP = async (req, res) => {
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
    let user = await User.findOne({
      where: { phone_number: formattedPhone }
    });
    // ✅ IF USER DOESN'T EXIST, CREATE A NEW USER
    if (!user) {
      user = await User.create({ phone_number: formattedPhone });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Calculate expiry time - 5 minutes from now
    const currentTime = new Date();
    const expiryTime = new Date(currentTime.getTime() + (5 * 60 * 1000));

    // ✅ STORE OTP IN DATABASE
    await user.update({
      otp,
      otp_expiry: expiryTime,
      otp_attempts: 0
    });

    console.log('✅ Login OTP generated for user:', user.id);

    // Send OTP via SMS (optional - will fail in dev without AWS credentials)
    try {
      await otpService.sendOTP(formattedPhone, otp);
    } catch (error) {
      console.error('⚠️  Error sending OTP via SMS (continuing anyway):', error.message);
      // Continue anyway since OTP is stored in DB and returned in response
    }

    // Prepare response - always include OTP for easy testing
    const response = {
      message: 'OTP generated successfully. Please verify to login.',
      phone_number: formattedPhone,
      otp: otp  // Always include OTP in response for easy testing
    };

    console.log('✅ OTP included in response:', otp);

    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Server error during login'
    });
  }
};

/**
 * LOGIN - STEP 2: Verify OTP & Generate Token
 * ============================================
 * User sends: phone_number, otp
 * System does: FETCH OTP FROM DB → Compare OTP → Generate token
 */
exports.verifyLoginOTP = async (req, res) => {
  try {
    const { phone_number, otp } = req.body;

    if (!phone_number) {
      return res.status(400).json({
        message: 'Phone number is required'
      });
    }

    if (!otp) {
      return res.status(400).json({
        message: 'OTP is required'
      });
    }

    // Format phone number
    const formattedPhone = phone_number.startsWith('+') ? phone_number : `+${phone_number}`;

    // ✅ FETCH USER FROM DATABASE
    const user = await User.findOne({
      where: { phone_number: formattedPhone }
    });

    if (!user) {
      return res.status(404).json({
        message: 'User not found. Please register first.'
      });
    }

    // ✅ CHECK IF OTP EXISTS
    if (!user.otp) {
      return res.status(400).json({
        message: 'No OTP found. Please request a new OTP.'
      });
    }

    // ✅ CHECK IF OTP HAS EXPIRED
    // const currentTime = new Date();
    // if (currentTime > user.otp_expiry) {
    //   return res.status(400).json({
    //     message: 'OTP has expired. Please request a new OTP.'
    //   });
    // }

    // ✅ CHECK OTP ATTEMPTS
    if (user.otp_attempts >= 3) {
      return res.status(400).json({
        message: 'Too many failed attempts. Please request a new OTP.'
      });
    }

    // ✅ VERIFY OTP
    if (user.otp !== otp) {
      // Increment failed attempts
      await user.update({
        otp_attempts: user.otp_attempts + 1
      });

      return res.status(400).json({
        message: 'Invalid OTP. Please try again.',
        attemptsRemaining: 3 - (user.otp_attempts + 1)
      });
    }

    // ✅ OTP IS VALID - CLEAR OTP DATA & GENERATE TOKEN
    await user.update({
      otp: null,
      otp_expiry: null,
      otp_attempts: 0,
      is_verified: true
    });

    // ✅ GENERATE JWT TOKEN
    const token = jwt.sign(
      { 
        id: user.id, 
        phone_number: user.phone_number 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    console.log('✅ User logged in successfully:', user.id);

    // ✅ SEND SUCCESS RESPONSE WITH TOKEN
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        phone_number: user.phone_number,
        name: user.name,
        profile_pic: user.profile_pic,
        about: user.about,
        email: user.email
      }
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      message: 'Server error during OTP verification'
    });
  }
};