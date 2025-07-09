const mongoose = require('mongoose');

const userPackageSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  package: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
  car: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: false }, // Made optional for reward packages
  barcode: { type: String, required: true, unique: true }, // barcode/QR code string
  barcodeImage: { type: String }, // base64 or URL to QR image
  washesLeft: { type: Number, required: true },
  expiry: { type: Date, required: true },
  status: { type: String, enum: ['active', 'expired', 'used'], default: 'active' },
}, { timestamps: true });

module.exports = mongoose.model('UserPackage', userPackageSchema); 