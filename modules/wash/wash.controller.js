const UserPackage = require('../package/userPackage.model');
const Package = require('../package/package.model');
const Car = require('../car/car.model');
const Wash = require('./wash.model');
const { sendNotification } = require('../../services/notification');

exports.createWash = async (req, res) => {
  try {
    const wash = new Wash({ ...req.body, user: req.user._id });
    await wash.save();
    res.status(201).json(wash);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getWashes = async (req, res) => {
  try {
    const washes = await Wash.find({ user: req.user._id })
      .populate('washingPlace package feedback');
    res.json(washes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getWash = async (req, res) => {
  try {
    const wash = await Wash.findOne({ _id: req.params.id, user: req.user._id }).populate('washingPlace package');
    if (!wash) return res.status(404).json({ error: 'Wash not found' });
    res.json(wash);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateWash = async (req, res) => {
  try {
    const wash = await Wash.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true }
    );
    if (!wash) return res.status(404).json({ error: 'Wash not found' });
    res.json(wash);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteWash = async (req, res) => {
  try {
    const wash = await Wash.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!wash) return res.status(404).json({ error: 'Wash not found' });
    res.json({ message: 'Wash deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.scanBarcodeAndDeductWash = async (req, res) => {
  try {
    const { barcode, washingPlace } = req.body;
    // Find active user package by barcode
    const userPackage = await UserPackage.findOne({ barcode, status: 'active', expiry: { $gt: new Date() }, washesLeft: { $gt: 0 } })
      .populate('user package');
    if (!userPackage) return res.status(400).json({ error: 'Invalid or expired barcode, or no washes left' });
    // Deduct a wash
    userPackage.washesLeft -= 1;
    if (userPackage.washesLeft === 0) userPackage.status = 'used';
    await userPackage.save();
    // Create wash record
    const wash = new Wash({
      user: userPackage.user._id,
      washingPlace,
      package: userPackage.package._id,
      status: 'completed',
      owner: req.user._id, // set owner to the scanning owner
    });
    await wash.save();
    // Send feedback notification
    await sendNotification({
      user: userPackage.user._id,
      type: 'feedback',
      message: 'Please rate your recent wash and optionally add a tip.',
      relatedWash: wash._id,
    });
    res.json({
      user: userPackage.user,
      carSize: userPackage.carSize,
      package: userPackage.package,
      washesLeft: userPackage.washesLeft,
      expiry: userPackage.expiry,
      wash,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all washes performed by the current owner
exports.getWashesByOwner = async (req, res) => {
  try {
    const washes = await Wash.find({ owner: req.user._id })
      .populate('user package washingPlace');
    res.json(washes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}; 