const express = require('express');
const router = express.Router();
const washController = require('./wash.controller');
const auth = require('../../middleware/auth');

router.post('/', auth, washController.createWash);
router.get('/', auth, washController.getWashes);
router.get('/by-owner', auth, washController.getWashesByOwner);
router.get('/:id', auth, washController.getWash);
router.put('/:id', auth, washController.updateWash);
router.delete('/:id', auth, washController.deleteWash);
router.post('/scan-barcode', washController.scanBarcodeAndDeductWash);

module.exports = router; 