const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  make: { type: String, required: true },
  model: { type: String, required: true },
  year: { type: Number, required: true },
  licensePlate: { type: String, required: true, unique: true },
  color: { type: String },
  type: { type: String, enum: ['sedan', 'suv', 'truck', 'van', 'coupe', 'convertible', 'wagon', 'other'], required: true },
  size: { type: String, enum: ['small', 'medium', 'large'], required: true },
}, { timestamps: true });

module.exports = mongoose.model('Car', carSchema); 