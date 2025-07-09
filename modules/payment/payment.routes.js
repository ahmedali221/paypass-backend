const express = require('express');
const router = express.Router();
const paymentController = require('./payment.controller');
const auth = require('../../middleware/auth');

// Test endpoint for debugging (must come before /:id route)
router.get('/test-result', paymentController.testPaymentResult);

// HyperPay payment result handling (must come before /:id route)
router.get('/result', paymentController.handlePaymentResult); // No auth required for HyperPay callback

// POST /payments now requires { package, car, amount, method } in body
// Returns: { payment, userPackage }
router.post('/', auth, paymentController.createPayment);
router.get('/', auth, paymentController.getPayments);
router.get('/:id', auth, paymentController.getPayment);
router.put('/:id', auth, paymentController.updatePayment);
router.delete('/:id', auth, paymentController.deletePayment);
router.post('/hyperpay-checkout', auth, paymentController.createHyperpayCheckout);
router.post('/create-from-hyperpay', auth, paymentController.createPaymentFromHyperPay);

module.exports = router; 