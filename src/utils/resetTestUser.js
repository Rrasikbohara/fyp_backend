/**
 * This utility script resets or creates a test user with a known password
 * Useful for debugging authentication issues
 */
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
require('dotenv').config();

async function resetTestUser() {
  try {
    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState === 0) {
      console.log('Connecting to MongoDB...');
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('Connected to MongoDB');
    }

    // Check if test user exists
    const testEmail = 'testuser@example.com';
    let user = await User.findOne({ email: testEmail });

    // Define password - use a known simple password for testing
    const password = '123456';
    const hashedPassword = await bcrypt.hash(password, 10);

    if (user) {
      // Update existing user
      user.password = hashedPassword;
      await user.save();
      console.log('Test user password reset successfully');
    } else {
      // Create new test user
      user = new User({
        name: 'Test User',
        email: testEmail,
        phoneNumber: '1234567890',
        password: hashedPassword,
        role: 'user'
      });
      await user.save();
      console.log('Test user created successfully');
    }

    console.log('Test User Details:');
    console.log('Email:', testEmail);
    console.log('Password:', password);
    console.log('User ID:', user._id.toString());

    return user;
  } catch (error) {
    console.error('Error resetting test user:', error);
    throw error;
  } finally {
    // Only disconnect if we connected in this function
    if (mongoose.connection.readyState === 1 && process.env.NODE_ENV !== 'production') {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  }
}

// Execute directly if this file is run directly
if (require.main === module) {
  resetTestUser()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = resetTestUser;
