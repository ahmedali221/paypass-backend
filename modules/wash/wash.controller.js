const Wash = require('./wash.model');

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
    const washes = await Wash.find({ user: req.user._id }).populate('car washingPlace package');
    res.json(washes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getWash = async (req, res) => {
  try {
    const wash = await Wash.findOne({ _id: req.params.id, user: req.user._id }).populate('car washingPlace package');
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