const QRCode = require('qrcode');

// Generates a QR code image (base64) for a given string (barcode)
async function generateQRCode(data) {
  try {
    return await QRCode.toDataURL(data);
  } catch (err) {
    throw new Error('Failed to generate QR code: ' + err.message);
  }
}

module.exports = { generateQRCode }; 