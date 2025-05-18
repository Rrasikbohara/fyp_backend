const express = require('express');
const router = express.Router();
const Trainer = require('../models/Trainer');
const BookingTrainer = require('../models/BookingTrainer');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Define adminOrUserMiddleware at the top of the file before using it
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
    
    // Add a flag to indicate if admin and grant full permissions
    if (decoded.role === 'admin' || decoded.role === 'super_admin') {
      req.isAdmin = true;
      console.log(`Admin user detected (${decoded.role}), granting full permissions`);
    } else {
      req.isAdmin = false;
      console.log(`Regular user detected (${decoded.role}), limited permissions`);
    }
    
    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

router.post('/create', async (req, res) => {
  try {
    const trainer = new Trainer({
      name: req.body.name,
      email: req.body.email,
      specialization: req.body.specialization,
      experience: req.body.experience,
      rate: req.body.rate,
      availability: req.body.availability,
      bio: req.body.bio
    });

    await trainer.save();
    
    res.status(201).json({
      message: 'Trainer created successfully',
      trainer: {
        id: trainer._id,
        name: trainer.name,
        specialization: trainer.specialization,
        rate: trainer.rate
      }
    });
  } catch (error) {
    res.status(400).json({ 
      message: 'Error creating trainer',
      error: error.message 
    });
  }
});

// Delete a trainer by ID
router.delete('/:id', async (req, res) => {
  try {
    const trainer = await Trainer.findById(req.params.id);
    if (!trainer) return res.status(404).json({ message: 'Trainer not found' });

    await trainer.remove();
    res.status(200).json({ message: 'Trainer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting trainer', error: error.message });
  }
});

// Delete all trainers
router.delete('/', async (req, res) => {
  try {
    await Trainer.deleteMany();
    res.status(200).json({ message: 'All trainers deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting trainers', error: error.message });
  }
});

