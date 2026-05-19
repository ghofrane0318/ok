const mongoose = require('mongoose');

const tiersSchema = new mongoose.Schema({
  raisonSociale: {
    type: String,
    required: [true, 'La raison sociale est requise'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Le code est requis'],
    unique: true,
    trim: true,
    uppercase: true
  },
  type: {
    type: Number,
    enum: [0, 1],
    required: true,
    default: 0,
    comment: '0 = Client, 1 = Fournisseur'
  },
  matriculeFiscale: {
    type: String,
    trim: true,
    uppercase: true
  },
  adresse: {
    type: String,
    default: ''
  },
  telephone: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  responsable: {
    type: String,
    default: ''
  },
  actif: {
    type: Boolean,
    default: true
  },
  role: { type: String, enum: [ 'Fournisseur', 'Client']

   },
   nom:String

}, {
  timestamps: true
});

module.exports = mongoose.model('Tiers', tiersSchema);