// models/Facture.js
const mongoose = require('mongoose');

const factureSchema = new mongoose.Schema({
  numeroFacture: { type: String, required: true, unique: true },
  typeFacture: { type: mongoose.Schema.Types.ObjectId, ref: 'TypeFacture' },
  contrat: { type: mongoose.Schema.Types.ObjectId, ref: 'Contrat' },
  montantHT: { type: Number, required: true },
  montantTTC: { type: Number, required: true },
  devise: { type: String, default: 'TND' },
  dateCreation: { type: Date, default: Date.now },
  dateEcheance: { type: Date, required: true },
  statut: { type: String, enum: ['En attente', 'Payée', 'Annulée'], default: 'En attente' },
  pdfPath: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Facture', factureSchema);