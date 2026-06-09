const Commande = require('../models/Commande');
const Tiers = require('../models/Tiers');
const Stock = require('../models/Stock');
const Product = require('../models/Product');
const HistoriqueController = require('./historiqueController');
const ExportImport = require("../models/ExportImport");
const Vente = require("../models/Vente");

// Obtenir toutes les commandes
// GET /api/commandes
exports.getCommandes = async (req, res) => {
  try {
    const [commandes, exports_, ventes] = await Promise.all([
      Commande.find({})
        .populate('client', 'nom prenom email raisonSociale')
        .populate('produits.sousProduit', 'nom prixUnitaire uniteMesure')
        .sort({ dateCommande: -1 })
        .lean(),
      ExportImport.find({})
        .populate('produits.produit', 'nom prixUnitaire uniteMesure')
        .sort({ date: -1 })
        .lean(),
      Vente.find({})
        .sort({ dateVente: -1 })
        .lean()
    ]);

    const normalized = [
      ...commandes.map(c => ({ ...c, _sourceType: 'Commande' })),
      ...exports_.map(e => ({
        _id: e._id,
        _sourceType: 'ExportImport',
        numeroCommande: e.numero,
        montantTotal: e.montantTotal || 0,
        devise: e.devise || 'EUR',
        statut: e.statut,
        dateCommande: e.date,
        produits: e.produits || [],
        client: null
      })),
      ...ventes.map(v => ({
        _id: v._id,
        _sourceType: 'Vente',
        numeroCommande: v.numeroVente,
        montantTotal: v.montant || 0,
        devise: 'TND',
        statut: v.statut,
        dateCommande: v.dateVente,
        produits: [],
        client: { raisonSociale: v.client }
      }))
    ];

    res.json({ success: true, data: normalized });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Obtenir les commandes du client connecté
exports.getClientCommandes = async (req, res) => {
  try {
    const client = await Tiers.findOne({ user: req.user.id, type: 0 });
    
    if (!client) {
      return res.status(404).json({ message: 'Client non trouvé. Veuillez contacter l\'administrateur.' });
    }
    
    const commandes = await Commande.find({ client: client._id })
      .populate('produits.sousProduit', 'nom prixUnitaire uniteMesure')
      .populate('commercial', 'nom email')
      .sort({ dateCreation: -1 });
    
    res.json(commandes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Obtenir une commande par ID
exports.getCommandeById = async (req, res) => {
  try {
    const commande = await Commande.findById(req.params.id)
      .populate('client', 'raisonSociale email')
      .populate('produits.sousProduit', 'nom prixUnitaire uniteMesure')
      .populate('commercial', 'nom email');
    
    if (!commande) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }
    
    res.json(commande);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Créer une commande (AVEC HISTORIQUE)
exports.createCommande = async (req, res) => {
  try {
    const { produits, numeroCommande } = req.body;
    
    const client = await Tiers.findOne({ user: req.user.id, type: 0 });
    if (!client) {
      return res.status(404).json({ message: 'Client non trouvé' });
    }
    
    // Vérifier les stocks
    for (const item of produits) {
      const stock = await Stock.findOne({ product: item.sousProduit });
      if (!stock || stock.quantity < item.quantite) {
        const product = await Product.findById(item.sousProduit);
        return res.status(400).json({ 
          message: `Stock insuffisant pour ${product?.nom || 'le produit'}. Disponible: ${stock?.quantity || 0}` 
        });
      }
    }
    
    const numero = numeroCommande || 'CMD-' + Date.now();
    
    const commande = await Commande.create({
      numeroCommande: numero,
      client: client._id,
      produits,
      statut: 'Attente'
    });
    
    const populatedCommande = await Commande.findById(commande._id)
      .populate('client', 'raisonSociale')
      .populate('produits.sousProduit', 'nom');
    
    // ➜ AJOUT DE L'HISTORIQUE POUR LA CRÉATION
    const detailsProduits = produits.map(p => {
      return `${p.quantite} x ${p.sousProduit}`;
    }).join(', ');
    
    await HistoriqueController.addHistorique({
      entityType: "Commande",
      entityId: commande._id,
      action: "Création",
      details: `Commande #${numero} créée avec ${produits.length} produit(s): ${detailsProduits}`,
      utilisateur: req.user._id,
      ipAddress: req.ip,
    });
    
    res.status(201).json(populatedCommande);
  } catch (err) {
    console.error('Erreur createCommande:', err);
    res.status(400).json({ message: err.message });
  }
};

// Valider/Refuser une commande (AVEC HISTORIQUE)
exports.validerCommande = async (req, res) => {
  try {
    const { statut } = req.body;
    
    const commande = await Commande.findById(req.params.id)
      .populate('client', 'raisonSociale');
    
    if (!commande) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }
    
    const ancienStatut = commande.statut;
    
    if (commande.statut !== 'Attente') {
      return res.status(400).json({ message: 'Cette commande a déjà été traitée' });
    }
    
    if (statut === 'Validée') {
      for (const item of commande.produits) {
        const stock = await Stock.findOne({ product: item.sousProduit });
        if (!stock || stock.quantity < item.quantite) {
          return res.status(400).json({ message: `Stock insuffisant` });
        }
      }
      
      for (const item of commande.produits) {
        await Stock.findOneAndUpdate(
          { product: item.sousProduit },
          { $inc: { quantity: -item.quantite } }
        );
      }
    }
    
    commande.statut = statut;
    commande.commercial = req.user.id;
    commande.dateValidation = Date.now();
    await commande.save();
    
    // ➜ AJOUT DE L'HISTORIQUE POUR LE CHANGEMENT DE STATUT
    let details = '';
    if (statut === 'Validée') {
      details = `Commande #${commande.numeroCommande} validée par ${req.user.nom || req.user.email}`;
    } else if (statut === 'Refusée') {
      details = `Commande #${commande.numeroCommande} refusée par ${req.user.nom || req.user.email}`;
    }
    
    await HistoriqueController.addHistorique({
      entityType: "Commande",
      entityId: commande._id,
      action: "Changement statut",
      ancienStatut: ancienStatut,
      nouveauStatut: statut,
      details: details,
      utilisateur: req.user._id,
      ipAddress: req.ip,
    });
    
    res.json(commande);
  } catch (err) {
    console.error('Erreur validerCommande:', err);
    res.status(400).json({ message: err.message });
  }
};

// Supprimer une commande (AVEC HISTORIQUE)
exports.deleteCommande = async (req, res) => {
  try {
    const commande = await Commande.findById(req.params.id);
    
    if (!commande) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }
    
    // Vérifier si la commande peut être supprimée
    if (commande.statut === 'Validée') {
      return res.status(400).json({ message: 'Impossible de supprimer une commande déjà validée' });
    }
    
    if (commande.statut === 'Livrée') {
      return res.status(400).json({ message: 'Impossible de supprimer une commande déjà livrée' });
    }
    
    // Vérifier si une livraison existe pour cette commande
    const Livraison = require('../models/Livraison');
    const livraison = await Livraison.findOne({ commande: commande._id });
    if (livraison) {
      return res.status(400).json({ message: 'Impossible de supprimer une commande qui a déjà une livraison associée' });
    }
    
    // ➜ AJOUT DE L'HISTORIQUE AVANT LA SUPPRESSION
    await HistoriqueController.addHistorique({
      entityType: "Commande",
      entityId: commande._id,
      action: "Suppression",
      details: `Commande #${commande.numeroCommande} supprimée (statut: ${commande.statut})`,
      utilisateur: req.user._id,
      ipAddress: req.ip,
    });
    
    // Si la commande est refusée ou en attente, on peut la supprimer
    await Commande.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Commande supprimée avec succès' });
  } catch (err) {
    console.error('Erreur deleteCommande:', err);
    res.status(500).json({ message: err.message });
  }
};