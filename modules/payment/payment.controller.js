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

// Test endpoint for payment result (for debugging)
exports.testPaymentResult = async (req, res) => {
  try {
    console.log('Test payment result handler called');
    console.log('Query params:', req.query);
    
    const { id: transactionId, resourcePath } = req.query;
    
    if (!transactionId) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }

    // For testing, just return the parameters we received
    return res.status(200).json({
      success: true,
      transactionId,
      resourcePath,
      decodedResourcePath: decodeURIComponent(resourcePath),
      message: 'Test endpoint - parameters received successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test payment result error:', error);
    return res.status(500).json({ 
      error: 'Test endpoint error',
      details: error.message 
    });
  }
};

// HyperPay payment result handler
exports.handlePaymentResult = async (req, res) => {
  try {
    console.log('Payment result handler called');
    console.log('Query params:', req.query);
    console.log('Headers:', req.headers);
    
    const { id: transactionId, resourcePath } = req.query;
    
    if (!transactionId) {
      console.log('No transaction ID provided');
      return res.status(400).json({ error: 'Transaction ID is required' });
    }

    console.log('Processing transaction:', transactionId);
    console.log('Resource path:', resourcePath);

    // Decode the resourcePath if it's URL-encoded
    const decodedResourcePath = decodeURIComponent(resourcePath);
    console.log('Decoded resource path:', decodedResourcePath);

    // Verify payment status with HyperPay
    const hyperpayUrl = `https://eu-test.oppwa.com${decodedResourcePath}`;
    console.log('Calling HyperPay URL:', hyperpayUrl);

    const response = await axios.get(
      hyperpayUrl,
      {
        headers: {
          Authorization: 'Bearer OGFjN2E0Yzc5NDgzMDkyNjAxOTQ4MzY2MzY1ZDAxMTZ8NnpwP1Q9Y3dGTiUyYWN6NmFmQWo='
        },
        params: {
          entityId: '8ac7a4c79483092601948366b9d1011b' // Add the required entityId
        }
      }
    );

    console.log('HyperPay response status:', response.status);
    console.log('HyperPay response data:', response.data);

    const paymentStatus = response.data.result.code;
    const paymentMessage = response.data.result.description;

    // Check if payment was successful - HyperPay success codes
    const successCodes = [
      '000.100.110', // Success
      '000.000.000', // Success
      '000.100.112', // Success (Connector Test Mode)
      '000.200.000', // Success
      '800.400.500', // Success (for some payment types)
      '800.400.501', // Success (for some payment types)
      '800.400.502', // Success (for some payment types)
    ];
    
    if (successCodes.includes(paymentStatus)) {
      // Payment successful - create payment record and user package
      console.log('Payment successful, creating records...');
      
      try {
        // Check database connection
        const mongoose = require('mongoose');
        console.log('Database connection state:', mongoose.connection.readyState);
        if (mongoose.connection.readyState !== 1) {
          console.error('Database not connected!');
          throw new Error('Database connection not ready');
        }
        
        // For now, we'll create a basic payment record
        // In a real implementation, you'd get the order details from session or database
        const userId = req.query.userId || '64f1a2b3c4d5e6f7a8b9c0d1'; // Default user ID for testing
        const packageId = req.query.packageId || '64f1a2b3c4d5e6f7a8b9c0d2'; // Default package ID for testing
        const carId = req.query.carId || '64f1a2b3c4d5e6f7a8b9c0d3'; // Default car ID for testing
        
        console.log('Received IDs:', { userId, packageId, carId });
        
        // Validate that the IDs are valid MongoDB ObjectIds or handle string IDs
        const isValidObjectId = (id) => {
          return mongoose.Types.ObjectId.isValid(id);
        };
        
        // If the IDs are not valid ObjectIds, we'll use default ones for demo purposes
        const finalUserId = isValidObjectId(userId) ? userId : '64f1a2b3c4d5e6f7a8b9c0d1';
        const finalPackageId = isValidObjectId(packageId) ? packageId : '64f1a2b3c4d5e6f7a8b9c0d2';
        const finalCarId = isValidObjectId(carId) ? carId : '64f1a2b3c4d5e6f7a8b9c0d3';
        
        console.log('Final IDs:', { finalUserId, finalPackageId, finalCarId });
        
        const paymentData = {
          user: finalUserId,
          package: finalPackageId,
          amount: parseFloat(response.data.amount) || 225.00,
          method: 'hyperpay',
          status: 'completed',
          transactionId: transactionId,
          paymentDetails: response.data
        };

        console.log('Payment data to save:', paymentData);

        // Test database operations first
        console.log('Testing database operations...');
        try {
          const testPayment = new Payment({
            user: finalUserId,
            package: finalPackageId,
            amount: 1.00,
            method: 'test',
            status: 'completed',
            transactionId: 'test-' + Date.now()
          });
          await testPayment.save();
          console.log('Test payment saved successfully:', testPayment._id);
          await Payment.findByIdAndDelete(testPayment._id);
          console.log('Test payment deleted successfully');
        } catch (testError) {
          console.error('Test database operation failed:', testError);
          throw testError;
        }

        // Test UserPackage model
        console.log('Testing UserPackage model...');
        try {
          const testUserPackage = new UserPackage({
            user: finalUserId,
            package: finalPackageId,
            car: finalCarId,
            barcode: 'test-barcode-' + Date.now(),
            barcodeImage: '',
            washesLeft: 1,
            expiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
            status: 'active'
          });
          await testUserPackage.save();
          console.log('Test UserPackage saved successfully:', testUserPackage._id);
          await UserPackage.findByIdAndDelete(testUserPackage._id);
          console.log('Test UserPackage deleted successfully');
        } catch (testError) {
          console.error('Test UserPackage operation failed:', testError);
          throw testError;
        }

        // Create payment record
        const payment = new Payment(paymentData);
        console.log('Payment model created, attempting to save...');
        await payment.save();
        console.log('Payment record created successfully:', payment._id);

        // Get package details for user package creation
        console.log('Looking for package with ID:', finalPackageId);
        const pkg = await Package.findById(finalPackageId);
        if (!pkg) {
          console.log('Package not found, using default values');
        } else {
          console.log('Package found:', pkg.name);
        }

        // Generate unique barcode string
        const barcode = crypto.randomBytes(12).toString('hex');
        console.log('Generated barcode:', barcode);
        
        // Generate QR code image
        console.log('Generating QR code...');
        let barcodeImage;
        try {
          barcodeImage = await generateQRCode(barcode);
          console.log('QR code generated successfully');
        } catch (qrError) {
          console.error('QR code generation failed:', qrError);
          barcodeImage = ''; // Use empty string as fallback
        }
        
        // Calculate expiry
        const expiry = new Date();
        const durationDays = pkg ? pkg.duration : 30; // Default 30 days if package not found
        expiry.setDate(expiry.getDate() + durationDays);
        console.log('Expiry date calculated:', expiry);
        
        // Create UserPackage
        const userPackageData = {
          user: finalUserId,
          package: finalPackageId,
          car: finalCarId,
          barcode,
          barcodeImage,
          washesLeft: pkg ? pkg.washes : 5, // Default 5 washes if package not found
          expiry,
          status: 'active',
        };

        console.log('UserPackage data to save:', userPackageData);

        const userPackage = new UserPackage(userPackageData);
        console.log('UserPackage model created, attempting to save...');
        await userPackage.save();
        console.log('UserPackage created successfully:', userPackage._id);

        // Handle referral rewards if this is the user's first purchase
        const userPackagesCount = await UserPackage.countDocuments({ user: finalUserId });
        
        if (userPackagesCount === 1) {
          console.log('First purchase detected, checking for referral rewards...');
          // Find the user to check if they were referred
          const user = await User.findById(finalUserId);
          if (user && user.referredBy) {
            console.log('User was referred, processing rewards...');
            const referral = await Referral.findOne({ invitee: finalUserId, status: 'pending' });
            if (referral) {
              // Add 2 free washes to inviter
              let inviterPackage = await UserPackage.findOne({ user: user.referredBy, status: 'active' }).sort({ createdAt: -1 });
              if (inviterPackage) {
                inviterPackage.washesLeft += 2;
                await inviterPackage.save();
                console.log('Added 2 washes to inviter package');
              } else {
                // Create reward package for inviter
                const rewardExpiry = new Date();
                rewardExpiry.setDate(rewardExpiry.getDate() + 30);
                const rewardPackage = new UserPackage({
                  user: user.referredBy,
                  package: finalPackageId,
                  car: null,
                  barcode: crypto.randomBytes(12).toString('hex'),
                  barcodeImage: '',
                  washesLeft: 2,
                  expiry: rewardExpiry,
                  status: 'active',
                });
                await rewardPackage.save();
                console.log('Created reward package for inviter');
              }
              
              // Add 2 free washes to the referred user's new package
              userPackage.washesLeft += 2;
              await userPackage.save();
              console.log('Added 2 washes to referred user package');
              
              // Update referral status
              referral.status = 'rewarded';
              referral.rewardGiven = true;
              await referral.save();
              console.log('Updated referral status to rewarded');
              
              // Send notifications
              await sendNotification({
                user: user.referredBy,
                type: 'referral',
                message: 'لقد حصلت على غسلتين مجانيتين كمكافأة لإحالة صديق!',
              });
              await sendNotification({
                user: finalUserId,
                type: 'referral',
                message: 'لقد حصلت على غسلتين مجانيتين كمكافأة على أول عملية شراء لك!',
              });
              console.log('Referral notifications sent');
            }
          }
        }
        
        console.log('Payment successful');
        return res.status(200).json({
          success: true,
          transactionId,
          status: paymentStatus,
          message: paymentMessage,
          paymentId: payment._id,
          userPackageId: userPackage._id,
          qrCode: barcode,
          data: response.data
        });
      } catch (dbError) {
        console.error('Database error creating records:', dbError);
        return res.status(500).json({
          success: false,
          transactionId,
          status: 'error',
          message: 'Payment verified but failed to create records',
          details: dbError.message
        });
      }
    } else {
      // Payment failed
      console.log('Payment failed:', paymentStatus);
      return res.status(400).json({
        success: false,
        transactionId,
        status: paymentStatus,
        message: paymentMessage,
        data: response.data
      });
    }
  } catch (error) {
    console.error('Payment result handler error:', error);
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
    
    // If HyperPay returns an error, we should still return a proper response
    if (error.response?.data) {
      return res.status(400).json({
        success: false,
        transactionId: req.query.id,
        status: 'error',
        message: 'Payment verification failed',
        details: error.response.data
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to process payment result',
      details: error.message 
    });
  }
};

// Create payment from HyperPay result
exports.createPaymentFromHyperPay = async (req, res) => {
  try {
    const { 
      transactionId, 
      package: packageId, 
      car: carId, 
      amount, 
      method = 'hyperpay' 
    } = req.body;

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

    // Create payment record
    const payment = new Payment({ 
      user: req.user._id, 
      package: packageId, 
      amount, 
      method, 
      status: 'completed',
      transactionId // Store HyperPay transaction ID
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

    // Handle referral rewards (same logic as before)
    const userPackagesCount = await UserPackage.countDocuments({ user: req.user._id });
    if (userPackagesCount === 1 && req.user.referredBy) {
      const referral = await Referral.findOne({ invitee: req.user._id, status: 'pending' });
      if (referral) {
        let inviterPackage = await UserPackage.findOne({ user: req.user.referredBy, status: 'active' }).sort({ createdAt: -1 });
        if (inviterPackage) {
          inviterPackage.washesLeft += 2;
          await inviterPackage.save();
        } else {
          const rewardExpiry = new Date();
          rewardExpiry.setDate(rewardExpiry.getDate() + 30);
          const rewardPackage = new UserPackage({
            user: req.user.referredBy,
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

    res.status(201).json({ 
      success: true,
      payment, 
      userPackage,
      qrCode: barcode,
      message: 'Payment completed successfully'
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}; 