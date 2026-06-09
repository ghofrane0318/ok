const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');
const commandeController = require('../controllers/commandeController');

// Route de test (sans auth)
router.get('/test', (req, res) => {
  res.json({ message: '✅ Route commandes fonctionne!', timestamp: new Date() });
});

// Routes protégées
router.get('/client', protect, authorizeRoles('Client'), commandeController.getClientCommandes);
router.get('/', protect, commandeController.getCommandes);
router.get('/:id', protect, commandeController.getCommandeById);
router.post('/', protect, authorizeRoles('Client'), commandeController.createCommande);
router.patch('/:id/valider', protect, authorizeRoles('Commercial', 'Admin'), commandeController.validerCommande);

// Route pour supprimer une commande (Admin et Commercial uniquement)
router.delete('/:id', protect, authorizeRoles('Admin', 'Commercial'), commandeController.deleteCommande);

module.exports = router;