const mongoose = require('mongoose');

const banqueSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  codeSwift: String,
  adresse: String,
  pays: { type: mongoose.Schema.Types.ObjectId, ref: 'Pays' },
  dateCreation: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Banque', banqueSchema);