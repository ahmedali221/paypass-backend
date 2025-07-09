const express = require('express');
const router = express.Router();
const packageController = require('./package.controller');
const auth = require('../../middleware/auth');

router.post('/',  packageController.createPackage);
router.get('/', packageController.getPackages);
router.get('/:id', packageController.getPackage);
router.put('/:id', auth, packageController.updatePackage);
router.delete('/:id', auth, packageController.deletePackage);
router.post('/scan-info', auth, packageController.scanInfo);
router.post('/scan-qr', auth, packageController.scanQRCode);
router.post('/start-wash', auth, packageController.startWash);

module.exports = router; 