const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't return password by default
  },
  phoneNumber: {
    type: String,
    required: [true, 'Please provide a phone number'],
    trim: true,
    match: [/^[0-9]{10}$/, 'Phone number must be 10 digits']
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  avatar: {
    type: String
  },
  // Add reset token fields
  resetToken: {
    type: String,
    select: false
  },
  resetTokenExpiry: {
    type: Date,
    select: false
  }
}, {
  timestamps: true
});

// Ensure the comparePassword method works correctly
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    console.log('Using direct bcrypt.compare in User model method');
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('Error in comparePassword method:', error);
    throw error;
  }
};

// Virtual for name splitting
userSchema.virtual('firstName').get(function() {
  return this.name.split(' ')[0];
});

userSchema.virtual('lastName').get(function() {
  return this.name.split(' ').slice(1).join(' ');
});

// Add indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ phoneNumber: 1 });

// IMPORTANT: Comment out the pre-save middleware to avoid double hashing
// userSchema.pre('save', async function(next) {
//   if (!this.isModified('password')) {
//     return next();
//   }
//   
//   try {
//     const salt = await bcrypt.genSalt(10);
//     this.password = await bcrypt.hash(this.password, salt);
//     next();
//   } catch (error) {
//     next(error);
//   }
// });

// Configure virtuals to be included when converting to JSON/objects
userSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.password;
    return ret;
  }
});

userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema);