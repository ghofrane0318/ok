const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  type: { type: String, enum: ['Facture', 'BonLivraison', 'Contrat', 'CertificatDouanier'], required: true },
  referenceId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'type' },
  filePath: { type: String, required: true },
  dateGeneration: { type: Date, default: Date.now },
  generePar: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Document', documentSchema);