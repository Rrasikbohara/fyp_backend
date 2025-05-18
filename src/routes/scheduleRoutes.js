const express = require('express');
const router = express.Router();
const Schedule = require('../models/Schedule');
const mongoose = require('mongoose'); // Add this import
const authMiddleware = require('../middleware/authMiddleware');

// GET schedules for logged in user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const schedules = await Schedule.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST a new schedule
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { day, time, exercise, duration } = req.body;
    
    // Log payload for debugging
    console.log("POST /schedule payload:", req.body, " req.user.id:", req.user.id);
    
    if (!req.user || !req.user.id) {
      return res.status(400).json({ message: "User not authenticated" });
    }
    
    const schedule = new Schedule({
      user: req.user.id,
      day,
      time,
      exercise,
      duration: Number(duration),  // Ensure duration is a Number
      triggered: false
    });
    
    await schedule.save();
    res.status(201).json(schedule);
  } catch (error) {
    console.error("Error in POST /schedule:", error);
    res.status(400).json({ message: error.message });
  }
});

// DELETE a schedule
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const schedule = await Schedule.findOneAndDelete({ 
      _id: req.params.id, 
      user: req.user.id 
    });
    
    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found or not authorized' });
    }
    
    res.json({ message: 'Schedule deleted successfully', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Reset all triggered flags
router.post('/reset-triggers', authMiddleware, async (req, res) => {
  try {
    const result = await Schedule.updateMany(
      { user: req.user.id, triggered: true },
      { $set: { triggered: false } }
    );
    
    res.json({ 
      message: `Reset ${result.modifiedCount || 0} schedule triggers`, 
      count: result.modifiedCount || 0 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
