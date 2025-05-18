const express = require('express');
const router = express.Router();
const Nutrition = require('../models/Nutrition');
const authMiddleware = require('../middleware/authMiddleware');

// Create new nutrition record
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { date, category, items, completed } = req.body;
    if (!date || !category || !items) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const nutrition = new Nutrition({
      user: req.user.id,
      date,
      category,
      items,
      completed: Boolean(completed)
    });
    await nutrition.save();
    res.status(201).json({ message: "Nutrition added", nutrition });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get nutrition records for current user (optionally filter by date)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { date } = req.query;
    let filter = { user: req.user.id };
    if (date) {
      const start = new Date(date);
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      filter.date = { $gte: start, $lt: end };
    }
    const nutritions = await Nutrition.find(filter).sort({ date: -1 });
    res.json(nutritions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a nutrition record
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const nutrition = await Nutrition.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!nutrition) return res.status(404).json({ message: "Nutrition not found" });
    res.json({ message: "Nutrition deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Toggle nutrition completion status using a boolean in body
router.put('/:id/complete', authMiddleware, async (req, res) => {
  try {
    const { completed } = req.body; // true or false
    const nutrition = await Nutrition.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { completed: Boolean(completed) },
      { new: true }
    );
    if (!nutrition) return res.status(404).json({ message: "Nutrition not found" });
    res.json({ message: completed ? "Nutrition marked as complete" : "Nutrition marked as incomplete", nutrition });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
