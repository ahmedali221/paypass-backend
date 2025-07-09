const mongoose = require('mongoose');

const washSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  car: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true },
  washingPlace: { type: mongoose.Schema.Types.ObjectId, ref: 'WashingPlace', required: true },
  package: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' },
  feedback: { type: mongoose.Schema.Types.ObjectId, ref: 'Feedback' },
  tip: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Wash', washSchema); 