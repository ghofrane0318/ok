// backend/models/Cabotage.js
const mongoose = require('mongoose');

const cabotageSchema = new mongoose.Schema({
  numeroCabotage: { type: String, required: true, unique: true },
  produit: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  client: { type: String, default: 'STIR' },
  quantite: { type: Number, required: true },
  uniteMesure: { type: String, default: 'm³' },
  origine: { type: String, required: true },
  destination: { type: String, required: true },
  navireId: { type: mongoose.Schema.Types.ObjectId, ref: 'Navire', required: true },
  dateChargement: { type: Date, default: Date.now },
  dateDechargement: { type: Date },
  statut: { 
    type: String, 
    enum: ['planifie', 'en_cours', 'termine', 'annule', 'en_attente'],
    default: 'planifie' 
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Cabotage', cabotageSchema);