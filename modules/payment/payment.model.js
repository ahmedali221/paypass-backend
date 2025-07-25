const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  package: { type: mongoose.Schema.Types.ObjectId, ref: 'Package' },
  station: { type: mongoose.Schema.Types.ObjectId, ref: 'WashStation' }, // For tip payments
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  method: { type: String, required: true },
  transactionId: { type: String },
  type: { type: String, enum: ['purchase', 'tip'], default: 'purchase' },
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema); 