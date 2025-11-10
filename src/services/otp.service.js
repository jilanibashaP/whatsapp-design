const { PublishCommand } = require('@aws-sdk/client-sns');
const { snsClient } = require('../config/aws');

// In-memory store for OTPs (in production, use Redis or database)
const otpStore = new Map();

/**
 * Generate a 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP via SMS using AWS SNS
 */
const sendOTP = async (phoneNumber, otp) => {
  // Check SMS_MODE environment variable (or fall back to NODE_ENV)
  const smsMode = process.env.SMS_MODE || process.env.NODE_ENV;
  
  // In development mode, just log the OTP instead of sending via AWS
  if (smsMode === 'development') {
    console.log('📱 [DEV MODE] OTP for', phoneNumber, ':', otp);
    console.log('✅ OTP logged to console (development mode - not sent via SMS)');
    return { success: true, messageId: 'dev-mode-' + Date.now() };
  }

  // Production mode - send via AWS SNS
  try {
    const params = {
      Message: `Your verification code for synapse is: ${otp}. Valid for 5 minutes.`,
      PhoneNumber: phoneNumber,
      MessageAttributes: {
        'AWS.SNS.SMS.SenderID': {
          DataType: 'String',
          StringValue: process.env.AWS_SNS_SENDER_ID || 'YourApp'
        },
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional'
        }
      }
    };

    const command = new PublishCommand(params);
    const result = await snsClient.send(command);
    
    console.log('✅ OTP sent via AWS SNS:', result.MessageId);
    return { success: true, messageId: result.MessageId };
  } catch (error) {
    console.error('❌ Error sending OTP via AWS SNS:', error);
    throw new Error('Failed to send OTP');
  }
};

/**
 * Store OTP with expiration (5 minutes)
 */
const storeOTP = (phoneNumber, otp) => {
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  otpStore.set(phoneNumber, { otp, expiresAt, attempts: 0 });
  
  // Clean up expired OTP after 5 minutes
  setTimeout(() => {
    otpStore.delete(phoneNumber);
  }, 5 * 60 * 1000);
};

/**
 * Verify OTP
 */
const verifyOTP = (phoneNumber, otp) => {
  const storedData = otpStore.get(phoneNumber);
  
  if (!storedData) {
    return { success: false, message: 'OTP expired or not found' };
  }
  
  // Check if OTP is expired
  if (Date.now() > storedData.expiresAt) {
    otpStore.delete(phoneNumber);
    return { success: false, message: 'OTP expired' };
  }
  
  // Check attempts
  if (storedData.attempts >= 3) {
    otpStore.delete(phoneNumber);
    return { success: false, message: 'Too many failed attempts' };
  }
  
  // Verify OTP
  if (storedData.otp === otp) {
    otpStore.delete(phoneNumber);
    return { success: true, message: 'OTP verified successfully' };
  }
  
  // Increment attempts
  storedData.attempts += 1;
  otpStore.set(phoneNumber, storedData);
  
  return { success: false, message: 'Invalid OTP' };
};

/**
 * Request OTP for phone number
 */
const requestOTP = async (phoneNumber) => {
  try {
    // Format phone number (ensure it has country code)
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    
    // Generate OTP
    const otp = generateOTP();
    
    // Store OTP
    storeOTP(formattedPhone, otp);
    
    // Send OTP via SMS
    await sendOTP(formattedPhone, otp);
    
    return {
      success: true,
      message: 'OTP sent successfully',
      // For development/testing only - remove in production
      ...(process.env.NODE_ENV === 'development' && { otp })
    };
  } catch (error) {
    console.error('Error requesting OTP:', error);
    throw error;
  }
};

module.exports = {
  requestOTP,
  verifyOTP,
  generateOTP,
  sendOTP,
  storeOTP
};
