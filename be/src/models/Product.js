// backend/models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  type: { type: String, enum: ['STEG', 'STIR'], default: 'STEG' },
  description: { type: String, default: '' },
  unite: { type: String, default: 'm³' },
  prixUnitaire: { type: Number, required: true, min: 0 },
  stockInitial: { type: Number, default: 0, min: 0 },
  codeProduit: { type: String, unique: true, sparse: true },
  category: { type: String, default: 'Autre' },
  typeProduit: { type: mongoose.Schema.Types.ObjectId, ref: 'TypeProduit' },
  uniteMesure: { type: String, enum: ['Litres', 'Barils', 'm³', 'Tonnes'], default: 'Litres' },
  prix: { type: Number, default: 0 }
}, { timestamps: true });

// Middleware pour générer un code UNIQUE automatiquement
productSchema.pre('save', async function(next) {
  if (!this.codeProduit) {
    const prefix = this.type === 'STEG' ? 'STEG' : 'STIR';
    const cleanNom = this.nom.replace(/[^a-zA-Z0-9]/g, '').substring(0, 5).toUpperCase();
    const Product = mongoose.model('Product');

    // Boucle pour générer un code unique (max 10 tentatives)
    let attempts = 0;
    let codeUnique = false;

    while (!codeUnique && attempts < 10) {
      const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
      const candidateCode = `${prefix}-${cleanNom}-${random}`;
      const existing = await Product.findOne({ codeProduit: candidateCode });
      if (!existing) {
        this.codeProduit = candidateCode;
        codeUnique = true;
      }
      attempts++;
    }

    // Fallback ultime avec timestamp
    if (!codeUnique) {
      this.codeProduit = `${prefix}-${cleanNom}-${Date.now().toString().slice(-6)}`;
    }
  }
  next();
});

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);
