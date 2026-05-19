const mongoose = require('mongoose');

// backend/models/ContratVente.js (devrait ressembler à ça)
const contratVenteSchema = new mongoose.Schema({
  numeroContrat: { type: String, required: true, unique: true },
  produit: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quantite: { type: Number, required: true },
  prixUnitaire: { type: Number, required: true },
  montantTotal: { type: Number, required: true },
  dateDebut: { type: Date, required: true },
  dateFin: { type: Date, required: true },
  conditionsPaiement: { type: String, default: '' },
  statut: { type: String, enum: ['Brouillon', 'En Cours', 'Terminé', 'Annulé'], default: 'Brouillon' }
}, { timestamps: true });

module.exports = mongoose.model('ContratVente', contratVenteSchema);