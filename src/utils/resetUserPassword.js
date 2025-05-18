/**
 * This utility script resets the password for a specific user
 * Run with: node src/utils/resetUserPassword.js
 */
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
require('dotenv').config();

// Email to search for - CHANGE THIS to the user email you want to reset
const EMAIL_TO_RESET = 'imrajesh2005@gmail.com';
// New password to set - CHANGE THIS to desired password
const NEW_PASSWORD = '111111';

async function resetUserPassword() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find user by email
    console.log(`Looking for user with email: ${EMAIL_TO_RESET}`);
    const user = await User.findOne({ email: EMAIL_TO_RESET });

    if (!user) {
      console.error('User not found!');
      process.exit(1);
    }

    console.log(`User found: ${user.name} (${user._id})`);
    console.log('Resetting password...');

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);

    // Update user's password
    user.password = hashedPassword;
    await user.save();

    console.log('Password reset successfully!');
    console.log('User can now login with:');
    console.log(`Email: ${EMAIL_TO_RESET}`);
    console.log(`Password: ${NEW_PASSWORD}`);

    // Test password compare to verify it works
    const isMatch = await bcrypt.compare(NEW_PASSWORD, user.password);
    console.log(`Password verification test: ${isMatch ? 'PASSED' : 'FAILED'}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the function
resetUserPassword()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
