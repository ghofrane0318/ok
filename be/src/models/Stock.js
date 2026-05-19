const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  product: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true 
  },
  quantity: { 
    type: Number, 
    required: true,
    default: 0
  },
  seuilMin: { 
    type: Number, 
    default: 100 
  },
  dateDerniereMiseAJour: { 
    type: Date, 
    default: Date.now 
  },
  alerteActive: { 
    type: Boolean, 
    default: false 
  }
});

module.exports = mongoose.model('Stock', stockSchema);