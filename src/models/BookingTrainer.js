const mongoose = require('mongoose');

// Make sure reviewed flag exists to track feedback status
const bookingTrainerSchema = new mongoose.Schema({
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
  sessionDate: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    default: 1,
    min: 1
  },
  sessionType: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'khalti', 'credit_card'],
    default: 'cash'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  notes: String,
  reviewed: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    default: 'trainer'
  },
  trainerNameSnapshot: {
    type: String
  }
}, {
  timestamps: true
});

// Add a virtual field to always have trainer name available
bookingTrainerSchema.virtual('trainerName').get(function() {
  if (this.trainer) {
    if (this.trainer.firstName && this.trainer.lastName) {
      return `${this.trainer.firstName} ${this.trainer.lastName}`;
    } else if (this.trainer.name) {
      return this.trainer.name;
    }
  }
  return "Fitness Coach"; // Better default than "Unknown Trainer"
});

// Add a pre-save hook to ensure payment status matches completed status
bookingTrainerSchema.pre('save', function(next) {
  // If booking is completed, payment should be completed too
  if (this.status === 'completed' && this.paymentStatus !== 'completed') {
    this.paymentStatus = 'completed';
  }
  next();
});

// Ensure amount is set before saving
bookingTrainerSchema.pre('save', function(next) {
  // If amount is missing but there's a totalPrice field, use that
  if ((!this.amount || this.amount === 0) && this.totalPrice) {
    this.amount = this.totalPrice;
    console.log(`Set amount to ${this.amount} from totalPrice field`);
  }
  
  // If trainer has a rate and amount is still 0, calculate based on duration
  if ((!this.amount || this.amount === 0) && this.trainer && this.trainer.rate && this.duration) {
    this.amount = this.trainer.rate * this.duration;
    console.log(`Calculated amount to ${this.amount} from trainer rate and duration`);
  }
  
  next();
});

// Store trainer name at booking time to prevent "Unknown Trainer" if trainer is deleted
bookingTrainerSchema.pre('save', function(next) {
  if (!this.trainerNameSnapshot && this.trainer) {
    // Try to add a trainer name snapshot from the populated trainer document
    try {
      if (typeof this.trainer.populate === 'function') {
        // If trainer is a document that needs population
        this.populate('trainer');
        if (this.trainer.firstName && this.trainer.lastName) {
          this.trainerNameSnapshot = `${this.trainer.firstName} ${this.trainer.lastName}`;
        } else if (this.trainer.name) {
          this.trainerNameSnapshot = this.trainer.name;
        }
      } else if (this.trainer.firstName && this.trainer.lastName) {
        // If trainer is already populated
        this.trainerNameSnapshot = `${this.trainer.firstName} ${this.trainer.lastName}`;
      } else if (this.trainer.name) {
        this.trainerNameSnapshot = this.trainer.name;
      }
    } catch (err) {
      console.log('Could not capture trainer name snapshot:', err);
    }
  }
  
  next();
});

// Index for quick lookups
bookingTrainerSchema.index({ user: 1, sessionDate: 1 });
bookingTrainerSchema.index({ trainer: 1, sessionDate: 1 });

module.exports = mongoose.model('BookingTrainer', bookingTrainerSchema);