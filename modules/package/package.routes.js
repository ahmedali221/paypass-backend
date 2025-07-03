const express = require('express');
const router = express.Router();
const packageController = require('./package.controller');
const auth = require('../../middleware/auth');

router.post('/',  packageController.createPackage);
router.get('/', packageController.getPackages);
router.get('/:id', packageController.getPackage);
router.put('/:id', auth, packageController.updatePackage);
router.delete('/:id', auth, packageController.deletePackage);

module.exports = router; 