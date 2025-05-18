const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Flag to track if this module initiated the connection
let connectionInitiatedHere = false;

// Run this script to fix admin accounts with missing passwords
async function setupAdmin() {
  try {
    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState === 0) {
      console.log('Connecting to MongoDB for admin setup...');
      await mongoose.connect(process.env.MONGODB_URI);
      connectionInitiatedHere = true; // Mark that we initiated the connection
      console.log('Connected to MongoDB from admin setup');
    } else {
      console.log('Using existing MongoDB connection for admin setup');
    }
    
    // Import Admin model
    const Admin = require('./models/Admin');
    
    // Check for existing admins
    const admins = await Admin.find();
    console.log(`Found ${admins.length} admin accounts`);
    
    // Fix accounts with missing passwords
    for (const admin of admins) {
      if (!admin.password) {
        console.log(`Fixing admin account: ${admin.username}`);
        
        // Set a default password based on username
        const defaultPassword = `${admin.username}123`;
        const salt = await bcrypt.genSalt(10);
        admin.password = await bcrypt.hash(defaultPassword, salt);
        await admin.save();
        
        console.log(`Fixed password for admin: ${admin.username}`);
      }
    }
    
    // Ensure default admin exists
    const defaultAdmin = await Admin.findOne({ username: 'admin' });
    if (!defaultAdmin) {
      console.log('Creating default admin account...');
      
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      await Admin.create({
        username: 'admin', 
        password: hashedPassword,
        email: 'imrajesh2005@gmail.com',
        role: 'super_admin'
      });
      
      console.log('Default admin account created!');
    }
    
    // Ensure gym123 admin exists
    const gym123Admin = await Admin.findOne({ username: 'gym123' });
    if (!gym123Admin) {
      console.log('Creating gym123 admin account...');
      
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('gym123', salt);
      
      await Admin.create({
        username: 'gym123', 
        password: hashedPassword,
        email: 'imrajesh2005@gmail.com',
        role: 'admin'
      });
      
      console.log('gym123 admin account created!');
    }
    
    console.log('Admin setup complete!');
  } catch (error) {
    console.error('Error in admin setup:', error);
  } finally {
    // Only disconnect if we initiated the connection AND we're running as a standalone script
    if (connectionInitiatedHere && require.main === module) {
      console.log('Disconnecting from MongoDB (standalone script mode)...');
      await mongoose.disconnect();
    } else {
      console.log('Keeping MongoDB connection open for the main application');
    }
  }
}

// Only run setup automatically if script is invoked directly
if (require.main === module) {
  console.log('Running admin setup as standalone script...');
  setupAdmin().then(() => {
    console.log('Setup complete, exiting...');
  });
}

module.exports = { setupAdmin };
