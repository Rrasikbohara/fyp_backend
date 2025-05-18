const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { generateAdminOTP } = require('../services/otpService');

/**
 * Configure email transporter
 */
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

/**
 * Generate OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP via email
 */
const sendOTP = async (email, otp) => {
  try {
    // For testing, allow bypassing actual email sending
    if (process.env.NODE_ENV === 'development' && process.env.BYPASS_EMAIL === 'true') {
      console.log(`[DEV MODE] OTP for ${email}: ${otp}`);
      return true;
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@gymmanagement.com',
      to: email,
      subject: 'Your Admin Login OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Admin Login Verification</h2>
          <p>Your one-time password for admin login is:</p>
          <h1 style="font-size: 36px; letter-spacing: 5px; color: #4338CA;">${otp}</h1>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`OTP sent successfully to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return false;
  }
};

// Function to generate a token for admin
const generateAdminToken = (admin) => {
  return jwt.sign(
    { 
      id: admin._id,
      username: admin.username,
      role: admin.role || 'admin',
      type: 'admin_auth'
    }, 
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Function to generate a temporary token for OTP verification
const generateTempToken = (username) => {
  return jwt.sign(
    { 
      username,
      type: 'admin_temp'
    }, 
    process.env.JWT_SECRET,
    { expiresIn: '10m' }
  );
};

// Admin sign in controller
exports.signin = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log(`Admin login attempt for username: ${username}`);
    
    // Find admin by username
    const admin = await Admin.findOne({ username });
    
    if (!admin) {
      console.log(`Login failed: Admin ${username} not found`);
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }
    
    // Verify password
    const isMatch = await bcrypt.compare(password, admin.password);
    
    if (!isMatch) {
      console.log(`Login failed: Invalid password for ${username}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }
    
    // Generate OTP for two-factor authentication
    console.log(`Generating OTP for admin: ${username}`);
    await generateAdminOTP(username);
    
    // Generate temporary token for OTP verification
    const tempToken = generateTempToken(username);
    
    return res.status(200).json({
      success: true,
      requiresOTP: true,
      message: 'OTP sent to your email',
      tempToken
    });
    
  } catch (error) {
    console.error('Admin signin error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// Export token generation functions for use in routes
exports.generateAdminToken = generateAdminToken;
exports.generateTempToken = generateTempToken;

/**
 * Verify OTP for admin login
 */
exports.verifyOTP = async (req, res) => {
  try {
    const { username, otp, tempToken } = req.body;
    
    // Validate inputs
    if (!username || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and OTP are required' 
      });
    }
    
    // Validate temp token
    try {
      const decoded = jwt.verify(tempToken, process.env.JWT_SECRET || 'fallbacksecretkey');
      
      if (!decoded.tempAuth || decoded.username !== username) {
        return res.status(401).json({
          success: false,
          message: 'Invalid session'
        });
      }
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Session expired, please login again'
      });
    }
    
    // Verify OTP
    const verifyResult = await verifyAdminLoginOTP(username, otp);
    
    if (!verifyResult.success) {
      return res.status(401).json({
        success: false,
        message: verifyResult.message
      });
    }
    
    const admin = verifyResult.admin;
    
    // Generate admin token for full access
    const token = jwt.sign(
      { 
        id: admin._id, 
        username: admin.username, 
        role: admin.role || 'admin',
        type: 'admin_token' 
      },
      process.env.JWT_SECRET || 'fallbacksecretkey',
      { expiresIn: '1d' }
    );
    
    // Update last login time
    admin.lastLogin = new Date();
    await admin.save();
    
    res.status(200).json({
      success: true,
      message: 'Admin authenticated successfully',
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        role: admin.role || 'admin'
      }
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during OTP verification', 
      error: error.message 
    });
  }
};

/**
 * Setup and fix missing password errors
 */
exports.setupAdmin = async () => {
  const Admin = require('../models/Admin');
  try {
    console.log('Initializing admin accounts...');
    
    // Check for default admin
    await Admin.ensureDefaultAdmin();
    
    // Check for gym123 admin
    const gym123Admin = await Admin.findOne({ username: 'gym123' });
    if (gym123Admin && !gym123Admin.password) {
      console.log('Fixing password for gym123 admin...');
      const salt = await bcrypt.genSalt(10);
      gym123Admin.password = await bcrypt.hash('gym123', salt);
      await gym123Admin.save();
      console.log('Password set for gym123 admin!');
    }
    
    console.log('Admin setup complete!');
  } catch (error) {
    console.error('Error setting up admin accounts:', error);
  }
};

// Add a script to run the setup when the server starts
require('../adminSetup.js');
