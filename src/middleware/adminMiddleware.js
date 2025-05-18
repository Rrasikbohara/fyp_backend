const jwt = require('jsonwebtoken');

module.exports = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Admin access denied: No token provided');
      return res.status(401).json({ message: 'Authorization required' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Set the user in the request
    req.user = decoded;
    
    // Check if user is admin
    if (decoded.role !== 'admin' && decoded.role !== 'super_admin') {
      console.log(`Admin access denied: User role is ${decoded.role}`);
      return res.status(403).json({ 
        message: 'Access denied: Admin privileges required',
        error: 'FORBIDDEN',
        currentRole: decoded.role
      });
    }
    
    // Flag to indicate admin status
    req.isAdmin = true;
    console.log('Admin access granted for user:', decoded.id);
    
    next();
  } catch (error) {
    console.error('Admin middleware error:', error.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};