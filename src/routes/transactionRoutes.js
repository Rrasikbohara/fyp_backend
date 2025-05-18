const express = require('express');
const router = express.Router();
const { getUserTransactions } = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');

// Test route that doesn't require authentication
router.get('/transactions-test', (req, res) => {
  res.json({ message: "Transaction routes are working properly" });
});

// Get all user transactions with proper error handling
router.get('/user/transactions', protect, (req, res, next) => {
  try {
    // Log request details for debugging
    console.log('Transaction request received with user:', req.user?.id);
    getUserTransactions(req, res, next);
  } catch (error) {
    console.error('Error in transaction route handler:', error);
    res.status(500).json({ message: 'Internal server error in transaction processing' });
  }
});

// Add Khalti webhook handler
router.post('/payment-webhook/khalti', async (req, res) => {
  try {
    const payload = req.body;
    console.log('Received Khalti webhook:', payload);
    
    // Validate webhook signature (in production)
    // const isValid = validateKhaltiWebhook(req.headers, payload);
    // if (!isValid) return res.status(401).send('Invalid signature');
    
    // Extract data from webhook
    const { token, status, booking_id, booking_type = 'gym' } = payload;
    
    if (!token || !booking_id) {
      return res.status(400).send('Missing required data');
    }
    
    // Determine which model to use
    const BookingModel = booking_type === 'trainer' ? 
      require('../models/BookingTrainer') : 
      require('../models/BookingGym');
    
    // Find and update the booking
    const booking = await BookingModel.findById(booking_id);
    if (!booking) {
      console.error(`Booking not found: ${booking_id}`);
      return res.status(404).send('Booking not found');
    }
    
    // Update booking payment status
    booking.paymentStatus = status === 'Completed' ? 'completed' : 'failed';
    await booking.save();
    
    console.log(`Updated booking ${booking_id} payment status to ${booking.paymentStatus}`);
    return res.status(200).send('Webhook processed');
  } catch (error) {
    console.error('Error processing Khalti webhook:', error);
    return res.status(500).send('Error processing webhook');
  }
});

module.exports = router;
