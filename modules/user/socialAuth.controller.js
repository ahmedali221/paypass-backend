const { OAuth2Client } = require('google-auth-library');
const appleSignin = require('apple-signin-auth');
const User = require('./user.model'); // Adjust path if needed
const jwt = require('jsonwebtoken'); // Assuming you use JWT

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID'; // Replace with your client ID

// Google Login
exports.loginWithGoogle = async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ message: 'No token provided' });

  try {
    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        email,
        name,
        googleId,
        // Add other fields as needed
      });
    }

    // Generate JWT or session
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'YOUR_JWT_SECRET', { expiresIn: '7d' });
    res.json({ token, user });
  } catch (err) {
    res.status(401).json({ message: 'Invalid Google token', error: err.message });
  }
};

// Apple Login
exports.loginWithApple = async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ message: 'No token provided' });

  try {
    const appleResponse = await appleSignin.verifyIdToken(idToken, {
      audience: process.env.APPLE_BUNDLE_ID || 'YOUR_APP_BUNDLE_ID', // Replace with your app's bundle ID
      ignoreExpiration: false,
    });
    const { email, sub: appleId } = appleResponse;

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        email,
        appleId,
        // Add other fields as needed
      });
    }

    // Generate JWT or session
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'YOUR_JWT_SECRET', { expiresIn: '7d' });
    res.json({ token, user });
  } catch (err) {
    res.status(401).json({ message: 'Invalid Apple token', error: err.message });
  }
}; 