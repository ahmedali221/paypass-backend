const express = require('express');
const router = express.Router();

router.use('/users', require('../modules/user/user.routes'));
router.use('/cars', require('../modules/car/car.routes'));
router.use('/packages', require('../modules/package/package.routes'));
router.use('/user-packages', require('../modules/package/userPackage.routes'));
router.use('/payments', require('../modules/payment/payment.routes'));
router.use('/washing-places', require('../modules/washingPlace/washingPlace.routes'));
router.use('/washes', require('../modules/wash/wash.routes'));
router.use('/feedbacks', require('../modules/feedback/feedback.routes'));

module.exports = router; 