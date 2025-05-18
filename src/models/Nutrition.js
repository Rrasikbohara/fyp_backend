const mongoose = require('mongoose');

const NutritionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  category: { type: String, required: true },
  items: [{
    name: { type: String, required: true },
    amount: { type: String, required: true },
    calories: { type: Number, required: true }
  }],
  completed: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Nutrition', NutritionSchema);
