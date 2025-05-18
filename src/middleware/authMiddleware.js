const jwt = require('jsonwebtoken');

// Simple synchronous auth middleware without any async/await
function authMiddleware(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        message: "Authorization header missing or invalid",
        success: false
      });
    }
    
    // Extract the token
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        message: "No token provided",
        success: false
      });
    }

    // Use synchronous verification to avoid Promise issues
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'yoursecretkey');
    
    if (!decoded || !decoded.id) {
      console.log('Invalid decoded token format:', decoded);
      return res.status(401).json({ 
        message: "Invalid token format",
        success: false
      });
    }
    
    // Set user info in request
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ 
      message: "Authentication failed: " + error.message,
      success: false
    });
  }
}

// Export as both an object and direct function for compatibility
module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;