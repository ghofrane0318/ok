// backend/models/Port.js
const mongoose = require('mongoose');

const portSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Le nom du port est requis'],
    trim: true,
    unique: true
  },
  code: {
    type: String,
    trim: true,
    unique: true,
    sparse: true
  },
  ville: {
    type: String,
    required: [true, 'La ville est requise'],
    trim: true
  },
  pays: {
    type: String,
    default: 'Tunisie',
    trim: true
  },
  type: {
    type: String,
    enum: ['commerce', 'industriel', 'peche', 'touristique', 'petrolier'],
    default: 'commerce'
  },
  capacite: {
    type: Number,
    default: null,
    min: 0
  },
  latitude: {
    type: Number,
    default: null,
    min: -90,
    max: 90
  },
  longitude: {
    type: Number,
    default: null,
    min: -180,
    max: 180
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

// Index pour les recherches
portSchema.index({ nom: 1 });
portSchema.index({ type: 1 });
portSchema.index({ ville: 1 });

module.exports = mongoose.model('Port', portSchema);