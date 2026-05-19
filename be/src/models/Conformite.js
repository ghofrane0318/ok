const mongoose = require('mongoose');

const conformiteSchema = new mongoose.Schema({
  document: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Document', 
    required: true 
  },
  typeControle: { 
    type: String, 
    enum: ['Douane', 'Qualité', 'Sécurité'], 
    required: true 
  },
  statut: { 
    type: String, 
    enum: ['Conforme', 'Non conforme'], 
    required: true 
  },
  dateControle: { 
    type: Date, 
    default: Date.now 
  },
  commentaire: { 
    type: String 
  },
  verifiePar: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Conformite', conformiteSchema);