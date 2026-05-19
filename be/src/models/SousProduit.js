// backend/models/SousProduit.js
const mongoose = require('mongoose');

const sousProduitSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Le nom est requis'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Le code est requis'],
    unique: true,
    trim: true,
    uppercase: true
  },
  produitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Produit',
    required: true
  },
  prixUnitaire: {
    type: Number,
    required: [true, 'Le prix unitaire est requis'],
    min: 0
  },
  uniteMesure: {
    type: String,
    required: [true, 'L\'unité de mesure est requise'],
    default: 'm³',
    enum: ['m³', 'L', 'T', 'Bbl', 'kg']
  },
  description: {
    type: String,
    default: ''
  },
  actif: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index pour optimiser les recherches
sousProduitSchema.index({ code: 1 }, { unique: true });
sousProduitSchema.index({ nom: 1 });
sousProduitSchema.index({ produitId: 1 });

module.exports = mongoose.model('SousProduit', sousProduitSchema);