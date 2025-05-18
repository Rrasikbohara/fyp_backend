/**
 * This utility script directly updates a user's password in the MongoDB database
 * bypassing all mongoose models and middleware to ensure it works
 * 
 * Run with: node src/utils/directPasswordUpdate.js
 */
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
require('dotenv').config();

// CONFIGURATION - MODIFY THESE VALUES
const EMAIL = 'imrajesh2005@gmail.com';
const NEW_PASSWORD = '111111';

async function directPasswordUpdate() {
  let client;
  
  try {
    // Connect directly to MongoDB using the native driver
    console.log('Connecting to MongoDB directly...');
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log('Connected successfully to MongoDB');
    
    // Get the database name from the connection string
    const dbName = process.env.MONGODB_URI.split('/').pop().split('?')[0] || 'gym_management';
    
    // Get the database and collection
    const db = client.db(dbName);
    const usersCollection = db.collection('users');
    
    // Find the user by email (case insensitive)
    console.log(`Looking for user with email: ${EMAIL}`);
    const user = await usersCollection.findOne({ 
      email: { $regex: new RegExp(`^${EMAIL}$`, 'i') }
    });
    
    if (!user) {
      console.error('User not found!');
      return;
    }
    
    console.log('User found:');
    console.log('- ID:', user._id);
    console.log('- Name:', user.name);
    console.log('- Email:', user.email);
    console.log('- Current password hash:', user.password?.substring(0, 20) + '...');
    
    // Generate a new password hash with standard settings
    console.log('\nGenerating new password hash...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);
    console.log('New password hash:', hashedPassword);
    
    // Update the user's password directly in the database
    console.log('\nUpdating password directly in database...');
    const updateResult = await usersCollection.updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword } }
    );
    
    if (updateResult.modifiedCount === 1) {
      console.log('Password updated successfully!');
    } else {
      console.log('Password update operation complete, but no changes made.');
    }
    
    // Verify the update by fetching the user again
    const updatedUser = await usersCollection.findOne({ _id: user._id });
    console.log('\nVerification:');
    console.log('Updated password hash:', updatedUser.password);
    
    // Test the password directly
    const isMatch = await bcrypt.compare(NEW_PASSWORD, updatedUser.password);
    console.log('Password verification test:', isMatch ? 'PASSED' : 'FAILED');
    
    if (isMatch) {
      console.log('\n✅ SUCCESS: The password has been updated successfully!');
      console.log('\nLogin instructions:');
      console.log('Email:', EMAIL);
      console.log('Password:', NEW_PASSWORD);
    } else {
      console.log('\n❌ ERROR: Something went wrong with the password update.');
    }
    
    // Additional debugging help
    console.log('\nIf you still have login issues:');
    console.log('1. Check your JWT secret in .env file');
    console.log('2. Look for any case-sensitivity issues with email in the login code');
    console.log('3. Verify the userController.js is using direct bcrypt.compare() and not model methods');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close the connection
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
  }
}

directPasswordUpdate()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Script execution error:', err);
    process.exit(1);
  });
