const express = require('express');
const router = express.Router();
const BookingGym = require('../models/BookingGym');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// IMPORTANT: Fix the key issue - use adminOrUserMiddleware to allow both
// admin and regular user authentication for specific endpoints
const adminOrUserMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization required' });
    }
    
    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Set the user in the request
    req.user = decoded;
    
    // Add a flag to indicate if admin
    req.isAdmin = decoded.role === 'admin' || decoded.role === 'super_admin';
    
    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Create a new gym booking
router.post('/gym', authMiddleware, async (req, res) => {
  try {
    const { bookingDate, startTime, endTime, duration, workoutType, payment } = req.body;
    
    console.log('Received gym booking request:', req.body);
    
    // Validate required fields
    if (!bookingDate || !startTime || !endTime || !duration || !workoutType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required booking information'
      });
    }
    
    // Calculate proper amount based on workout type
    let baseRate = 100; // Default rate
    let capacity = 10; // Default capacity
    
    // Different rates and capacities based on workout type
    switch(workoutType) {
      case 'Cardio':
        baseRate = 150; // Higher rate for cardio
        capacity = 5;   // Limited equipment
        break;
      case 'Strength':
        baseRate = 130;
        capacity = 8;
        break;
      case 'CrossFit':
      case 'HIIT':
        baseRate = 180; // Premium rate for intensive workouts
        capacity = 6;
        break;
      case 'Yoga':
        baseRate = 120;
        capacity = 12;
        break;
      default:
        baseRate = 100; // General workout
        capacity = 15;
        break;
    }
    
    // Calculate amount
    const amount = baseRate * duration;
    
    // Format date for comparison (YYYY-MM-DD)
    const bookingDateFormatted = new Date(bookingDate).toISOString().split('T')[0];
    
    // FIX: also check user: req.user.id to ensure the conflict is for the same user
    const existingBookingsOfSameType = await BookingGym.findOne({
      user: req.user.id,
      bookingDate: {
        $gte: new Date(`${bookingDateFormatted}T00:00:00.000Z`),
        $lt: new Date(`${bookingDateFormatted}T23:59:59.999Z`)
      },
      workoutType,
      status: { $nin: ['cancelled'] },
      $or: [
        {
          $and: [
            { startTime: { $lt: endTime } },
            { endTime: { $gt: startTime } }
          ]
        }
      ]
    });
    
    if (existingBookingsOfSameType) {
      return res.status(409).json({
        success: false,
        message: `You already have a booking for ${existingBookingsOfSameType.workoutType} during this time (${existingBookingsOfSameType.startTime} - ${existingBookingsOfSameType.endTime})`
      });
    }
    
    // Create booking with the calculated amount
    const booking = new BookingGym({
      user: req.user.id,
      bookingDate: new Date(bookingDate),
      startTime,
      endTime,
      duration,
      workoutType,
      payment: {
        amount: amount, // Use calculated amount based on workout type
        method: payment?.method || 'cash',
        // FIX: Always set payment status to pending initially, regardless of method
        status: 'pending',
        transactionId: payment?.transactionId || null
      },
      // FIX: Always set booking status to pending initially
      status: 'pending',
      type: 'gym'
    });
    
    const savedBooking = await booking.save();
    
    // Populate user information
    const populatedBooking = await BookingGym.findById(savedBooking._id)
      .populate('user', 'name email')
      .lean();
    
    res.status(201).json({
      success: true,
      message: `${workoutType} session booked successfully`,
      booking: populatedBooking
    });
  } catch (error) {
    console.error('Error creating gym booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create gym booking',
      error: error.message
    });
  }
});

// Get all bookings for the current user
router.get('/user', authMiddleware, async (req, res) => {
  try {
    const bookings = await BookingGym.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .lean();
      
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ message: 'Failed to fetch bookings' });
  }
});

