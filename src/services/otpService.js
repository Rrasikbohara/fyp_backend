const crypto = require('crypto');
const { sendOTPEmail } = require('./emailService');

// In-memory storage for OTPs (would be better in Redis or a database for production)
const otpStore = new Map();

/**
 * Create an OTP for a user
 * @param {string} email - User's email
 * @param {string} purpose - Purpose of OTP (e.g. 'verification', 'password_reset')
 * @returns {string} - Generated OTP
 */
function createOTP(email, purpose = 'verification') {
  // Generate a 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  
  // Store OTP with timestamp and purpose
  otpStore.set(email, {
    otp,
    purpose,
    createdAt: Date.now(),
    attempts: 0
  });
  
  return otp;
}

/**
 * Create an OTP specifically for admin login
 * @param {string} username - Admin username
 * @returns {string} - Generated OTP
 */
async function generateAdminOTP(username) {
  try {
    // Generate a 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    
    console.log(`Generated OTP for admin ${username}: ${otp}`);
    
    // Store OTP with timestamp specifically for admin login
    otpStore.set(username, {
      otp,
      purpose: 'admin_login',
      createdAt: Date.now(),
      attempts: 0
    });
    
    // Send OTP to admin's email
    await sendOTPEmail(username, otp, 'admin_login');
    
    return {
      success: true, 
      message: 'OTP sent successfully'
    };
  } catch (error) {
    console.error('Error generating admin OTP:', error);
    return {
      success: false,
      message: 'Failed to generate OTP'
    };
  }
}

/**
 * Verify an OTP for a general purpose
 * @param {string} email - User's email 
 * @param {string} otpToVerify - OTP to verify
 * @returns {boolean} - Whether OTP is valid
 */
function verifyOTP(email, otpToVerify) {
  const otpData = otpStore.get(email);
  
  if (!otpData) {
    console.log(`No OTP found for ${email}`);
    return false;
  }
  
  // Check if OTP is expired (10 minutes)
  const now = Date.now();
  const expiryTime = 10 * 60 * 1000; // 10 minutes in milliseconds
  
  if (now - otpData.createdAt > expiryTime) {
    console.log(`OTP for ${email} has expired`);
    otpStore.delete(email);
    return false;
  }
  
  // Update attempts
  otpData.attempts += 1;
  
  // Verify OTP
  const isValid = otpData.otp === otpToVerify;
  
  // If valid or too many attempts, clear the OTP
  if (isValid || otpData.attempts >= 3) {
    otpStore.delete(email);
  } else {
    // Update attempts in store
    otpStore.set(email, otpData);
  }
  
  return isValid;
}

/**
 * Verify an OTP specifically for admin login
 * @param {string} username - Admin username
 * @param {string} otpToVerify - OTP to verify
 * @returns {Promise<boolean>} - Whether OTP is valid
 */
async function verifyAdminOTP(username, otpToVerify) {
  console.log(`Verifying admin OTP for ${username}`);
  
  const otpData = otpStore.get(username);
  
  if (!otpData) {
    console.log(`No OTP found for admin ${username}`);
    return false;
  }
  
  // Trim the OTP to remove any leading/trailing spaces
  const cleanOTP = otpToVerify.trim();
  
  console.log(`Found OTP data:`, {
    purpose: otpData.purpose,
    storedOtp: otpData.otp,
    providedOtp: otpToVerify, // Show original for debugging
    cleanedOtp: cleanOTP, // Show cleaned version
    createdAt: new Date(otpData.createdAt).toISOString(),
    attempts: otpData.attempts
  });
  
  // Check if OTP is expired (10 minutes)
  const now = Date.now();
  const expiryTime = 10 * 60 * 1000; // 10 minutes in milliseconds
  
  if (now - otpData.createdAt > expiryTime) {
    console.log(`OTP for admin ${username} has expired`);
    otpStore.delete(username);
    return false;
  }
  
  // Update attempts
  otpData.attempts += 1;
  
  // Verify OTP using trimmed value
  const isValid = otpData.otp === cleanOTP;
  
  console.log(`Admin OTP verification result: ${isValid ? 'Valid' : 'Invalid'}`);
  
  // If valid or too many attempts, clear the OTP
  if (isValid || otpData.attempts >= 3) {
    otpStore.delete(username);
  } else {
    // Update attempts in store
    otpStore.set(username, otpData);
  }
  
  return isValid;
}

/**
 * Generate OTP for password reset
 * @param {string} email - User's email
 * @returns {Promise<Object>} - Result object
 */
async function generatePasswordResetOTP(email) {
  try {
    // Check if email exists (would need User model)
    // This check would be done in the controller using User.findOne()
    
    // Generate OTP
    const otp = createOTP(email, 'password_reset');
    
    // Send OTP via email
    await sendOTPEmail(email, otp, 'password_reset');
    
    return {
      success: true,
      message: 'Password reset OTP sent successfully'
    };
  } catch (error) {
    console.error('Error generating password reset OTP:', error);
    return {
      success: false,
      message: 'Failed to send password reset OTP'
    };
  }
}

/**
 * Verify password reset OTP
 * @param {string} email - User's email
 * @param {string} otp - OTP to verify
 * @returns {Promise<Object>} - Result object
 */
async function verifyPasswordResetOTP(email, otp) {
  const isValid = verifyOTP(email, otp);
  
  return {
    success: isValid,
    message: isValid ? 'OTP verified successfully' : 'Invalid or expired OTP'
  };
}

module.exports = {
  createOTP,
  verifyOTP,
  generateAdminOTP,
  verifyAdminOTP,
  generatePasswordResetOTP,
  verifyPasswordResetOTP
};
