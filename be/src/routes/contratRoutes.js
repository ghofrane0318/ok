// routes/contratRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');
const Contrat = require('../models/Contrat');

// ==================== LISTE DES CONTRATS ====================
router.get('/', protect, authorizeRoles('Admin', 'Commercial'), async (req, res) => {
  try {
    let contrats;
    
    if (req.user.role === 'Admin' || req.user.role === 'Commercial') {
      contrats = await Contrat.find()
        .populate('tiers', 'raisonSociale type code adresse matriculeFiscale telephone')
        .populate('produits.sousProduit', 'nom prixUnitaire uniteMesure codeProduit')
        .sort({ dateCreation: -1 });
    } else {
      contrats = [];
    }
    
    res.json(contrats);
  } catch (err) {
    console.error('Erreur getContrats:', err);
    res.status(500).json({ message: err.message });
  }
});

// ==================== CRÉER UN CONTRAT ====================
router.post('/', protect, authorizeRoles('Commercial'), async (req, res) => {
  try {
    const contratData = {
      ...req.body,
      createdBy: req.user._id,
      montantTotal: req.body.produits?.reduce((total, p) => total + (p.quantite * p.prixUnitaire), 0) || 0
    };
    
    const contrat = await Contrat.create(contratData);
    const populatedContrat = await Contrat.findById(contrat._id)
      .populate('tiers', 'raisonSociale type')
      .populate('produits.sousProduit', 'nom prixUnitaire uniteMesure');
    
    res.status(201).json(populatedContrat);
  } catch (err) {
    console.error('Erreur createContrat:', err);
    res.status(400).json({ message: err.message });
  }
});

// ==================== MODIFIER UN CONTRAT ====================
router.put('/:id', protect, authorizeRoles('Commercial'), async (req, res) => {
  try {
    const contrat = await Contrat.findById(req.params.id);
    if (!contrat) {
      return res.status(404).json({ message: 'Contrat non trouvé' });
    }
    
    if (contrat.statut === 'Validé') {
      return res.status(400).json({ message: 'Impossible de modifier un contrat déjà validé' });
    }
    
    const updatedData = {
      ...req.body,
      montantTotal: req.body.produits?.reduce((total, p) => total + (p.quantite * p.prixUnitaire), 0) || 0,
      updatedAt: Date.now()
    };
    
    const updatedContrat = await Contrat.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true, runValidators: true }
    ).populate('tiers', 'raisonSociale type')
     .populate('produits.sousProduit', 'nom prixUnitaire uniteMesure');
    
    res.json(updatedContrat);
  } catch (err) {
    console.error('Erreur updateContrat:', err);
    res.status(400).json({ message: err.message });
  }
});

// ==================== VALIDER UN CONTRAT ====================
router.put('/:id/valider', protect, authorizeRoles('Commercial'), async (req, res) => {
  try {
    const contrat = await Contrat.findById(req.params.id);
    if (!contrat) {
      return res.status(404).json({ message: 'Contrat non trouvé' });
    }
    
    if (contrat.statut === 'Validé') {
      return res.status(400).json({ message: 'Ce contrat est déjà validé' });
    }
    
    contrat.statut = 'Validé';
    contrat.dateValidation = Date.now();
    await contrat.save();
    
    const populatedContrat = await Contrat.findById(contrat._id)
      .populate('tiers', 'raisonSociale type')
      .populate('produits.sousProduit', 'nom prixUnitaire uniteMesure');
    
    res.json({ message: 'Contrat validé avec succès', contrat: populatedContrat });
  } catch (err) {
    console.error('Erreur validerContrat:', err);
    res.status(500).json({ message: err.message });
  }
});

// ==================== SUPPRIMER UN CONTRAT ====================
router.delete('/:id', protect, authorizeRoles('Commercial'), async (req, res) => {
  try {
    const contrat = await Contrat.findById(req.params.id);
    if (!contrat) {
      return res.status(404).json({ message: 'Contrat non trouvé' });
    }
    
    if (contrat.statut === 'Validé') {
      return res.status(400).json({ message: 'Impossible de supprimer un contrat déjà validé' });
    }
    
    await Contrat.findByIdAndDelete(req.params.id);
    res.json({ message: 'Contrat supprimé avec succès' });
  } catch (err) {
    console.error('Erreur deleteContrat:', err);
    res.status(400).json({ message: err.message });
  }
});

// ==================== EXPORT PDF ====================
router.get('/:id/export-pdf', protect, async (req, res) => {
  try {
    const contrat = await Contrat.findById(req.params.id)
      .populate('tiers', 'raisonSociale type code adresse matriculeFiscale telephone email')
      .populate('produits.sousProduit', 'nom prixUnitaire uniteMesure codeProduit');
    
    if (!contrat) {
      return res.status(404).json({ message: 'Contrat non trouvé' });
    }
    
    // Vérification des droits
    if (req.user.role !== 'Admin' && req.user.role !== 'Commercial') {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }
    
    // Retourner les données du contrat pour génération PDF côté frontend
    res.json(contrat);
  } catch (error) {
    console.error('Erreur export PDF:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;