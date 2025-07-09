const express = require('express');
const router = express.Router();
const paymentController = require('./payment.controller');
const auth = require('../../middleware/auth');

// POST /payments now requires { package, car, amount, method } in body
// Returns: { payment, userPackage }
router.post('/', auth, paymentController.createPayment);
router.get('/', auth, paymentController.getPayments);
router.get('/:id', auth, paymentController.getPayment);
router.put('/:id', auth, paymentController.updatePayment);
router.delete('/:id', auth, paymentController.deletePayment);
router.post('/hyperpay-checkout', auth, paymentController.createHyperpayCheckout);

// HyperPay payment result handler (no auth required as it's called by HyperPay)
router.post('/hyperpay-result', paymentController.handleHyperpayResult);

module.exports = router; 