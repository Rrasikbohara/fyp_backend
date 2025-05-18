const jwt = require('jsonwebtoken');

/**
 * Test utility to generate a valid JWT token without requiring the full auth service
 * Useful for debugging authentication issues directly
 */

function generateTestToken(userId, role = 'user', name = 'Test User') {
  // Use the same secret key as defined in your environment
  const secret = process.env.JWT_SECRET || 'yoursecretkey';
  
  // Generate a token with the same structure as your auth service
  return jwt.sign(
    {
      id: userId,
      role: role,
      name: name
    },
    secret,
    { expiresIn: '1h' } // Short expiry to avoid security issues when testing
  );
}

/**
 * Test function to verify a token directly
 */
function verifyTestToken(token) {
  try {
    const secret = process.env.JWT_SECRET || 'yoursecretkey';
    const decoded = jwt.verify(token, secret);
    console.log('Token is valid:', decoded);
    return true;
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return false;
  }
}

// Example usage (uncomment to test)
/*
const testId = '60d5ec9c1c9d440000c1a1b5'; // Example MongoDB ObjectId
const token = generateTestToken(testId);
console.log('Generated test token:', token);
const isValid = verifyTestToken(token);
console.log('Token verified:', isValid);
*/

module.exports = {
  generateTestToken,
  verifyTestToken
};
