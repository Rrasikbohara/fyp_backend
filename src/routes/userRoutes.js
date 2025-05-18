const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/User');
const bcrypt = require('bcrypt');

// Public routes
router.post('/signup', async (req, res) => {
  try {
    console.time('SignupRequest'); // Start timing the request
    console.log('Signup request received:', req.body); // Log the incoming request

    const { name, email, phoneNumber, password } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('Signup failed: Email already exists');
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Check if phone number already exists
    const existingPhone = await User.findOne({ phoneNumber });
    if (existingPhone) {
      console.log('Signup failed: Phone number already exists');
      return res.status(400).json({ message: 'User with this phone number already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      name,
      email,
      phoneNumber,
      password: hashedPassword,
      isActive: false, // Set to inactive until verified
    });

    const savedUser = await newUser.save();

    // Generate and send OTP
    const otpService = require('../services/otpService');
    const otp = otpService.createOTP(email);
    const emailService = require('../services/emailService');
    await emailService.sendOTPEmail(email, otp, 'account_verification');

    console.log('User created successfully:', savedUser);
    console.timeEnd('SignupRequest'); // End timing the request

    res.status(201).json({
      success: true,
      message: 'User created successfully. Please verify your account.',
      userId: savedUser._id,
    });
  } catch (error) {
    console.error('Error during signup:', error); // Log the error
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

router.post('/signin', userController.signin);

router.post('/verify-otp', async (req, res) => {
  try {
    const { userId, otp } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const otpService = require('../services/otpService');
    const isValid = otpService.verifyOTP(user.email, otp);

    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    user.isActive = true; // Mark user as verified
    await user.save();

    res.status(200).json({ success: true, message: 'Account verified successfully' });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ success: false, message: 'Failed to verify OTP' });
  }
});

// Protected routes
router.get('/profile', authMiddleware, userController.getCurrentUser);
router.post('/change-password', authMiddleware, userController.changePassword);

// Add new endpoint to get user's bookings
router.get('/profile/bookings', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Import models here to avoid circular dependencies
    const BookingGym = require('../models/BookingGym');
    const BookingTrainer = require('../models/BookingTrainer');
    
    // Fetch gym bookings
    const gymBookings = await BookingGym.find({ user: userId })
      .sort({ bookingDate: -1 });
    
    // Fetch trainer bookings
    const trainerBookings = await BookingTrainer.find({ user: userId })
      .populate('trainer', 'name specialization')
      .sort({ sessionDate: -1 });
    
    res.json({
      success: true,
      gymBookings,
      trainerBookings
    });
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch bookings', 
      error: error.message 
    });
  }
});

module.exports = router;