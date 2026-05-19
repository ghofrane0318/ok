// backend/models/Historique.js
const mongoose = require('mongoose');

const historiqueSchema = new mongoose.Schema({
  entityType: {
    type: String,
    enum: ['Commande', 'Facture', 'Contrat', 'Livraison', 'Vente', 'User', 'Product'],
    required: true
  },
  action: {
    type: String,
    enum: ['create', 'update', 'delete', 'validate', 'export', 'import'],
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'entityType',
    required: true
  },
  ancienStatut: {
    type: String,
    default: null
  },
  nouveauStatut: {
    type: String,
    default: null
  },
  details: {
    type: String,
    default: ''
  },
  utilisateur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Index pour optimiser les recherches
historiqueSchema.index({ createdAt: -1 });
historiqueSchema.index({ entityType: 1 });
historiqueSchema.index({ utilisateur: 1 });
historiqueSchema.index({ action: 1 });

module.exports = mongoose.model('Historique', historiqueSchema);