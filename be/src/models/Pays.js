const mongoose = require('mongoose');

const paysSchema = new mongoose.Schema({
  nom: { 
    type: String, 
    required: true, 
    unique: true 
  },
  code: { 
    type: String, 
    required: true, 
    unique: true 
  },
  continent: { 
    type: String, 
    default: 'Europe' 
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Pays', paysSchema);