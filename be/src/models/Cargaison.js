const mongoose = require('mongoose');

const cargaisonSchema = new mongoose.Schema({
  livraison: { type: mongoose.Schema.Types.ObjectId, ref: 'Livraison', required: true },
  typeTransport: { type: String, enum: ['Camion', 'Navire'], required: true },
  numeroCargaison: String,
  dateDemarrage: Date,
  dateTerminaison: Date,
  statutTransport: { 
    type: String, 
    enum: ['En attente', 'En cours', 'Terminé'], 
    default: 'En attente' 
  },
  commentaire: String,
  dateCreation: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Cargaison', cargaisonSchema);