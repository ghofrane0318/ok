const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');
const livraisonController = require('../controllers/livraisonController');

// ================= ROUTES PRINCIPALES =================

// Obtenir toutes les livraisons (Admin voit tout, Transporteur voit ses propres livraisons)
router.get('/', protect, livraisonController.getLivraisons);

// Créer une livraison à partir d'une commande validée (Commercial & Admin)
router.post(
  '/from-commande/:commandeId',
  protect,
  authorizeRoles('Commercial', 'Admin'),
  livraisonController.createLivraisonFromCommande
);

// Mettre à jour l'état d'une livraison (Commercial, Admin, Transporteur)
router.patch(
  '/:id/etat',
  protect,
  authorizeRoles('Commercial', 'Admin', 'Transporteur'),
  livraisonController.updateEtatLivraison
);

// Assigner un transporteur à une livraison (Admin seulement)
router.patch(
  '/:id/assign-transporteur',
  protect,
  authorizeRoles('Admin'),
  livraisonController.assignTransporteur
);

// Obtenir la liste des transporteurs (pour assignation) – Admin & Commercial
// Cette route ne retournera JAMAIS d'erreur 500 (toujours un tableau)
router.get(
  '/transporteurs',
  protect,
  authorizeRoles('Admin', 'Commercial'),
  livraisonController.getTransporteurs
);

// Générer le PDF du bon de livraison
router.get(
  '/:id/pdf',
  protect,
  livraisonController.generateBonLivraisonPDF
);

// Supprimer une livraison (Admin seulement)
router.delete(
  '/:id',
  protect,
  authorizeRoles('Admin'),
  livraisonController.deleteLivraison
);

module.exports = router;