// Get all bookings (admin only)
router.get('/admin', adminMiddleware, async (req, res) => {
  try {
    // Detailed logging for debugging
    console.log('Admin bookings request received');
    console.log('User from token:', {
      id: req.user.id,
      role: req.user.role,
      username: req.user.username
    });
    
    // More explicit role check
    const isAdmin = req.user.role === 'admin';
    console.log('Is admin?', isAdmin);
    
    if (!isAdmin) {
      console.log('Access denied: User role is not admin');
      return res.status(403).json({ 
        message: 'Access denied: Admin privileges required',
        error: 'FORBIDDEN',
        currentRole: req.user.role
      });
    }
    
    // Get all bookings with user details
    const bookings = await BookingGym.find()
      .populate('user', 'name email phoneNumber')
      .sort({ createdAt: -1 })
      .lean();
    
    console.log(`Found ${bookings.length} bookings`);
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching admin bookings:', error);
    res.status(500).json({ message: 'Failed to fetch bookings' });
  }
});

// Update booking status
router.patch('/:id/status', adminOrUserMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status value' 
      });
    }
    
    const booking = await BookingGym.findById(id);
    
    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: 'Booking not found' 
      });
    }
    
    // IMPORTANT: Only allow update if user is admin OR the booking owner
    if (!req.isAdmin && booking.user.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to update this booking' 
      });
    }
    
    // Apply some business rules based on user role
    if (!req.isAdmin && req.user.role === 'user') {
      // Regular users can only cancel their own bookings, not mark as confirmed/completed
      if (status !== 'cancelled') {
        return res.status(403).json({
          success: false,
          message: 'Users can only cancel bookings. Other status changes require admin privileges.'
        });
      }
    }
    
    // Update the booking status
    booking.status = status;
    
    // If an admin is setting status to 'completed', automatically mark payment as completed too
    if (req.isAdmin && status === 'completed' && booking.payment.status !== 'completed') {
      booking.payment.status = 'completed';
      console.log('Payment status automatically set to completed');
    }
    
    await booking.save();
    
    res.json({ 
      success: true, 
      message: `Booking status updated to ${status}`, 
      booking 
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Update payment status - Fix to use adminOrUserMiddleware instead of adminMiddleware
router.patch('/:id/payment', adminOrUserMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, transactionId } = req.body;
    
    // Check if user is admin
    if (!req.isAdmin) {
      console.log(`Payment update denied: User ${req.user.id} is not admin`);
      return res.status(403).json({ 
        success: false,
        message: 'Access denied: Only admins can update payment status' 
      });
    }
    
    const updateData = {
      'payment.status': status
    };
    
    if (transactionId) {
      updateData['payment.transactionId'] = transactionId;
    }
    
    // Also update booking status if payment completed
    if (status === 'completed') {
      updateData.status = 'confirmed';
    }
    
    const booking = await BookingGym.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('user', 'name email');
    
    if (!booking) {
      return res.status(404).json({ 
        success: false,
        message: 'Booking not found' 
      });
    }
    
    console.log(`Payment status updated to ${status} for booking ${id}`);
    res.json({
      success: true,
      message: 'Payment status updated',
      booking
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update payment status',
      error: error.message 
    });
  }
});

// Delete gym booking endpoint (admin or user with cancelled/completed booking)
router.delete('/:id', adminOrUserMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await BookingGym.findById(id);
    
    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: 'Booking not found' 
      });
    }
    
    // Check permissions: admin can delete any booking, user can only delete their own cancelled bookings
    const isAdmin = req.isAdmin;
    const isOwner = booking.user.toString() === req.user.id;
    const isCancelled = booking.status === 'cancelled' || booking.status === 'completed';
    
    if (!isAdmin && (!isOwner || !isCancelled)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this booking or booking is not cancelled/completed'
      });
    }
    
    // Delete the booking
    await BookingGym.findByIdAndDelete(id);
    
    res.json({ 
      success: true, 
      message: 'Booking deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete booking',
      error: error.message 
    });
  }
});

// Bulk delete cancelled bookings (admin only)
router.delete('/cancelled/all', adminMiddleware, async (req, res) => {
  try {
    const result = await BookingGym.deleteMany({ status: 'cancelled' });
    
    res.json({ 
      success: true, 
      message: `${result.deletedCount} cancelled bookings deleted successfully` 
    });
  } catch (error) {
    console.error('Error bulk deleting cancelled bookings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete cancelled bookings',
      error: error.message 
    });
  }
});

module.exports = router;
