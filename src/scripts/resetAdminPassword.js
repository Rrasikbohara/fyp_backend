const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Reset admin password function
async function resetAdminPassword() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Import the Admin model
    const Admin = require('../models/Admin');
    
    // Find the admin account for gym123
    const admin = await Admin.findOne({ username: 'gym123' });
    
    if (!admin) {
      console.log('Admin user "gym123" not found. Creating a new admin...');
      
      // Create a new admin with hashed password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('gym123', salt);
      
      const newAdmin = new Admin({
        username: 'gym123',
        password: hashedPassword,
        email: 'imrajesh2005@gmail.com',
        role: 'admin'
      });
      
      await newAdmin.save();
      console.log('New admin "gym123" created successfully with password "gym123"');
    } else {
      // Update the existing admin's password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('gym123', salt);
      
      admin.password = hashedPassword;
      await admin.save();
      
      console.log('Admin "gym123" password reset to "gym123"');
    }
    
    // Double-check that we can verify the password
    const updatedAdmin = await Admin.findOne({ username: 'gym123' });
    const isMatch = await bcrypt.compare('gym123', updatedAdmin.password);
    console.log('Password verification test:', isMatch ? 'PASSED' : 'FAILED');
    
  } catch (error) {
    console.error('Error resetting admin password:', error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the function
resetAdminPassword().then(() => {
  console.log('Admin password reset script completed');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
