const Booking = require("../models/BookingGym");
let TrainerBooking;

// Try to require TrainerBooking model, but don't fail if it doesn't exist
try {
  TrainerBooking = require("../models/TrainerBooking");
} catch (error) {
  console.warn("TrainerBooking model not found, will use empty trainer bookings");
}

const getUserTransactions = async (req, res) => {
  try {
    console.log('Transaction controller called with user:', req.user?.id);

    // Verify user exists in request
    if (!req.user || !req.user.id) {
      console.error('No user ID found in request');
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Get gym bookings
    const gymBookings = await Booking.find({ user: req.user.id })
      .sort('-createdAt')
      .populate('gym', 'name')
      .lean()
      .catch(err => {
        console.error('Error fetching gym bookings:', err);
        return [];
      });
    
    console.log(`Found ${gymBookings.length} gym bookings`);
    
    // Get trainer bookings - only if model exists
    let trainerBookings = [];
    if (TrainerBooking) {
      try {
        trainerBookings = await TrainerBooking.find({ user: req.user.id })
          .sort('-createdAt')
          .populate({
            path: 'trainer',
            select: 'firstName lastName name specialization rate' // Include both name fields
          })
          .lean();
        console.log(`Found ${trainerBookings.length} trainer bookings`);
      } catch (err) {
        console.error('Error fetching trainer bookings:', err.message);
      }
    }
    
    // Transform gym bookings
    const gymTransactions = gymBookings.map(booking => {
      // Extract amount from any available field
      let amount = 0;
      
      if (typeof booking.amount === 'number') {
        amount = booking.amount;
      } else if (typeof booking.amount === 'string' && !isNaN(parseFloat(booking.amount))) {
        amount = parseFloat(booking.amount);
      } else if (typeof booking.totalPrice === 'number') {
        amount = booking.totalPrice;
      } else if (typeof booking.totalPrice === 'string' && !isNaN(parseFloat(booking.totalPrice))) {
        amount = parseFloat(booking.totalPrice);
      } else if (typeof booking.price === 'number') {
        amount = booking.price;
      } else if (booking.price && typeof booking.price === 'string') {
        amount = parseFloat(booking.price);
      }
      
      // If amount is still 0, set a default
      if (amount === 0) {
        amount = 500; // Default gym session price
      }
      
      console.log(`Gym booking ${booking._id} amount: ${amount} (fields: amount=${booking.amount}, totalPrice=${booking.totalPrice}, price=${booking.price})`);
      
      return {
        _id: booking._id,
        description: booking.gym ? `Booking at ${booking.gym.name}` : "Gym Booking",
        type: "gym",
        date: booking.bookingDate || booking.createdAt,
        amount: amount, // Use our extracted amount
        paymentMethod: booking.paymentMethod || "Cash",
        paymentStatus: booking.paymentStatus || "pending",
        status: booking.status || "upcoming",
        icon: "🏋️",
        createdAt: booking.createdAt
      };
    });
    
    // Transform trainer bookings
    const trainerTransactions = trainerBookings.map(booking => {
      // Get trainer name handling all possible fields
      let trainerName = "Unknown Trainer";
      
      if (booking.trainer) {
        if (booking.trainer.firstName && booking.trainer.lastName) {
          trainerName = `${booking.trainer.firstName} ${booking.trainer.lastName}`;
        } else if (booking.trainer.name) {
          trainerName = booking.trainer.name;
        } else if (booking.trainerName) {
          trainerName = booking.trainerName;
        }
      }
      
      // Extract amount from any available field
      let amount = 0;
      
      if (typeof booking.amount === 'number') {
        amount = booking.amount;
      } else if (typeof booking.amount === 'string' && !isNaN(parseFloat(booking.amount))) {
        amount = parseFloat(booking.amount);
      } else if (typeof booking.totalPrice === 'number') {
        amount = booking.totalPrice;
      } else if (typeof booking.totalPrice === 'string' && !isNaN(parseFloat(booking.totalPrice))) {
        amount = parseFloat(booking.totalPrice);
      } else if (typeof booking.price === 'number') {
        amount = booking.price;
      } else if (booking.price && typeof booking.price === 'string') {
        amount = parseFloat(booking.price);
      } else if (booking.duration && booking.trainer && booking.trainer.rate) {
        // Calculate from duration and rate
        amount = booking.duration * booking.trainer.rate;
      }
      
      // If amount is still 0, set a default
      if (amount === 0) {
        amount = 1000; // Default trainer session price
      }
      
      console.log(`Trainer booking ${booking._id} amount: ${amount} (fields: amount=${booking.amount}, totalPrice=${booking.totalPrice}, price=${booking.price})`);
      console.log(`Trainer name: ${trainerName} (fields: firstName=${booking.trainer?.firstName}, lastName=${booking.trainer?.lastName}, name=${booking.trainer?.name})`);
      
      return {
        _id: booking._id,
        description: `Training session with ${trainerName}`,
        type: "trainer",
        date: booking.bookingDate || booking.sessionDate || booking.createdAt,
        amount: amount, // Use our extracted amount
        paymentMethod: booking.paymentMethod || "Cash",
        paymentStatus: booking.paymentStatus || "pending",
        status: booking.status || "upcoming",
        icon: "👟",
        createdAt: booking.createdAt
      };
    });
    
    // Combine and sort all transactions by date (newest first)
    const allTransactions = [...gymTransactions, ...trainerTransactions]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    console.log(`Returning ${allTransactions.length} total transactions`);
    res.json(allTransactions);
  } catch (error) {
    console.error("Error in getUserTransactions:", error);
    res.status(500).json({ message: "Error fetching transactions", error: error.message });
  }
};

// Add this debugging line to confirm export
console.log('Transaction controller loaded, exporting:', Object.keys({ getUserTransactions }));

// Make sure this is the last line and properly exports the function
module.exports = { getUserTransactions };