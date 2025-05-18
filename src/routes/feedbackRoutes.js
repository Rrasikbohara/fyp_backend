const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const Trainer = require('../models/Trainer');
const authMiddleware = require('../middleware/authMiddleware');
const { default: mongoose } = require('mongoose');

// List all feedback (admin or public)
router.get('/', async (req, res) => {
  try {
    const feedback = await Feedback.find()
      .populate('user', 'name email')
      .populate('trainer', 'name specialization')
      .populate('booking', 'sessionDate')
      .sort({ createdAt: -1 });
    res.json({ success: true, feedback });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch feedback' });
  }
});

// Get feedback by ID
router.get('/:id', async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id)
      .populate('user', 'name email')
      .populate('trainer', 'name specialization')
      .populate('booking', 'sessionDate');
    if (!feedback) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }
    res.json({ success: true, feedback });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch feedback' });
  }
});

// Submit new feedback
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { trainer, rating, review } = req.body;
    // Validate trainer ID format
    if (!trainer || !mongoose.Types.ObjectId.isValid(trainer)) {
      return res.status(400).json({ message: 'Invalid or missing trainer ID' });
    }
    // Ensure trainer exists
    const foundTrainer = await Trainer.findById(trainer);
    if (!foundTrainer) {
      return res.status(404).json({ message: 'Trainer not found' });
    }
    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    // Validate review
    if (!review || review.trim().length < 3) {
      return res.status(400).json({ message: 'Review must be at least 3 characters' });
    }
    // Create new feedback
    const newFeedback = new Feedback({
      trainer,
      user: req.user.id,
      rating,
      review: review.trim()
    });
    await newFeedback.save();
    
    res.status(201).json({
      success: true,
      message: 'Feedback successfully created',
      feedback: newFeedback
    });
  } catch (error) {
    console.error('Error creating feedback:', error);
    res.status(500).json({ message: 'Failed to create feedback' });
  }
});

// Get feedback by user
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const feedback = await Feedback.find({ user: req.params.userId })
      .populate('trainer', 'name specialization')
      .sort({ createdAt: -1 });
    res.json({ success: true, feedback });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch user feedback' });
  }
});

// Get feedback by trainer (public)
router.get('/trainer/:trainerId', async (req, res) => {
  try {
    const feedback = await Feedback.find({ trainer: req.params.trainerId, status: 'approved' })
      .populate('user', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, feedback });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch trainer feedback' });
  }
});

// Update feedback status (admin only)
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const { status } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const feedback = await Feedback.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!feedback) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }
    res.json({ success: true, message: 'Status updated', feedback });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
});

// Delete feedback (admin or owner)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ success: false, message: 'Feedback not found' });
    if (req.user.role !== 'admin' && feedback.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    await Feedback.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Feedback deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete feedback' });
  }
});

module.exports = router;