// Get all trainers
router.get('/', async (req, res) => {
  try {
    const trainers = await Trainer.find().select('-__v');
    res.json(trainers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching trainers', error: error.message });
  }
});

// Enhanced book a trainer route
router.post('/:id/book', authMiddleware, async (req, res) => {
  console.log('🔵 Trainer booking endpoint called');
  console.log('Request body:', req.body);
  console.log('User from token:', req.user);
  console.log('Trainer ID:', req.params.id);

  try {
    // Validate trainer exists
    const trainer = await Trainer.findById(req.params.id);
    if (!trainer) {
      console.error('❌ Trainer not found with ID:', req.params.id);
      return res.status(404).json({ message: 'Trainer not found' });
    }
    console.log('✅ Found trainer:', trainer.name);
    
    // Basic request validation
    const { duration, sessionDate, paymentMethod, startHour, sessionType = 'personal' } = req.body;
    
    if (!duration || !sessionDate || !paymentMethod) {
      console.error('❌ Missing required fields');
      return res.status(400).json({ message: 'Duration, session date, and payment method are required' });
    }
    
    // Parse data
    const parsedDuration = Number(duration);
    const bookingDate = new Date(sessionDate);
    const amount = Number(trainer.rate) * parsedDuration;
    
    // Extract start hour or use default of 9 AM
    const sessionStartHour = startHour ? Number(startHour) : 9;
    
    // Format time string (required field)
    const timeStr = `${sessionStartHour}:00 - ${sessionStartHour + parsedDuration}:00`;
    
    // Check if the trainer is available at the requested time
    if (!trainer.isAvailableAt(bookingDate, sessionStartHour, parsedDuration)) {
      console.error('❌ Trainer is not available at the requested time');
      return res.status(400).json({ 
        message: 'Trainer is not available at this time. Please select another time or trainer.' 
      });
    }
    
    // Create booking object
    const booking = new BookingTrainer({
      user: req.user.id,
      trainer: trainer._id,
      duration: parsedDuration,
      sessionDate: bookingDate,
      startHour: sessionStartHour, // Store the start hour
      amount,
      paymentMethod,
      status: 'pending', // Always set status to pending initially
      paymentStatus: 'pending', // Always set payment status to pending initially
      sessionType: sessionType, // Now properly defined
      time: timeStr // Add the missing required field
    });
    
    console.log('📝 Created booking object:', JSON.stringify(booking, null, 2));
    
    // Update trainer availability for this specific time slot
    trainer.bookTimeSlot(bookingDate, sessionStartHour, parsedDuration);
    
    // Update trainer earnings if payment is already completed
    if (paymentMethod === 'khalti') {
      trainer.earnings = (trainer.earnings || 0) + amount;
    }
    
    // Save booking and trainer
    const savedBooking = await booking.save();
    await trainer.save();
    
    console.log('✅ Booking saved with ID:', savedBooking._id);
    
    // Get populated booking
    const populatedBooking = await BookingTrainer.findById(savedBooking._id)
      .populate('trainer', 'name rate earnings')
      .populate('user', 'name email')
      .lean();
    
    // Return success response
    return res.status(201).json({
      message: 'Booking created successfully',
      booking: populatedBooking
    });
  } catch (error) {
    console.error('❌ Error creating booking:', error);
    return res.status(500).json({
      message: 'Booking failed',
      error: error.message
    });
  }
});

// New endpoint to get trainer availability
router.get('/:id/availability', async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;
    
    // Get the trainer
    const trainer = await Trainer.findById(id);
    if (!trainer) {
      return res.status(404).json({ message: 'Trainer not found' });
    }
    
    // Parse the date or use today
    const checkDate = date ? new Date(date) : new Date();
    checkDate.setHours(0, 0, 0, 0); // Normalize to start of day
    
    // Get all booked slots for the day
    const bookedSlots = trainer.availabilitySlots
      .filter(slot => {
        const slotDate = new Date(slot.date);
        slotDate.setHours(0, 0, 0, 0);
        return slotDate.getTime() === checkDate.getTime() && slot.isBooked;
      })
      .map(slot => ({
        startTime: slot.startTime,
        endTime: slot.endTime
      }));
    
    // Create availability map for each hour of the working day
    const availabilityMap = [];
    for (let hour = trainer.workingHours.start; hour < trainer.workingHours.end; hour++) {
      const isAvailable = trainer.isAvailableAt(checkDate, hour, 1);
      availabilityMap.push({
        hour,
        timeDisplay: `${hour}:00 - ${hour + 1}:00`,
        available: isAvailable
      });
    }
    
    res.json({
      trainerId: trainer._id,
      trainerName: trainer.name,
      date: checkDate,
      workingHours: trainer.workingHours,
      bookedSlots,
      availability: availabilityMap,
      overallAvailability: trainer.availability
    });
  } catch (error) {
    console.error('Error fetching trainer availability:', error);
    res.status(500).json({ message: 'Error fetching trainer availability' });
  }
});

router.patch('/bookings/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const booking = await BookingTrainer.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { status: 'cancelled' },
      { new: true }
    );

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    res.json({
      message: 'Booking cancelled successfully',
      booking
    });
  } catch (error) {
    res.status(500).json({ message: 'Error cancelling booking' });
  }
});

// Add a route to cancel a booking
router.patch('/bookings/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the booking
    const booking = await BookingTrainer.findOne({
      _id: id,
      user: req.user.id
    });
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or you are not authorized to cancel it'
      });
    }
    
    // Check if the booking is in a state that can be cancelled
    if (booking.status === 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel confirmed bookings. Please contact customer support.'
      });
    }
    
    if (booking.status === 'cancelled' || booking.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: `Booking is already ${booking.status}`
      });
    }
    
    // Update the booking status to cancelled
    booking.status = 'cancelled';
    await booking.save();
    
    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      booking
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking',
      error: error.message
    });
  }
});

