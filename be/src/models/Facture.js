const mongoose = require("mongoose");

const factureSchema = new mongoose.Schema({
  numeroFacture: { type: String, required: true, unique: true },
  typeFacture: { type: mongoose.Schema.Types.ObjectId, ref: 'TypeFacture' },
  contrat: { type: mongoose.Schema.Types.ObjectId, ref: 'Contrat' },
  commande: { type: mongoose.Schema.Types.ObjectId, ref: 'Commande' },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  montantHT: { type: Number, default: 0 },
  tva: { type: Number, default: 19 },
  montantTTC: { type: Number, default: 0 },
  devise: { type: String, default: 'TND' },
  dateFacture: { type: Date, default: Date.now },
  dateCreation: { type: Date, default: Date.now },
  dateEcheance: { type: Date },
  statut: {
    type: String,
    enum: ['En attente', 'Payée', 'Annulée'],
    default: 'En attente'
  }
}, { timestamps: true });

module.exports = mongoose.models.Facture || mongoose.model('Facture', factureSchema);