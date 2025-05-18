/**
 * Password diagnostics utility - finds out why the password comparison is failing
 * Run with: node src/utils/passwordDiagnostics.js
 */
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Test credentials
const EMAIL = 'imrajesh2005@gmail.com';
const TEST_PASSWORDS = ['111111', '123456', 'password', 'gymuser'];

async function diagnosePasswordIssue() {
  let client;
  
  try {
    // Connect directly to MongoDB
    console.log('Connecting to MongoDB...');
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log('Connected successfully to MongoDB');
    
    // Get database name from connection string
    const dbName = process.env.MONGODB_URI.split('/').pop().split('?')[0] || 'gym_management';
    
    // Get users collection
    const db = client.db(dbName);
    const usersCollection = db.collection('users');
    
    // Find the user
    console.log(`Looking for user with email: ${EMAIL}`);
    const user = await usersCollection.findOne({ email: EMAIL });
    
    if (!user) {
      console.error('User not found!');
      return;
    }
    
    console.log(`User found: ${user.name} (${user._id})`);
    console.log(`Current password hash: ${user.password}`);
    
    // Try multiple known passwords to see if any match
    console.log('\nTesting multiple passwords:');
    console.log('----------------------------');
    
    let foundMatch = false;
    for (const password of TEST_PASSWORDS) {
      const isMatch = await bcrypt.compare(password, user.password);
      console.log(`Password '${password}' matches: ${isMatch}`);
      if (isMatch) {
        foundMatch = true;
        console.log(`✅ Found matching password: '${password}'`);
      }
    }
    
    // Test a custom password too
    if (!foundMatch) {
      console.log('\nNo matches found. Let\'s create a password that will definitely work:');
      
      // Create a new hash for our known password
      const salt = await bcrypt.genSalt(10);
      const newHash = await bcrypt.hash('111111', salt);
      
      console.log('New password hash:', newHash);
      
      // Update the user's password in the database
      console.log('\nUpdating password in database...');
      const updateResult = await usersCollection.updateOne(
        { _id: user._id },
        { $set: { password: newHash } }
      );
      
      if (updateResult.modifiedCount === 1) {
        console.log('Password updated successfully!');
      } else {
        console.log('Password update operation failed.');
        return;
      }
      
      // Verify the update
      const updatedUser = await usersCollection.findOne({ _id: user._id });
      console.log('New hash stored in database:', updatedUser.password);
      
      // Test verification with known password
      const verificationTest = await bcrypt.compare('111111', updatedUser.password);
      console.log(`Verification test passed: ${verificationTest}`);
      
      if (verificationTest) {
        console.log('\n✅ Password has been reset to "111111" and verified to work.');
        console.log('\nLogin instructions:');
        console.log('Email:', EMAIL);
        console.log('Password: 111111');
      }
    }
    
    // Additional diagnostics - check if there are any odd characters in the hash
    console.log('\nDetailed hash analysis:');
    const hash = user.password;
    
    console.log('Hash length:', hash.length, '(should be around 60 characters for bcrypt)');
    console.log('Hash structure check:', hash.startsWith('$2') ? 'Valid bcrypt format ✅' : 'Invalid format ❌');
    
    // Check if the hash has been modified or truncated
    const parts = hash.split('$');
    console.log('Hash parts:', parts.length, '(should be 4 for bcrypt)');
    
    if (parts.length === 4) {
      console.log('Algorithm:', parts[1]);
      console.log('Cost factor:', parts[2]);
      console.log('Salt and hash length:', parts[3].length);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
  }
}

diagnosePasswordIssue()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Script error:', err);
    process.exit(1);
  });
