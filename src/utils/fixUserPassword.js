/**
 * This utility script diagnoses and fixes password issues for a specific user
 * by completely bypassing the User model's comparePassword method
 * 
 * Run with: node src/utils/fixUserPassword.js
 */
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Email of the user to fix
const EMAIL = 'imrajesh2005@gmail.com';
// New password to set
const NEW_PASSWORD = '111111';

async function fixUserPassword() {
  try {
    // Connect to MongoDB directly
    console.log('Connecting to MongoDB...');
    const client = await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Work directly with the collection to bypass any model middleware
    const db = client.connection.db;
    const usersCollection = db.collection('users');
    
    // Find the user
    console.log(`Looking for user with email: ${EMAIL}`);
    const user = await usersCollection.findOne({ email: EMAIL });
    
    if (!user) {
      console.error('User not found!');
      process.exit(1);
    }
    
    console.log(`User found: ${user.name} (${user._id})`);
    console.log('Current password hash:', user.password);
    
    // Generate new password hash with known parameters
    console.log('Generating new password hash...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);
    console.log('New password hash:', hashedPassword);
    
    // Directly update the document in the database
    console.log('Updating password in database...');
    const result = await usersCollection.updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword } }
    );
    
    console.log('Update result:', result);
    
    if (result.modifiedCount === 1) {
      console.log('Password updated successfully!');
    } else {
      console.log('Password was not updated!');
    }
    
    // Verify by testing direct password comparison
    console.log('\nVerifying password...');
    const updatedUser = await usersCollection.findOne({ _id: user._id });
    
    console.log('Updated password hash:', updatedUser.password);
    
    const isMatchDirect = await bcrypt.compare(NEW_PASSWORD, updatedUser.password);
    console.log('Direct bcrypt.compare() result:', isMatchDirect);
    
    console.log('\nLogin instructions:');
    console.log(`Email: ${EMAIL}`);
    console.log(`Password: ${NEW_PASSWORD}`);
    console.log('\nIf login still fails, try this in your controller:');
    console.log('1. Remove the user.comparePassword call');
    console.log('2. Use bcrypt.compare() directly like this:');
    console.log(`   const isMatch = await bcrypt.compare(password, user.password);`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fixUserPassword()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Script error:', err);
    process.exit(1);
  });
