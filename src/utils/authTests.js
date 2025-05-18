const { authMiddleware } = require('../middleware/authMiddleware');
const { generateTestToken } = require('./testAuth');

/**
 * Simple test function to verify the authMiddleware works as expected
 */
function testAuthMiddleware() {
  console.log('Testing auth middleware...');
  
  // Create mock request with a valid token
  const userId = '60d5ec9c1c9d440000c1a1b5'; // Example MongoDB ObjectId
  const token = generateTestToken(userId);
  
  const req = {
    headers: {
      authorization: `Bearer ${token}`
    }
  };
  
  // Create mock response
  const res = {
    status: function(code) {
      console.log('Response status:', code);
      return this;
    },
    json: function(data) {
      console.log('Response data:', data);
      return this;
    }
  };
  
  // Create mock next function
  const next = () => {
    console.log('Next function called - this means middleware passed!');
    console.log('User ID in request:', req.user?.id);
  };
  
  // Test the middleware
  try {
    authMiddleware(req, res, next);
    console.log('Auth middleware test completed');
  } catch (error) {
    console.error('Auth middleware test failed:', error);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testAuthMiddleware();
}

module.exports = {
  testAuthMiddleware
};
