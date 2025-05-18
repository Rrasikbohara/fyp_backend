const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: false,
    default: 'imrajesh2005@gmail.com'
  },
  role: {
    type: String,
    enum: ['admin', 'super_admin'],
    default: 'admin'
  },
  lastLogin: {
    type: Date,
    default: null
  },
  otp: String,
  otpExpiry: Date
}, {
  timestamps: true
});

// Add a static method to create an admin with a properly hashed password
adminSchema.statics.createAdmin = async function(adminData) {
  try {
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminData.password, salt);
    
    // Create admin with hashed password
    const admin = new this({
      ...adminData,
      password: hashedPassword
    });
    
    return await admin.save();
  } catch (error) {
    throw error;
  }
};

// Fix for empty password fields - let's add a script to set default passwords
// This will be exported and used in a setup script
adminSchema.statics.ensureDefaultAdmin = async function() {
  try {
    // Check for default admin
    const admin = await this.findOne({ username: 'admin' });
    
    if (!admin) {
      // Create default admin
      console.log('Creating default admin account...');
      await this.createAdmin({
        username: 'admin',
        password: 'admin123',
        email: 'imrajesh2005@gmail.com',
        role: 'super_admin'
      });
      console.log('Default admin account created!');
    } else if (!admin.password) {
      // If admin exists but has no password, set a default one
      console.log('Admin found with missing password, setting default password...');
      const salt = await bcrypt.genSalt(10);
      admin.password = await bcrypt.hash('admin123', salt);
      await admin.save();
      console.log('Default password set for admin!');
    }
    
    return admin;
  } catch (error) {
    console.error('Error ensuring default admin:', error);
    throw error;
  }
};

// Add method to compare password using bcrypt
adminSchema.methods.comparePassword = async function(candidatePassword) {
  console.log('Comparing passwords:');
  console.log('- Candidate password length:', candidatePassword.length);
  console.log('- Stored hash exists:', !!this.password);
  
  try {
    // Use bcrypt to compare the password
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    console.log('bcrypt comparison result:', isMatch);
    return isMatch;
  } catch (error) {
    console.error('Error comparing passwords:', error);
    throw error;
  }
};

// Add a static method to reset admin password
adminSchema.statics.resetPassword = async function(username, newPassword) {
  const admin = await this.findOne({ username });
  if (!admin) {
    throw new Error(`Admin with username "${username}" not found`);
  }
  
  // Hash the new password with bcrypt
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);
  
  // Update the admin's password
  admin.password = hashedPassword;
  await admin.save();
  
  return admin;
};

module.exports = mongoose.model('Admin', adminSchema);
