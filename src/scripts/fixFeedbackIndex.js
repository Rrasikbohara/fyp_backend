const mongoose = require('mongoose');
require('dotenv').config();

async function fixFeedbackIndex() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Get the feedbacks collection
    const db = mongoose.connection.db;
    const collection = db.collection('feedbacks');
    
    // List existing indexes
    console.log('Existing indexes:');
    const indexes = await collection.indexes();
    console.log(indexes);
    
    // Check if the problematic index exists and drop it
    const uniqueBookingIndex = indexes.find(
      index => index.key && index.key.booking === 1 && index.unique === true
    );
    
    if (uniqueBookingIndex) {
      console.log('Dropping unique booking index...');
      await collection.dropIndex('booking_1');
      console.log('Index dropped successfully');
    } else {
      console.log('No unique index found for booking field');
    }
    
    // Recreate as non-unique index
    console.log('Creating non-unique index on booking field...');
    await collection.createIndex({ booking: 1 }, { unique: false });
    console.log('Non-unique index created successfully');
    
    console.log('Index fixed successfully!');
  } catch (error) {
    console.error('Error fixing index:', error);
  } finally {
    mongoose.disconnect();
    console.log('Done');
  }
}

fixFeedbackIndex();
