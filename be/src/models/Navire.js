const mongoose = require('mongoose');

const navireSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  immatriculation: { type: String, unique: true },
  capacite: Number,
  pays: { type: mongoose.Schema.Types.ObjectId, ref: 'Pays' },
  proprietaire: String,
  dateCreation: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Navire', navireSchema);