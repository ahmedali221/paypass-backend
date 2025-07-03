const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  basePrice: { type: Number, required: true },
  originalPrice: { type: Number, required: true },
  features: [{ type: String }],
  popular: { type: Boolean, default: false },
  washes: { type: Number, required: true },
  savings: { type: Number, required: true },
  duration: { type: Number, required: true }, // in days
}, { timestamps: true });

module.exports = mongoose.model('Package', packageSchema); 