router.get('/bookings', authMiddleware, async (req, res) => {
  try {
    console.log('Fetching trainer bookings for user:', req.user.id); // Debug log

    const bookings = await BookingTrainer.find({ user: req.user.id })
      .populate('trainer', 'name specialization availability')
      .populate('user', 'name email phoneNumber') // Ensure user is populated
      .lean();

    console.log('Fetched bookings:', bookings); // Debug log
    res.status(200).json(bookings);
  } catch (error) {
    console.error('Error fetching trainer bookings:', error); // Debug log
    res.status(500).json({ message: 'Error fetching trainer bookings' });
  }
});

// Update trainer booking status
router.patch('/bookings/:id/status', adminOrUserMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate status
    if (!['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status value' 
      });
    }
    
    // Make sure the ID is valid to prevent server errors
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format'
      });
    }
    
    const booking = await BookingTrainer.findById(id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    // Check permissions: only admin or booking owner can update
    const isAdmin = req.isAdmin;
    const isOwner = booking.user.toString() === req.user.id;
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this booking'
      });
    }
    
    // Users can only cancel their bookings
    if (!isAdmin && status !== 'cancelled') {
      return res.status(403).json({
        success: false,
        message: 'Users can only cancel bookings. Other status changes require admin privileges.'
      });
    }
    
    // Update the booking status
    booking.status = status;
    
    // If an admin is setting status to 'completed', automatically mark payment as completed too
    if (isAdmin && status === 'completed') {
      booking.paymentStatus = 'completed';
      console.log('Payment status automatically set to completed');
    }
    
    await booking.save();
    
    // Return populated booking for better client response
    const updatedBooking = await BookingTrainer.findById(id)
      .populate('trainer', 'name specialization rate')
      .populate('user', 'name email')
      .lean();
    
    res.json({
      success: true,
      message: `Booking status updated to ${status}`,
      booking: updatedBooking
    });
  } catch (error) {
    console.error('Error updating trainer booking status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// New endpoint for updating booking payment status
router.patch('/bookings/:id/payment', adminOrUserMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;
    
    // Validate payment status
    if (!['pending', 'completed', 'failed', 'refunded'].includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status value'
      });
    }
    
    const booking = await BookingTrainer.findById(id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    // Check permissions: only admin can update payment status
    // or owner can update only if paying (changing from pending to completed)
    const isAdmin = req.isAdmin;
    const isOwner = booking.user.toString() === req.user.id;
    const isPayingOwner = isOwner && booking.paymentStatus === 'pending' && paymentStatus === 'completed';
    
    if (!isAdmin && !isPayingOwner) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update payment status'
      });
    }
    
    // Update payment status
    booking.paymentStatus = paymentStatus;
    
    // If payment is completed and booking was pending, automatically confirm booking
    if (paymentStatus === 'completed' && booking.status === 'pending') {
      booking.status = 'confirmed';
      console.log('Booking status automatically set to confirmed');
    }
    
    await booking.save();
    
    // If payment completed, update trainer earnings
    if (paymentStatus === 'completed') {
      const trainer = await Trainer.findById(booking.trainer);
      if (trainer) {
        trainer.earnings = (trainer.earnings || 0) + booking.amount;
        await trainer.save();
        console.log(`Updated trainer earnings: +${booking.amount}`);
      }
    }
    
    res.json({
      success: true,
      message: `Payment status updated to ${paymentStatus}`,
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

// Get all trainer bookings for admin
router.get('/admin/bookings', adminMiddleware, async (req, res) => {
  try {
    console.log('Admin trainer bookings request received');
    
    // Verify admin privileges in the token
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      console.log('Access denied: User role is not admin');
      return res.status(403).json({
        message: 'Access denied: Admin privileges required',
        error: 'FORBIDDEN',
        currentRole: req.user.role
      });
    }
    
    // Get all trainer bookings with user and trainer details
    const bookings = await BookingTrainer.find()
      .populate('user', 'name email phoneNumber')
      .populate('trainer', 'name specialization rate')
      .sort({ createdAt: -1 })
      .lean();
    
    console.log(`Found ${bookings.length} trainer bookings`);
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching admin trainer bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trainer bookings',
      error: error.message
    });
  }
});

