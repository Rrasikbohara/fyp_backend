const mongoose = require('mongoose');

// Define a schema for availability slots
const availabilitySlotSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: Number, // Hour in 24-hour format (0-23)
    required: true,
    min: 0,
    max: 23
  },
  endTime: {
    type: Number, // Hour in 24-hour format (0-23)
    required: true,
    min: 0,
    max: 23
  },
  isBooked: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const trainerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Trainer name is required'],
    trim: true
  },
  email: { type: String, required: true, unique: true },  
  specialization: {
    type: String,
    required: [true, 'Specialization is required'],
    enum: [
      'Biceps',
      'Shoulders',
      'Legs',
      'Abs',
      'Fat Loss',
      'Cardio',
      'Weight Training',
      'Yoga',
      'CrossFit',
      'Nutrition',
      'Zumba',
      'HIIT',
      'Pilates',
      'Strength Training',
      'Bodybuilding'
    ]
  },
  experience: {
    type: Number,
    required: [true, 'Experience is required'],
    min: [0, 'Experience cannot be negative']
  },
  rate: {
    type: Number,
    required: [true, 'Hourly rate is required'],
    min: [0, 'Rate cannot be negative']
  },
  availability: {
    type: String,
    required: true,
    enum: ['available', 'booked', 'not available'],
    default: 'available'
  },
  // New field for tracking detailed availability
  availabilitySlots: [availabilitySlotSchema],
  // Default working hours
  workingHours: {
    start: {
      type: Number,
      default: 9 // 9 AM
    },
    end: {
      type: Number,
      default: 17 // 5 PM
    }
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  rating: {
    type: Number,
    default: 0,
    min: [0, 'Rating cannot be less than 0'],
    max: [5, 'Rating cannot exceed 5']
  },
  earnings: {
    type: Number,
    default: 0,
    min: [0, 'Earnings cannot be negative']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true }
});

// Virtual for formatted rate
trainerSchema.virtual('formattedRate').get(function() {
  return `Rs.${this.rate}/hour`;
});

// Method to check if a trainer is available at a specific time
trainerSchema.methods.isAvailableAt = function(date, startHour, duration) {
  // Format the date to midnight of that day for comparison
  const bookingDate = new Date(date);
  bookingDate.setHours(0, 0, 0, 0);
  
  // Check if the requested hours are within working hours
  if (startHour < this.workingHours.start || (startHour + duration) > this.workingHours.end) {
    return false;
  }
  
  // Check if there's a conflict with existing bookings
  for (const slot of this.availabilitySlots) {
    const slotDate = new Date(slot.date);
    slotDate.setHours(0, 0, 0, 0);
    
    // Check if dates match
    if (slotDate.getTime() === bookingDate.getTime()) {
      // Check for time overlap
      if (slot.isBooked && 
          ((startHour >= slot.startTime && startHour < slot.endTime) || 
           (startHour + duration > slot.startTime && startHour + duration <= slot.endTime) ||
           (startHour <= slot.startTime && startHour + duration >= slot.endTime))) {
        return false;
      }
    }
  }
  
  return true;
};

// Method to book a specific time slot
trainerSchema.methods.bookTimeSlot = function(date, startHour, duration) {
  const bookingDate = new Date(date);
  bookingDate.setHours(0, 0, 0, 0);
  
  // Create a new booking slot
  this.availabilitySlots.push({
    date: bookingDate,
    startTime: startHour,
    endTime: startHour + duration,
    isBooked: true
  });
  
  // Check if trainer is fully booked for today
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  
  // Only update general availability if fully booked for today
  if (bookingDate.getTime() === todayDate.getTime()) {
    // Check if all hours are booked
    let fullyBooked = true;
    for (let hour = this.workingHours.start; hour < this.workingHours.end; hour++) {
      if (this.isAvailableAt(todayDate, hour, 1)) {
        fullyBooked = false;
        break;
      }
    }
    
    if (fullyBooked) {
      this.availability = 'booked';
    }
  }
};

module.exports = mongoose.model('Trainer', trainerSchema);