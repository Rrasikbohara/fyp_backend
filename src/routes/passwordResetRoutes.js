const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const { 
  generatePasswordResetOTP, 
  verifyPasswordResetOTP 
} = require('../services/otpService');

// Step 1: Request password reset OTP
router.post('/request-reset', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }
    
    // Generate and send OTP
    const result = await generatePasswordResetOTP(email);
    
    // Always return success to prevent email enumeration
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred. Please try again later.'
    });
  }
});

// Step 2: Verify reset OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }
    
    // Verify OTP
    const result = await verifyPasswordResetOTP(email, otp);
    
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP'
    });
  }
});

// Step 3: Reset password using verified OTP
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    
    if (!email || !otp || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email, OTP and new password are required'
      });
    }
    
    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }
    
    // Verify the OTP again
    const verifyResult = await verifyPasswordResetOTP(email, otp);
    
    if (!verifyResult.success) {
      return res.status(400).json(verifyResult);
    }
    
    // Find the user
    const user = await User.findOne({ email, resetToken: otp });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request'
      });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Update user's password and clear OTP
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
});

module.exports = router;
