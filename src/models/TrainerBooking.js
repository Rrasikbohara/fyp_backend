const mongoose = require('mongoose');

const TrainerBookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  trainer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trainer',
    required: true
  },
  bookingDate: {
    type: Date,
    required: true
  },
  sessionTime: {
    type: String,
    required: true
  },
  totalPrice: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'khalti', 'eSewa', 'Card'],
    default: 'Cash'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled', 'initiated'],
    default: 'pending'
  },
  status: {
    type: String,
    enum: ['upcoming', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  bookingType: {
    type: String,
    default: 'trainer'
  }
}, { timestamps: true });

module.exports = mongoose.model('TrainerBooking', TrainerBookingSchema);
