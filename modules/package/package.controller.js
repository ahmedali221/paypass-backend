const UserPackage = require("./userPackage.model");
const Wash = require("../wash/wash.model");
const User = require("../user/user.model");
const Package = require("./package.model");
const WashingPlace = require("../washingPlace/washingPlace.model");
const { sendNotification } = require("../../services/notification");

exports.createPackage = async (req, res) => {
  try {
    const pkg = new Package(req.body);
    await pkg.save();
    res.status(201).json(pkg);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getPackages = async (req, res) => {
  try {
    const pkgs = await Package.find();
    res.json(pkgs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPackage = async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id);
    if (!pkg) return res.status(404).json({ error: "Package not found" });
    res.json(pkg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updatePackage = async (req, res) => {
  try {
    const pkg = await Package.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!pkg) return res.status(404).json({ error: "Package not found" });
    res.json(pkg);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deletePackage = async (req, res) => {
  try {
    const pkg = await Package.findByIdAndDelete(req.params.id);
    if (!pkg) return res.status(404).json({ error: "Package not found" });
    res.json({ message: "Package deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Owner scans QR code to start a wash
exports.scanQRCode = async (req, res) => {
  try {
    // Only allow owners
    if (!req.user || req.user.role !== "owner") {
      return res.status(403).json({ error: "Access denied" });
    }
    const { barcode, washingPlaceId } = req.body;
    if (!barcode || !washingPlaceId) {
      return res
        .status(400)
        .json({ error: "Barcode and washingPlaceId are required" });
    }
    // Find the user package by barcode
    const userPackage = await UserPackage.findOne({ barcode }).populate(
      "user package"
    );
    if (!userPackage) {
      return res.status(404).json({ error: "User package not found" });
    }
    // Validate package
    if (userPackage.status !== "active") {
      return res.status(400).json({ error: "Package is not active" });
    }
    if (userPackage.expiry < new Date()) {
      userPackage.status = "expired";
      await userPackage.save();
      return res.status(400).json({ error: "Package has expired" });
    }
    if (userPackage.washesLeft <= 0) {
      userPackage.status = "used";
      await userPackage.save();
      return res.status(400).json({ error: "No washes left in this package" });
    }
    // Decrement washesLeft
    userPackage.washesLeft -= 1;
    if (userPackage.washesLeft === 0) {
      userPackage.status = "used";
    }
    await userPackage.save();
    // Create a new wash record
    const wash = new Wash({
      user: userPackage.user._id,
      washingPlace: washingPlaceId,
      package: userPackage.package._id,
      status: "scheduled",
    });
    await wash.save();

    // Schedule feedback reminder notification after 30 minutes
    setTimeout(async () => {
      await sendNotification({
        user: userPackage.user._id,
        type: "feedback",
        message:
          "يرجى تقييم تجربتك مع محطة الغسيل وإضافة صورة لسيارتك بعد الغسيل!",
        relatedWash: wash._id,
      });
    }, 30 * 60 * 1000);

    res.json({
      message: "Wash started",
      washesLeft: userPackage.washesLeft,
      wash,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Start a wash (after confirmation)
exports.startWash = async (req, res) => {
  try {
    // Only allow owners
    if (!req.user || req.user.role !== "owner") {
      return res.status(403).json({ error: "Access denied" });
    }
    const { barcode, washingPlaceId } = req.body;
    if (!barcode || !washingPlaceId) {
      return res
        .status(400)
        .json({ error: "Barcode and washingPlaceId are required" });
    }
    // Find the user package by barcode
    const userPackage = await UserPackage.findOne({ barcode }).populate(
      "user package"
    );
    if (!userPackage) {
      return res.status(404).json({ error: "User package not found" });
    }
    // Validate package
    if (userPackage.status !== "active") {
      return res.status(400).json({ error: "Package is not active" });
    }
    if (userPackage.expiry < new Date()) {
      userPackage.status = "expired";
      await userPackage.save();
      return res.status(400).json({ error: "Package has expired" });
    }
    if (userPackage.washesLeft <= 0) {
      userPackage.status = "used";
      await userPackage.save();
      return res.status(400).json({ error: "No washes left in this package" });
    }
    // Decrement washesLeft
    userPackage.washesLeft -= 1;
    if (userPackage.washesLeft === 0) {
      userPackage.status = "used";
    }
    await userPackage.save();
    // Create a new wash record
    const wash = new Wash({
      user: userPackage.user._id,
      washingPlace: washingPlaceId,
      package: userPackage.package._id,
      status: "scheduled",
    });
    await wash.save();

    // Schedule feedback reminder notification after 30 minutes
    setTimeout(async () => {
      await sendNotification({
        user: userPackage.user._id,
        type: "feedback",
        message:
          "يرجى تقييم تجربتك مع محطة الغسيل وإضافة صورة لسيارتك بعد الغسيل!",
        relatedWash: wash._id,
      });
    }, 30 * 60 * 1000); // 30 minutes in milliseconds

    res.json({
      message: "Wash started",
      washesLeft: userPackage.washesLeft,
      wash,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Fetch user/package info by barcode (no wash started)
exports.scanInfo = async (req, res) => {
  try {
    // Only allow owners
    if (!req.user || req.user.role !== "owner") {
      return res.status(403).json({ error: "Access denied" });
    }
    const { barcode } = req.body;
    if (!barcode) {
      return res.status(400).json({ error: "Barcode is required" });
    }
    // Find the user package by barcode
    const userPackage = await UserPackage.findOne({ barcode }).populate(
      "user package"
    );
    if (!userPackage) {
      return res.status(404).json({ error: "User package not found" });
    }
    // Validate package
    if (userPackage.status !== "active") {
      return res.status(400).json({ error: "Package is not active" });
    }
    if (userPackage.expiry < new Date()) {
      userPackage.status = "expired";
      await userPackage.save();
      return res.status(400).json({ error: "Package has expired" });
    }
    if (userPackage.washesLeft <= 0) {
      userPackage.status = "used";
      await userPackage.save();
      return res.status(400).json({ error: "No washes left in this package" });
    }
    // Return user, carSize, package, washesLeft
    res.json({
      user: userPackage.user,
      carSize: userPackage.carSize,
      package: userPackage.package,
      washesLeft: userPackage.washesLeft,
      expiry: userPackage.expiry,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
