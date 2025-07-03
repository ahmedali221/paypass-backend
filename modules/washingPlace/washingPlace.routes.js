const express = require('express');
const router = express.Router();
const washingPlaceController = require('./washingPlace.controller');
const auth = require('../../middleware/auth');

router.post('/',  washingPlaceController.createWashingPlace);
router.get('/', washingPlaceController.getWashingPlaces);
router.get('/:id', washingPlaceController.getWashingPlace);
router.put('/:id', auth, washingPlaceController.updateWashingPlace);
router.delete('/:id', auth, washingPlaceController.deleteWashingPlace);
router.get('/:id/feedbacks', washingPlaceController.getFeedbacksForWashingPlace);

module.exports = router; 