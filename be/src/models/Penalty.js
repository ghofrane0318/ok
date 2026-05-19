const mongoose = require('mongoose');

const penaltySchema = new mongoose.Schema({
  commandeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Commande',
    required: true
  },
  fournisseurId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  actualDeliveryDate: {
    type: Date
  },
  delayDays: {
    type: Number,
    required: true
  },
  penaltyAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'waived'],
    default: 'pending'
  },
  paymentDate: {
    type: Date
  },
  calculatedAt: {
    type: Date,
    default: Date.now
  }
});

// Calcul du montant de la pénalité
penaltySchema.methods.calculateAmount = function(montantCommande) {
  const dailyRate = 0.001; // 0.1% par jour
  return this.delayDays * montantCommande * dailyRate;
};

module.exports = mongoose.model('Penalty', penaltySchema);