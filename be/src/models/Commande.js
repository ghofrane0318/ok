// backend/src/models/Commande.js - Version complète et unifiée
const mongoose = require('mongoose');

const commandeSchema = new mongoose.Schema({
  // Identifiants
  numeroCommande: { 
    type: String, 
    required: true, 
    unique: true 
  },
  numero: { 
    type: String, 
    unique: true, 
    sparse: true // Alias pour compatibilité
  },
  
  // Relations clients
  client: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Tiers', 
    required: true 
  },
  clientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    sparse: true // Alias pour compatibilité
  },
  fournisseurId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  
  // Commercial qui a validé la commande
  commercial: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  
  // Produits commandés
  produits: [{
    // Références
    sousProduit: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Product' 
    },
    produitId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Produit' 
    },
    product: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Product' 
    },
    
    // Informations produit
    nom: { 
      type: String 
    },
    code: { 
      type: String 
    },
    
    // Quantités et prix
    quantite: { 
      type: Number, 
      required: true,
      min: [0.001, 'La quantité doit être positive']
    },
    prixUnitaire: { 
      type: Number, 
      required: true,
      min: [0, 'Le prix unitaire doit être positif']
    },
    
    // Remises éventuelles
    remise: { 
      type: Number, 
      default: 0,
      min: 0,
      max: 100
    },
    tva: { 
      type: Number, 
      default: 19 
    },
    
    // Montants calculés
    montantHT: { 
      type: Number 
    },
    montantTTC: { 
      type: Number 
    },
    
    // Statut du produit dans la commande
    statut: { 
      type: String, 
      enum: ['en_attente', 'prepare', 'expedie', 'livre', 'annule'],
      default: 'en_attente'
    },
    quantiteLivree: { 
      type: Number, 
      default: 0 
    },
    dateExpedition: Date,
    dateLivraison: Date
  }],
  
  // Montants totaux
  montantTotal: { 
    type: Number, 
    default: 0 
  },
  montantHT: { 
    type: Number, 
    default: 0 
  },
  montantTVA: { 
    type: Number, 
    default: 0 
  },
  montantTTC: { 
    type: Number, 
    default: 0 
  },
  
  // Frais supplémentaires
  fraisLivraison: { 
    type: Number, 
    default: 0 
  },
  fraisEmballage: { 
    type: Number, 
    default: 0 
  },
  remiseGlobale: { 
    type: Number, 
    default: 0 
  },
  
  // Dates
  dateCommande: { 
    type: Date, 
    default: Date.now 
  },
  dateCreation: { 
    type: Date, 
    default: Date.now 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  dateValidation: { 
    type: Date 
  },
  dateLivraisonPrevue: { 
    type: Date, 
    required: true 
  },
  dateLivraisonReelle: { 
    type: Date 
  },
  dateEcheance: { 
    type: Date 
  },
  
  // Statuts
  statut: { 
    type: String, 
    enum: [
      'Attente', 'Validée', 'Refusée',           // Version 1
      'en_attente', 'confirmee', 'en_livraison', 'livree', 'annulee', // Version 2
      'Brouillon', 'Confirmée', 'En préparation', 'Expédiée', 'Livrée', 'Annulée' // Version 3
    ], 
    default: 'en_attente' 
  },
  
  // Informations de livraison
  adresseLivraison: {
    rue: String,
    ville: String,
    codePostal: String,
    pays: String
  },
  adresseFacturation: {
    rue: String,
    ville: String,
    codePostal: String,
    pays: String
  },
  
  // Mode de paiement
  modePaiement: { 
    type: String, 
    enum: ['Especes', 'Cheque', 'Virement', 'Credit', 'Lettre de credit'],
    default: 'Virement' 
  },
  conditionsPaiement: { 
    type: String, 
    default: '30 jours' 
  },
  
  // Documents
  notes: { 
    type: String 
  },
  instructionsLivraison: { 
    type: String 
  },
  
  // Suivi
  suivi: {
    etapes: [{
      titre: String,
      description: String,
      date: { type: Date, default: Date.now },
      utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],
    notifications: [{
      type: String,
      date: Date,
      envoyee: { type: Boolean, default: false }
    }]
  },
  
  // Timestamps
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ==================== INDEX ====================
commandeSchema.index({ numeroCommande: 1 });
commandeSchema.index({ numero: 1 });
commandeSchema.index({ client: 1 });
commandeSchema.index({ clientId: 1 });
commandeSchema.index({ statut: 1 });
commandeSchema.index({ dateCommande: -1 });
commandeSchema.index({ dateLivraisonPrevue: 1 });

// ==================== PRE-SAVE MIDDLEWARE ====================
commandeSchema.pre('save', function(next) {
  // Mettre à jour updatedAt
  this.updatedAt = Date.now();
  
  // Aligner les numéros
  if (!this.numeroCommande && this.numero) {
    this.numeroCommande = this.numero;
  } else if (!this.numero && this.numeroCommande) {
    this.numero = this.numeroCommande;
  }
  
  // Calculer les montants
  if (this.produits && this.produits.length > 0) {
    let montantHT = 0;
    let montantTTC = 0;
    
    this.produits.forEach(produit => {
      // Calculer montant HT
      const montantProduitHT = produit.quantite * produit.prixUnitaire;
      const remiseMontant = montantProduitHT * (produit.remise / 100);
      const montantApresRemise = montantProduitHT - remiseMontant;
      const tvaMontant = montantApresRemise * (produit.tva / 100);
      
      produit.montantHT = montantApresRemise;
      produit.montantTTC = montantApresRemise + tvaMontant;
      
      montantHT += produit.montantHT;
      montantTTC += produit.montantTTC;
    });
    
    // Appliquer remise globale
    const remiseMontant = montantHT * (this.remiseGlobale / 100);
    montantHT -= remiseMontant;
    montantTTC = montantTTC - remiseMontant + this.fraisLivraison + this.fraisEmballage;
    
    this.montantHT = montantHT;
    this.montantTVA = montantTTC - montantHT;
    this.montantTotal = montantHT;
    this.montantTTC = montantTTC;
  }
  
  // Aligner les dates
  if (this.dateValidation && this.statut === 'Validée') {
    // Déjà défini
  } else if (this.statut === 'confirmee' && !this.dateValidation) {
    this.dateValidation = new Date();
  } else if (this.statut === 'Validée' && !this.dateValidation) {
    this.dateValidation = new Date();
  }
  
  // Mettre à jour dateCreation si nécessaire
  if (!this.dateCreation && this.dateCommande) {
    this.dateCreation = this.dateCommande;
  }
  if (!this.createdAt && this.dateCreation) {
    this.createdAt = this.dateCreation;
  }
  
  next();
});

// ==================== POST-SAVE MIDDLEWARE ====================
commandeSchema.post('save', function(doc) {
  console.log(`📝 Commande ${doc.numeroCommande} sauvegardée - Statut: ${doc.statut}`);
});

// ==================== VIRTUALS ====================
commandeSchema.virtual('estLivree').get(function() {
  return this.statut === 'livree' || this.statut === 'Livrée';
});

commandeSchema.virtual('estAnnulee').get(function() {
  return this.statut === 'annulee' || this.statut === 'Annulée' || this.statut === 'Refusée';
});

commandeSchema.virtual('estEnRetard').get(function() {
  if (!this.dateLivraisonPrevue) return false;
  return this.dateLivraisonPrevue < new Date() && !this.estLivree;
});

commandeSchema.virtual('joursDeRetard').get(function() {
  if (!this.estEnRetard) return 0;
  const diff = new Date() - this.dateLivraisonPrevue;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// ==================== METHODS ====================

// Ajouter une étape de suivi
commandeSchema.methods.ajouterEtapeSuivi = async function(titre, description, utilisateurId) {
  if (!this.suivi) {
    this.suivi = { etapes: [], notifications: [] };
  }
  if (!this.suivi.etapes) {
    this.suivi.etapes = [];
  }
  
  this.suivi.etapes.push({
    titre,
    description,
    date: new Date(),
    utilisateur: utilisateurId
  });
  
  this.updatedAt = new Date();
  await this.save();
  return this;
};

// Changer le statut
commandeSchema.methods.changerStatut = async function(nouveauStatut, utilisateurId, raison = null) {
  const ancienStatut = this.statut;
  this.statut = nouveauStatut;
  
  // Mettre à jour dates en fonction du statut
  if (nouveauStatut === 'confirmee' || nouveauStatut === 'Validée') {
    this.dateValidation = new Date();
  }
  if (nouveauStatut === 'livree' || nouveauStatut === 'Livrée') {
    this.dateLivraisonReelle = new Date();
  }
  
  // Ajouter l'étape de suivi
  let description = `Statut changé de ${ancienStatut} à ${nouveauStatut}`;
  if (raison) description += `: ${raison}`;
  
  await this.ajouterEtapeSuivi('Changement de statut', description, utilisateurId);
  
  this.updatedAt = new Date();
  await this.save();
  return this;
};

// Vérifier si un produit peut être livré
commandeSchema.methods.verifierDisponibiliteStock = async function(StockModel) {
  const produitsIndisponibles = [];
  
  for (const produit of this.produits) {
    const stock = await StockModel.findOne({ product: produit.sousProduit || produit.produitId || produit.product });
    if (!stock || stock.quantity < produit.quantite - produit.quantiteLivree) {
      produitsIndisponibles.push({
        produit: produit.nom,
        demande: produit.quantite - produit.quantiteLivree,
        disponible: stock ? stock.quantity : 0
      });
    }
  }
  
  return {
    disponible: produitsIndisponibles.length === 0,
    produitsIndisponibles
  };
};

// Calculer le montant restant
commandeSchema.virtual('montantRestant').get(function() {
  return this.montantTTC - (this.paiementsEffectues || 0);
});

// ==================== STATICS ====================

// Générer un numéro de commande unique
commandeSchema.statics.genererNumeroCommande = async function() {
  const date = new Date();
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const prefix = `CMD-${annee}${mois}`;
  
  const dernierCommande = await this.findOne({
    numeroCommande: { $regex: `^${prefix}` }
  }).sort({ numeroCommande: -1 });
  
  if (!dernierCommande) {
    return `${prefix}-0001`;
  }
  
  const dernierNumero = dernierCommande.numeroCommande;
  const sequence = parseInt(dernierNumero.slice(-4)) + 1;
  return `${prefix}-${String(sequence).padStart(4, '0')}`;
};

// Trouver les commandes en retard
commandeSchema.statics.trouverCommandesEnRetard = function() {
  return this.find({
    statut: { $nin: ['livree', 'Livrée', 'annulee', 'Annulée', 'Refusée'] },
    dateLivraisonPrevue: { $lt: new Date() }
  }).populate('client clientId fournisseurId');
};

// Statistiques par commercial
commandeSchema.statics.statistiquesParCommercial = function(commercialId) {
  return this.aggregate([
    { $match: { commercial: commercialId } },
    { $group: {
      _id: '$statut',
      total: { $sum: 1 },
      montant: { $sum: '$montantTotal' }
    }}
  ]);
};

// ==================== EXPORT ====================
module.exports = mongoose.models.Commande || mongoose.model('Commande', commandeSchema);