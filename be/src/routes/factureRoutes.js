const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');
const factureController = require('../controllers/factureController');

router.get('/', protect, authorizeRoles('Admin', 'Commercial'), factureController.getFactures);
router.get('/stats', protect, authorizeRoles('Admin', 'Commercial'), factureController.getFacturesStats);
router.get('/:id', protect, authorizeRoles('Admin', 'Commercial'), factureController.getFactureById);
router.post('/', protect, authorizeRoles('Admin', 'Commercial'), factureController.createFacture);
router.patch('/:id/statut', protect, authorizeRoles('Admin', 'Commercial'), factureController.updateStatut);
router.delete('/:id', protect, authorizeRoles('Admin'), factureController.deleteFacture);
router.get('/:id/pdf', protect, factureController.exportFacturePDF);

module.exports = router;