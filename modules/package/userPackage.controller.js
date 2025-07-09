const UserPackage = require('./userPackage.model');
const User = require('../user/user.model');
const Package = require('./package.model');
const Car = require('../car/car.model');

// Get all user packages for the current user
exports.getUserPackages = async (req, res) => {
  try {
    const userPackages = await UserPackage.find({ user: req.user._id })
      .populate('package')
      .populate('car')
      .sort({ createdAt: -1 });
    
    res.json(userPackages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get a specific user package by ID
exports.getUserPackage = async (req, res) => {
  try {
    const userPackage = await UserPackage.findOne({ 
      _id: req.params.id, 
      user: req.user._id 
    })
    .populate('package')
    .populate('car');
    
    if (!userPackage) {
      return res.status(404).json({ error: 'User package not found' });
    }
    
    res.json(userPackage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get active user packages (not expired)
exports.getActiveUserPackages = async (req, res) => {
  try {
    const now = new Date();
    const activeUserPackages = await UserPackage.find({ 
      user: req.user._id,
      status: 'active',
      expiry: { $gt: now }
    })
    .populate('package')
    .populate('car')
    .sort({ createdAt: -1 });
    
    res.json(activeUserPackages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update user package (e.g., mark as used, update washes left)
exports.updateUserPackage = async (req, res) => {
  try {
    const { washesLeft, status, expiry } = req.body;
    
    const userPackage = await UserPackage.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { washesLeft, status, expiry },
      { new: true }
    ).populate('package').populate('car');
    
    if (!userPackage) {
      return res.status(404).json({ error: 'User package not found' });
    }
    
    res.json(userPackage);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Use a wash from user package
exports.useWash = async (req, res) => {
  try {
    const userPackage = await UserPackage.findOne({ 
      _id: req.params.id, 
      user: req.user._id,
      status: 'active'
    });
    
    if (!userPackage) {
      return res.status(404).json({ error: 'User package not found or not active' });
    }
    
    if (userPackage.washesLeft <= 0) {
      return res.status(400).json({ error: 'No washes left in this package' });
    }
    
    // Check if package is expired
    if (userPackage.expiry < new Date()) {
      userPackage.status = 'expired';
      await userPackage.save();
      return res.status(400).json({ error: 'Package has expired' });
    }
    
    // Use one wash
    userPackage.washesLeft -= 1;
    
    // If no washes left, mark as used
    if (userPackage.washesLeft === 0) {
      userPackage.status = 'used';
    }
    
    await userPackage.save();
    
    res.json({
      message: 'Wash used successfully',
      washesLeft: userPackage.washesLeft,
      status: userPackage.status,
      userPackage
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get user package statistics
exports.getUserPackageStats = async (req, res) => {
  try {
    const now = new Date();
    
    const stats = await UserPackage.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: null,
          totalPackages: { $sum: 1 },
          activePackages: {
            $sum: {
              $cond: [
                { 
                  $and: [
                    { $eq: ['$status', 'active'] },
                    { $gt: ['$expiry', now] }
                  ]
                },
                1,
                0
              ]
            }
          },
          totalWashes: { $sum: '$washesLeft' },
          expiredPackages: {
            $sum: {
              $cond: [
                { $lt: ['$expiry', now] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);
    
    const result = stats[0] || {
      totalPackages: 0,
      activePackages: 0,
      totalWashes: 0,
      expiredPackages: 0
    };
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Test endpoint - get user package by ID without authentication (for testing)
exports.getUserPackageById = async (req, res) => {
  try {
    const userPackage = await UserPackage.findById(req.params.id)
      .populate('package')
      .populate('car')
      .populate('user');
    
    if (!userPackage) {
      return res.status(404).json({ error: 'User package not found' });
    }
    
    res.json(userPackage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Debug endpoint - show current user info
exports.getCurrentUserInfo = async (req, res) => {
  try {
    res.json({
      currentUser: req.user,
      message: 'Current user information'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get user packages by user ID (no authentication required)
exports.getUserPackagesByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const userPackages = await UserPackage.find({ user: userId })
      .populate('package')
      .populate('car')
      .populate('user')
      .sort({ createdAt: -1 });
    
    res.json(userPackages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}; 