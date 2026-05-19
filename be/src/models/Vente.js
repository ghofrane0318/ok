// models/Vente.js
const mongoose = require('mongoose');

const venteSchema = new mongoose.Schema({
  numeroVente: { 
    type: String, 
    unique: true, 
    required: true 
  },
  dateVente: { 
    type: Date, 
    default: Date.now 
  },
  client: { 
    type: String, 
    default: 'STEG',
    required: true 
  },
  produit: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product',
    required: true 
  },
  quantite: { 
    type: Number, 
    required: true,
    min: 0 
  },
  prixUnitaire: { 
    type: Number, 
    required: true,
    min: 0 
  },
  montantTotal: { 
    type: Number, 
    required: true 
  },
  contratRef: { 
    type: String 
  },
  statut: { 
    type: String, 
    enum: ['en_attente', 'confirmee', 'livree', 'facturee'], 
    default: 'en_attente' 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Vente', venteSchema);