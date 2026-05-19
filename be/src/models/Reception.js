const mongoose = require('mongoose');

const receptionSchema = new mongoose.Schema({
  numeroReception: { type: String, required: true, unique: true },
  contrat: { type: mongoose.Schema.Types.ObjectId, ref: 'Contrat', required: true },
  dateReception: { type: Date, default: Date.now },
  produits: [{
    sousProduit: { type: mongoose.Schema.Types.ObjectId, ref: 'SousProduit' },
    quantite: Number,
    prixUnitaire: Number
  }],
  origine: { type: mongoose.Schema.Types.ObjectId, ref: 'Pays' },
  statut: { type: String, enum: ['En cours', 'Terminé', 'Annulé'], default: 'En cours' },
  documentDouanier: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
  dateCreation: { type: Date, default: Date.now },
  dateModification: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Reception', receptionSchema);