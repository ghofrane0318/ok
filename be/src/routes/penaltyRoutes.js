const express = require('express');
const router = express.Router();
const penaltyController = require('../controllers/penaltyController');

router.get('/user/:userId', penaltyController.getUserPenalties);
router.post('/calculate', penaltyController.calculateAllPenalties);
router.post('/:id/pay', penaltyController.payPenalty);

module.exports = router;