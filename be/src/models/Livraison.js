const mongoose = require('mongoose');

const livraisonSchema = new mongoose.Schema({
  numeroLivraison: { type: String, required: true, unique: true },
  commande: { type: mongoose.Schema.Types.ObjectId, ref: 'Commande', required: true },
  transporteur: { type: mongoose.Schema.Types.ObjectId, ref: 'Tiers' },
  etat: { 
    type: String, 
    enum: ['À préparer', 'Prête', 'En cours', 'Livrée', 'Annulée'], 
    default: 'À préparer' 
  },
  dateDepot: { type: Date, default: Date.now },
  dateArriveePrevue: Date,
  dateLivraison: Date,
  bonLivraisonPDF: String,
  penalite: { type: Number, default: 0 },
  commentaire: String,
  dateCreation: { type: Date, default: Date.now },
  dateDerniereMiseAJour: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Livraison', livraisonSchema);