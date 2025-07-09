const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  inviter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  invitee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  inviteeEmail: { type: String },
  status: { type: String, enum: ['pending', 'completed', 'rewarded'], default: 'pending' },
  rewardGiven: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Referral', referralSchema); 