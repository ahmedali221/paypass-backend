const WashingPlace = require('./washingPlace.model');
const Feedback = require('../feedback/feedback.model');

exports.createWashingPlace = async (req, res) => {
  try {
    const place = new WashingPlace(req.body);
    await place.save();
    res.status(201).json(place);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getWashingPlaces = async (req, res) => {
  try {
    const places = await WashingPlace.find();
    res.json(places);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getWashingPlace = async (req, res) => {
  try {
    const place = await WashingPlace.findById(req.params.id);
    if (!place) return res.status(404).json({ error: 'Washing place not found' });

    // Get feedback for this washing place
    const feedbacks = await Feedback.find({ washingPlace: place._id }).populate('user wash');

    // Calculate average rating (between 0 and 5)
    let avgRating = 0;
    if (feedbacks.length > 0) {
      avgRating = feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / feedbacks.length;
      avgRating = Math.max(0, Math.min(5, avgRating));
    }

    // Google Maps link
    const locationLink = place.coordinates ? `https://www.google.com/maps?q=${place.coordinates.lat},${place.coordinates.lng}` : null;

    res.json({
      ...place.toObject(),
      feedbacks,
      avgRating,
      locationLink
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateWashingPlace = async (req, res) => {
  try {
    const place = await WashingPlace.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!place) return res.status(404).json({ error: 'Washing place not found' });
    res.json(place);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteWashingPlace = async (req, res) => {
  try {
    const place = await WashingPlace.findByIdAndDelete(req.params.id);
    if (!place) return res.status(404).json({ error: 'Washing place not found' });
    res.json({ message: 'Washing place deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all feedback for a specific washing place
exports.getFeedbacksForWashingPlace = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ washingPlace: req.params.id }).populate('user wash');
    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}; 