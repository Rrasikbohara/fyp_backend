const User = require('../models/User');
const bcrypt = require('bcrypt');

/**
 * Utility function to manually reset a user's password
 * Useful for administrative purposes or when a user has issues with password reset
 * 
 * @param {string} email - The user's email
 * @param {string} newPassword - The new password to set
 * @returns {Promise<object>} - Result object with success status and message
 */
async function manualPasswordReset(email, newPassword) {
  try {
    // Input validation
    if (!email || !newPassword) {
      return { success: false, message: 'Email and new password are required' };
    }
    
    if (newPassword.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters long' };
    }
    
    // Find the user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update the user's password
    user.password = hashedPassword;
    
    // Clear any reset tokens
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    
    // Save the user with the new password
    await user.save();
    
    return { 
      success: true, 
      message: 'Password has been reset successfully',
      userId: user._id
    };
  } catch (error) {
    console.error('Manual password reset error:', error);
    return { success: false, message: error.message };
  }
}

module.exports = { manualPasswordReset };