// Delete booking endpoint for admin
router.delete('/bookings/:id', adminOrUserMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await BookingTrainer.findById(id);
    
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
    await BookingTrainer.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: 'Booking deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting trainer booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete booking',
      error: error.message
    });
  }
});

// Bulk delete cancelled bookings (admin only)
router.delete('/bookings/cancelled/all', adminMiddleware, async (req, res) => {
  try {
    const result = await BookingTrainer.deleteMany({ status: 'cancelled' });
    
    res.json({
      success: true,
      message: `${result.deletedCount} cancelled bookings deleted successfully`
    });
  } catch (error) {
    console.error('Error bulk deleting cancelled trainer bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete cancelled bookings',
      error: error.message
    });
  }
});

// Add this route to support transactions page
router.get('/user-bookings', authMiddleware, async (req, res) => {
  try {
    console.log('Fetching trainer bookings for transactions, user:', req.user.id);

    // Get bookings with fully populated trainer data
    const bookings = await BookingTrainer.find({ user: req.user.id })
      .sort('-createdAt')
      .populate({
        path: 'trainer',
        select: 'firstName lastName name specialization rate profileImage'
      })
      .lean();

    // Also get the trainers directly to ensure we have their data
    const trainerIds = bookings
      .filter(booking => booking.trainer && booking.trainer._id)
      .map(booking => booking.trainer._id);
    
    const trainers = await Trainer.find({ _id: { $in: trainerIds } })
      .select('firstName lastName name')
      .lean();
    
    // Create a map of trainers by ID for quick lookup
    const trainerMap = {};
    trainers.forEach(trainer => {
      trainerMap[trainer._id.toString()] = trainer;
    });

    console.log(`Found ${bookings.length} trainer bookings for transactions`);
    
    // Format bookings for transactions page
    const formattedBookings = bookings.map(booking => {
      // Get trainer name with improved fallback handling
      let trainerName = booking.trainerNameSnapshot || "Fitness Coach";
      
      if (booking.trainer) {
        if (booking.trainer.firstName && booking.trainer.lastName) {
          trainerName = `${booking.trainer.firstName} ${booking.trainer.lastName}`;
        } else if (booking.trainer.name) {
          trainerName = booking.trainer.name;
        } else if (booking.trainer._id && trainerMap[booking.trainer._id.toString()]) {
          const t = trainerMap[booking.trainer._id.toString()];
          if (t.firstName && t.lastName) {
            trainerName = `${t.firstName} ${t.lastName}`;
          } else if (t.name) {
            trainerName = t.name;
          }
        }
      }
      
      // Ensure we get a numeric amount
      let amount = 0;
      if (typeof booking.amount === 'number') {
        amount = booking.amount;
      } else if (typeof booking.amount === 'string') {
        amount = parseFloat(booking.amount) || 0;
      } else if (typeof booking.totalPrice === 'number') {
        amount = booking.totalPrice;
      } else if (typeof booking.totalPrice === 'string') {
        amount = parseFloat(booking.totalPrice) || 0;
      } else if (booking.duration && booking.trainer && booking.trainer.rate) {
        amount = booking.trainer.rate * booking.duration;
      }
      
      // If no amount found, set a default
      if (amount === 0) {
        amount = 1000; // Default trainer session price
      }
      
      console.log(`Booking ${booking._id} trainer name: ${trainerName}`);
      
      return {
        _id: booking._id,
        description: `Training session with ${trainerName}`,
        type: "trainer",
        bookingDate: booking.sessionDate || booking.createdAt,
        date: booking.sessionDate || booking.createdAt,
        amount: amount,
        paymentMethod: booking.paymentMethod || "Cash",
        paymentStatus: booking.paymentStatus || "pending",
        status: booking.status || "pending",
        icon: "👟",
        time: booking.time || "",
        createdAt: booking.createdAt,
        trainerName: trainerName // Explicitly include trainer name
      };
    });

    res.status(200).json(formattedBookings);
  } catch (error) {
    console.error('Error fetching trainer bookings for transactions:', error);
    res.status(500).json({ message: 'Error fetching trainer bookings' });
  }
});

module.exports = router;