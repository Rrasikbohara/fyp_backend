const jwt = require('jsonwebtoken');

/**
 * Generate a JWT for user authentication
 * @param {Object} user - User object with id and role
 * @returns {String} JWT token
 */
const generateUserToken = (user) => {
  return jwt.sign(
    {
      id: user._id || user.id,
      email: user.email,
      role: user.role || 'user',
      type: 'user_token'
    },
    process.env.JWT_SECRET || 'yoursecretkey',
    { expiresIn: '7d' } // User tokens expire in 7 days
  );
};

/**
 * Generate a JWT for admin authentication
 * @param {Object} admin - Admin object with id and role
 * @returns {String} JWT token
 */
const generateAdminToken = (admin) => {
  return jwt.sign(
    {
      id: admin._id || admin.id,
      username: admin.username,
      role: admin.role || 'admin',
      type: 'admin_token'
    },
    process.env.JWT_SECRET || 'yoursecretkey',
    { expiresIn: '1d' } // Admin tokens expire in 1 day for security
  );
};

/**
 * Generate a temporary token for OTP verification
 * @param {Object} admin - Admin object
 * @returns {String} Temporary JWT token
 */
const generateTempAdminToken = (admin) => {
  return jwt.sign(
    {
      id: admin._id || admin.id,
      username: admin.username,
      pendingVerification: true,
      type: 'temp_admin_token'
    },
    process.env.JWT_SECRET || 'yoursecretkey',
    { expiresIn: '5m' } // Temporary token expires in 5 minutes
  );
};

// Verify token (for testing)
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'yoursecretkey');
    return decoded;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
};

// Generate refresh token with longer expiry
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.REFRESH_TOKEN_SECRET || 'refreshsecret',
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
  );
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET || 'refreshsecret');
  } catch (error) {
    console.error('Refresh token verification error:', error.message);
    throw error;
  }
};

// For setting auth cookies securely (optional)
const setTokenCookie = (res, token, name = 'token') => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.cookie(name, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  });
};

module.exports = {
  generateUserToken,
  generateAdminToken,
  generateTempAdminToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  setTokenCookie
};