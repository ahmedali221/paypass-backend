const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  wash: { type: mongoose.Schema.Types.ObjectId, ref: 'Wash', required: true },
  washingPlace: { type: mongoose.Schema.Types.ObjectId, ref: 'WashingPlace', required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String },
  complaint: { type: String }, // optional complaint field
  photo: { type: String }, // URL or base64 string for car photo after wash
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema); 