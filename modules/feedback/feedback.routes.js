const express = require('express');
const router = express.Router();
const feedbackController = require('./feedback.controller');
const auth = require('../../middleware/auth');

router.post('/', auth, feedbackController.createFeedback);
router.get('/', feedbackController.getFeedbacks);
router.get('/:id', feedbackController.getFeedback);
router.put('/:id', auth, feedbackController.updateFeedback);
router.delete('/:id', auth, feedbackController.deleteFeedback);
router.get('/washingPlace/:washingPlaceId', feedbackController.getFeedbacksForWashingPlace);

module.exports = router; 