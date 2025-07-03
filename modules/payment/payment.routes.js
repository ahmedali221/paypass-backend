const express = require('express');
const router = express.Router();
const paymentController = require('./payment.controller');
const auth = require('../../middleware/auth');

router.post('/', auth, paymentController.createPayment);
router.get('/', auth, paymentController.getPayments);
router.get('/:id', auth, paymentController.getPayment);
router.put('/:id', auth, paymentController.updatePayment);
router.delete('/:id', auth, paymentController.deletePayment);

module.exports = router; 