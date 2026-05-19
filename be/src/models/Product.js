// backend/models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Le nom est requis'],
    trim: true
  },
  type: {
    type: String,
    enum: ['STEG', 'STIR'],
    required: [true, 'Le type est requis']
  },
  description: {
    type: String,
    default: ''
  },
  unite: {
    type: String,
    default: 'm³'
  },
  prixUnitaire: {
    type: Number,
    required: [true, 'Le prix unitaire est requis'],
    min: [0, 'Le prix doit être positif']
  },
  stockInitial: {
    type: Number,
    default: 0,
    min: 0
  },
  codeProduit: {
    type: String,
    unique: true,
    sparse: true  // Permet d'avoir des codes null/undefined
  },
  category: {
    type: String,
    default: 'Autre'
  }
}, {
  timestamps: true
});

// Middleware pour générer un code automatiquement si non fourni
productSchema.pre('save', async function(next) {
  if (!this.codeProduit) {
    const prefix = this.type === 'STEG' ? 'STEG' : 'STIR';
    const cleanNom = this.nom.replace(/[^a-zA-Z0-9]/g, '').substring(0, 5).toUpperCase();
    const count = await mongoose.model('Product').countDocuments({ type: this.type });
    this.codeProduit = `${prefix}-${cleanNom}-${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);