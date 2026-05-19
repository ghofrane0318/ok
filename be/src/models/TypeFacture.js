const mongoose = require('mongoose');

const typeFactureSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  libelle: { type: String, required: true },
  description: { type: String, default: '' },
  typeClient: { type: String, enum: ['STEG', 'STIR', 'BOTH'], default: 'STEG' },
  tva: { type: Number, default: 19 },
  devise: { type: String, default: 'TND' },
  actif: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('TypeFacture', typeFactureSchema);