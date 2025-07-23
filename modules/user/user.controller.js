const User = require("./user.model");
const jwt = require("jsonwebtoken");
const UserPackage = require("../package/userPackage.model");
const Package = require("../package/package.model");
const Referral = require("./referral.model");
const crypto = require("crypto");
const { generateOTP, isOTPValid } = require("../../services/otp");
const { sendNotification } = require("../../services/notification");
const admin = require('../../config/firebase');

exports.register = async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json({ message: "User registered" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });
    const isMatch = await user.comparePassword(req.body.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    const userData = user.toObject();
    delete userData.password;
    res.json({ token, user: userData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user._id, req.body, {
      new: true,
    }).select("-password");
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteProfile = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getActiveUserPackages = async (req, res) => {
  try {
    const userPackages = await UserPackage.find({
      user: req.user._id,
      status: "active",
      expiry: { $gt: new Date() },
    }).populate("package");
    res.json(userPackages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.generateReferralLink = async (req, res) => {
  try {
    if (!req.user.referralCode) {
      req.user.referralCode = crypto.randomBytes(6).toString("hex");
      await req.user.save();
    }
    const link = `${
      process.env.APP_URL || "http://localhost:3000"
    }/register?ref=${req.user.referralCode}`;
    res.json({ referralLink: link });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.acceptReferral = async (req, res) => {
  try {
    const { referralCode } = req.body;
    const inviter = await User.findOne({ referralCode });
    if (!inviter)
      return res.status(400).json({ error: "Invalid referral code" });
    req.user.referredBy = inviter._id;
    await req.user.save();
    await Referral.create({
      inviter: inviter._id,
      invitee: req.user._id,
      status: "pending",
    });
    res.json({ message: "Referral accepted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.rewardReferral = async (req, res) => {
  try {
    const { inviteeId } = req.body;
    const referral = await Referral.findOne({
      invitee: inviteeId,
      status: "pending",
    });
    if (!referral)
      return res
        .status(400)
        .json({ error: "Referral not found or already rewarded" });
    referral.status = "rewarded";
    referral.rewardGiven = true;
    await referral.save();
    // TODO: Add logic to give inviter a free wash (e.g., add to UserPackage)
    res.json({ message: "Referral reward granted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.sendOTP = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "Phone number required" });
    const otp = generateOTP();
    req.user.otp = otp;
    req.user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry
    await req.user.save();
    await sendNotification({
      user: req.user._id,
      type: "otp",
      message: `Your OTP code is: ${otp}`,
      phone,
    });
    res.json({ message: "OTP sent" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ error: "OTP required" });
    if (!req.user.otp || !req.user.otpExpires)
      return res.status(400).json({ error: "No OTP set" });
    if (!isOTPValid(req.user, otp))
      return res.status(400).json({ error: "Invalid or expired OTP" });
    // Clear OTP fields
    req.user.otp = undefined;
    req.user.otpExpires = undefined;
    await req.user.save();
    res.json({ message: "OTP verified successfully (demo mode)" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getReferralStatus = async (req, res) => {
  try {
    // Referrals where user is inviter (sent invites)
    const sent = await Referral.find({ inviter: req.user._id }).populate(
      "invitee",
      "name email"
    );
    // Referrals where user is invitee (was invited)
    const received = await Referral.find({ invitee: req.user._id }).populate(
      "inviter",
      "name email"
    );
    res.json({ sent, received });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /users/phone-login-initiate
exports.phoneLoginInitiate = async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number required' });
  const user = await User.findOne({ phone });
  if (user) {
    return res.json({ exists: true });
  }
  return res.status(404).json({ exists: false, message: 'User not found' });
};

// POST /users/phone-login-verify
exports.phoneLoginVerify = async (req, res) => {
  const { phone, firebaseIdToken } = req.body;
  if (!phone || !firebaseIdToken) return res.status(400).json({ error: 'Phone and firebaseIdToken required' });
  try {
    const decoded = await admin.auth().verifyIdToken(firebaseIdToken);
    if (decoded.phone_number !== phone) {
      return res.status(400).json({ error: 'Phone number mismatch' });
    }
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    const userData = user.toObject();
    delete userData.password;
    return res.json({ token, user: userData });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid OTP or token' });
  }
};

// POST /users/phone-signup-initiate
exports.phoneSignupInitiate = async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number required' });
  const user = await User.findOne({ phone });
  if (user) {
    return res.status(409).json({ canRegister: false, message: 'Phone already registered' });
  }
  return res.json({ canRegister: true });
};

// POST /users/phone-signup-verify
exports.phoneSignupVerify = async (req, res) => {
  const { phone, firebaseIdToken, name, email, password, username } = req.body;
  if (!phone || !firebaseIdToken || !name || !email || !password || !username) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const decoded = await admin.auth().verifyIdToken(firebaseIdToken);
    if (decoded.phone_number !== phone) {
      return res.status(400).json({ error: 'Phone number mismatch' });
    }
    let user = await User.findOne({ phone });
    if (user) return res.status(409).json({ error: 'User already exists' });
    user = new User({ phone, name, email, password, username });
    await user.save();
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    const userData = user.toObject();
    delete userData.password;
    return res.json({ token, user: userData });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid OTP or token' });
  }
};
