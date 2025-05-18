const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Get system status
router.get('/', async (req, res) => {
  try {
    // Check MongoDB connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Log environment variables (redacted for security) for debugging
    console.log('System status check:');
    console.log('- MongoDB:', dbStatus);
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- API running at:', req.protocol + '://' + req.get('host'));
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      dbStatus,
      apiVersion: '1.0',
    });
  } catch (error) {
    console.error('Error checking system status:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Check database health
router.get('/db-health', async (req, res) => {
  try {
    // Perform a simple query to check DB connection
    const timeout = 5000; // 5 second timeout
    const result = await Promise.race([
      mongoose.connection.db.admin().ping(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database ping timeout')), timeout)
      )
    ]);
    
    res.json({ 
      status: 'ok',
      connected: true,
      latency: result.ok === 1 ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(500).json({ 
      status: 'error', 
      connected: false,
      message: error.message 
    });
  }
});

module.exports = router;
