const mongoose = require('mongoose');

const bookingGymSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bookingDate: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true,
    min: 1
  },
  workoutType: {
    type: String,
    required: true,
    enum: ['General', 'Cardio', 'Strength', 'Yoga', 'HIIT', 'CrossFit']
  },
  payment: {
    amount: {
      type: Number,
      required: true
    },
    method: {
      type: String,
      enum: ['cash', 'khalti', 'credit_card'],
      default: 'cash'
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending'
    },
    transactionId: String
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
    default: 'gym'
  },
  // Adding equipment if applicable
  equipment: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Add virtual fields for formatting
bookingGymSchema.virtual('formattedDate').get(function() {
  return new Date(this.bookingDate).toLocaleDateString();
});

bookingGymSchema.virtual('timeSlot').get(function() {
  return `${this.startTime} - ${this.endTime}`;
});

bookingGymSchema.set('toJSON', { virtuals: true });
bookingGymSchema.set('toObject', { virtuals: true });

// Indexes for better query performance
bookingGymSchema.index({ user: 1, bookingDate: 1 });
bookingGymSchema.index({ status: 1 });
bookingGymSchema.index({ createdAt: -1 });

// Add this pre-save hook to the schema

// Ensure totalPrice is set before saving
bookingGymSchema.pre('save', function(next) {
  // If totalPrice is missing or 0, try to set it
  if (!this.totalPrice || this.totalPrice === 0) {
    // If we have price field, use that
    if (this.price && this.price > 0) {
      this.totalPrice = this.price;
      console.log(`Set totalPrice to ${this.totalPrice} from price field`);
    }
    // If gym has a price and totalPrice is still 0, use gym price
    else if (this.gym && this.gym.price && this.gym.price > 0) {
      this.totalPrice = this.gym.price;
      console.log(`Set totalPrice to ${this.totalPrice} from gym.price`);
    }
    // If we have a default price set for the gym in the system
    else if (this.gymId && global.gymPrices && global.gymPrices[this.gymId]) {
      this.totalPrice = global.gymPrices[this.gymId];
      console.log(`Set totalPrice to ${this.totalPrice} from global gym prices`);
    }
    // Default to 500 if still missing (basic session price)
    else {
      this.totalPrice = 500;
      console.log('Set default totalPrice to 500');
    }
  }
  
  next();
});

module.exports = mongoose.model('BookingGym', bookingGymSchema);
