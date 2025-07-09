const Payment = require('./payment.model');
const Package = require('../package/package.model');
const Car = require('../car/car.model');
const UserPackage = require('../package/userPackage.model');
const { generateQRCode } = require('../../services/barcode');
const crypto = require('crypto');
const Referral = require('../user/referral.model');
const User = require('../user/user.model');
const { sendNotification } = require('../../services/notification');
const axios = require('axios');

exports.createPayment = async (req, res) => {
  try {
    const { package: packageId, car: carId, amount, method } = req.body;
    // Validate car
    const car = await Car.findOne({ _id: carId, user: req.user._id });
    if (!car) return res.status(400).json({ error: 'Car not found' });
    // Validate package
    const pkg = await Package.findById(packageId);
    if (!pkg) return res.status(400).json({ error: 'Package not found' });
    // Enforce car size
    if (car.size !== pkg.size) {
      return res.status(400).json({ error: 'Car size does not match package size' });
    }
    // Create payment
    const payment = new Payment({ user: req.user._id, package: packageId, amount, method, status: 'completed' });
    await payment.save();
    // Generate unique barcode string
    const barcode = crypto.randomBytes(12).toString('hex');
    // Generate QR code image
    const barcodeImage = await generateQRCode(barcode);
    // Calculate expiry
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + pkg.duration);
    // Create UserPackage
    const userPackage = new UserPackage({
      user: req.user._id,
      package: packageId,
      car: carId,
      barcode,
      barcodeImage,
      washesLeft: pkg.washes,
      expiry,
      status: 'active',
    });
    await userPackage.save();

    // Referral reward logic: reward inviter with 2 free washes on first purchase
    const userPackagesCount = await UserPackage.countDocuments({ user: req.user._id });
    if (userPackagesCount === 1 && req.user.referredBy) {
      // Find the referral record
      const referral = await Referral.findOne({ invitee: req.user._id, status: 'pending' });
      if (referral) {
        // Find inviter's most recent active UserPackage
        let inviterPackage = await UserPackage.findOne({ user: req.user.referredBy, status: 'active' }).sort({ createdAt: -1 });
        if (inviterPackage) {
          inviterPackage.washesLeft += 2;
          await inviterPackage.save();
        } else {
          // Create a new reward package for inviter if none exists
          const rewardExpiry = new Date();
          rewardExpiry.setDate(rewardExpiry.getDate() + 30);
          const rewardPackage = new UserPackage({
            user: req.user.referredBy,
            package: packageId, // or a special reward package if you want
            car: null, // No car associated for reward
            barcode: crypto.randomBytes(12).toString('hex'),
            barcodeImage: '',
            washesLeft: 2,
            expiry: rewardExpiry,
            status: 'active',
          });
          await rewardPackage.save();
        }
        // Add 2 free washes to the referred user's new package
        userPackage.washesLeft += 2;
        await userPackage.save();
        referral.status = 'rewarded';
        referral.rewardGiven = true;
        await referral.save();
        // Send notifications to inviter and referred user
        await sendNotification({
          user: req.user.referredBy,
          type: 'referral',
          message: 'لقد حصلت على غسلتين مجانيتين كمكافأة لإحالة صديق!',
        });
        await sendNotification({
          user: req.user._id,
          type: 'referral',
          message: 'لقد حصلت على غسلتين مجانيتين كمكافأة على أول عملية شراء لك!',
        });
      }
    }

    res.status(201).json({ payment, userPackage });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user._id }).populate('package');
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPayment = async (req, res) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.id, user: req.user._id }).populate('package');
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updatePayment = async (req, res) => {
  try {
    const payment = await Payment.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true }
    );
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    res.json(payment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    res.json({ message: 'Payment deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// HyperPay checkout session creation
exports.createHyperpayCheckout = async (req, res) => {
  try {
    const {
      amount,
      currency,
      merchantTransactionId,
      customerEmail,
      billingStreet1,
      billingCity,
      billingState,
      billingCountry,
      billingPostcode,
      customerGivenName,
      customerSurname
    } = req.body;

    const data = new URLSearchParams({
      entityId: '8ac7a4c79483092601948366b9d1011b',
      amount,
      currency,
      paymentType: 'DB',
      testMode: 'EXTERNAL',
      'customParameters[3DS2_enrolled]': 'true',
      merchantTransactionId,
      'customer.email': customerEmail,
      'billing.street1': billingStreet1,
      'billing.city': billingCity,
      'billing.state': billingState,
      'billing.country': billingCountry,
      'billing.postcode': billingPostcode,
      'customer.givenName': customerGivenName,
      'customer.surname': customerSurname
    });

    const response = await axios.post(
      'https://eu-test.oppwa.com/v1/checkouts',
      data,
      {
        headers: {
          Authorization: 'Bearer OGFjN2E0Yzc5NDgzMDkyNjAxOTQ4MzY2MzY1ZDAxMTZ8NnpwP1Q9Y3dGTiUyYWN6NmFmQWo=',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.response?.data || error.message });
  }
};

// HyperPay payment result handler
exports.handleHyperpayResult = async (req, res) => {
  try {
    // resourcePath and id come from the query string
    const { id: checkoutId, resourcePath } = req.query;
    // form data comes from the body
    const { packageId, carId, userId, amount, method } = req.body;

    if (!checkoutId || !resourcePath) {
      return res.status(400).send('Missing payment data');
    }

    // Server-to-server request to HyperPay
    const verificationResponse = await axios.get(
      `https://eu-test.oppwa.com${resourcePath}`,
      {
        headers: {
          Authorization: 'Bearer OGFjN2E0Yzc5NDgzMDkyNjAxOTQ4MzY2MzY1ZDAxMTZ8NnpwP1Q9Y3dGTiUyYWN6NmFmQWo='
        }
      }
    );

    const paymentResult = verificationResponse.data;

    // Check if payment was successful
    if (paymentResult.result.code === '000.100.110') {
      // Payment successful - create payment record and user package

      // Validate car
      const car = await Car.findOne({ _id: carId, user: userId });
      if (!car) return res.status(400).send('Car not found');

      // Validate package
      const pkg = await Package.findById(packageId);
      if (!pkg) return res.status(400).send('Package not found');

      // Enforce car size
      if (car.size !== pkg.size) {
        return res.status(400).send('Car size does not match package size');
      }

      // Create payment record
      const payment = new Payment({
        user: userId,
        package: packageId,
        amount,
        method: 'hyperpay',
        status: 'completed',
        transactionId: checkoutId,
        hyperpayData: paymentResult
      });
      await payment.save();

      // Generate unique barcode string
      const barcode = crypto.randomBytes(12).toString('hex');

      // Generate QR code image
      const barcodeImage = await generateQRCode(barcode);

      // Calculate expiry
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + pkg.duration);

      // Create UserPackage
      const userPackage = new UserPackage({
        user: userId,
        package: packageId,
        car: carId,
        barcode,
        barcodeImage,
        washesLeft: pkg.washes,
        expiry,
        status: 'active',
      });
      await userPackage.save();

      // Referral reward logic (same as before)
      const userPackagesCount = await UserPackage.countDocuments({ user: userId });
      if (userPackagesCount === 1) {
        const user = await User.findById(userId);
        if (user && user.referredBy) {
          const referral = await Referral.findOne({ invitee: userId, status: 'pending' });
          if (referral) {
            let inviterPackage = await UserPackage.findOne({ user: user.referredBy, status: 'active' }).sort({ createdAt: -1 });
            if (inviterPackage) {
              inviterPackage.washesLeft += 2;
              await inviterPackage.save();
            } else {
              const rewardExpiry = new Date();
              rewardExpiry.setDate(rewardExpiry.getDate() + 30);
              const rewardPackage = new UserPackage({
                user: user.referredBy,
                package: packageId,
                car: null,
                barcode: crypto.randomBytes(12).toString('hex'),
                barcodeImage: '',
                washesLeft: 2,
                expiry: rewardExpiry,
                status: 'active',
              });
              await rewardPackage.save();
            }
            userPackage.washesLeft += 2;
            await userPackage.save();
            referral.status = 'rewarded';
            referral.rewardGiven = true;
            await referral.save();

            // Send notifications
            await sendNotification({
              user: user.referredBy,
              type: 'referral',
              message: 'لقد حصلت على غسلتين مجانيتين كمكافأة لإحالة صديق!',
            });
            await sendNotification({
              user: userId,
              type: 'referral',
              message: 'لقد حصلت على غسلتين مجانيتين كمكافأة على أول عملية شراء لك!',
            });
          }
        }
      }

      // Send success notification
      await sendNotification({
        user: userId,
        type: 'payment',
        message: 'تم الدفع بنجاح! يمكنك الآن استخدام الباقة.',
      });

      // Redirect to your success page
      const successUrl = `http://localhost:8080/payment-success.html?success=true&message=${encodeURIComponent('تم الدفع بنجاح')}&barcode=${barcode}`;
      res.redirect(successUrl);

    } else {
      // Payment failed
      const errorUrl = `http://localhost:8080/payment-success.html?success=false&message=${encodeURIComponent('فشل في الدفع')}`;
      res.redirect(errorUrl);
    }
  } catch (error) {
    console.error('Payment result handler error:', error);
    const errorUrl = `http://localhost:8080/payment-success.html?success=false&message=${encodeURIComponent('حدث خطأ في معالجة الدفع')}`;
    res.redirect(errorUrl);
  }
}; 