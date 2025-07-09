const Feedback = require('./feedback.model');
const Wash = require('../wash/wash.model');

exports.createFeedback = async (req, res) => {
  try {
    const feedback = new Feedback({ ...req.body, user: req.user._id });
    await feedback.save();
    res.status(201).json(feedback);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getFeedbacks = async (req, res) => {
  try {
    const feedbacks = await Feedback.find().populate('user wash washingPlace');
    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id).populate('user wash washingPlace');
    if (!feedback) return res.status(404).json({ error: 'Feedback not found' });
    res.json(feedback);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!feedback) return res.status(404).json({ error: 'Feedback not found' });
    res.json(feedback);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.id);
    if (!feedback) return res.status(404).json({ error: 'Feedback not found' });
    res.json({ message: 'Feedback deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getFeedbacksForWashingPlace = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ washingPlace: req.params.washingPlaceId }).populate('user wash washingPlace');
    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createFeedbackForWash = async (req, res) => {
  try {
    const { washId, rating, comment, complaint, tip } = req.body;
    const wash = await Wash.findOne({ _id: washId, user: req.user._id });
    if (!wash) return res.status(404).json({ error: 'Wash not found' });
    // Create feedback
    const feedback = new Feedback({
      user: req.user._id,
      wash: washId,
      washingPlace: wash.washingPlace,
      rating,
      comment,
      complaint,
    });
    await feedback.save();
    // Update wash with feedback and tip
    wash.feedback = feedback._id;
    if (tip) wash.tip = tip;
    await wash.save();
    res.status(201).json({ feedback, wash });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}; 