const mongoose = require('mongoose');

const washingPlaceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  hours: { type: String, required: true },
  email: { type: String, default: null },
location: {
  type: String, default: 'Point'
},
  city: { type: String }, 
  rating: { type: Number, min: 0, max: 5 },
  customers: { type: Number } 
}, { timestamps: true });

// Virtual for feedbacks
washingPlaceSchema.virtual('feedbacks', {
  ref: 'Feedback',
  localField: '_id',
  foreignField: 'washingPlace',
});

washingPlaceSchema.set('toObject', { virtuals: true });
washingPlaceSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('WashingPlace', washingPlaceSchema); 