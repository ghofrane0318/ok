const Penalty = require('../models/Penalty');
const Commande = require('../models/Commande');
const Notification = require('../models/Notification');
const History = require('../models/History');

// Récupérer les pénalités d'un utilisateur
exports.getUserPenalties = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const penalties = await Penalty.find({ fournisseurId: userId })
      .populate('commandeId', 'numero montantTotal dateCommande dateLivraisonPrevue')
      .sort({ calculatedAt: -1 });
    
    const stats = {
      totalAmount: penalties.reduce((sum, p) => sum + p.penaltyAmount, 0),
      totalPenalties: penalties.length,
      pendingCount: penalties.filter(p => p.status === 'pending').length,
      pendingAmount: penalties.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.penaltyAmount, 0),
      paidCount: penalties.filter(p => p.status === 'paid').length,
      paidAmount: penalties.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.penaltyAmount, 0),
      waivedCount: penalties.filter(p => p.status === 'waived').length,
      waivedAmount: penalties.filter(p => p.status === 'waived').reduce((sum, p) => sum + p.penaltyAmount, 0)
    };
    
    res.json({ penalties, stats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Calculer les pénalités (cron job)
exports.calculateAllPenalties = async (req, res) => {
  try {
    const today = new Date();
    
    const commandes = await Commande.find({
      statut: { $ne: 'livree' },
      dateLivraisonPrevue: { $lt: today }
    }).populate('fournisseurId');
    
    let calculated = 0;
    
    for (const commande of commandes) {
      const delayDays = Math.floor((today - commande.dateLivraisonPrevue) / (1000 * 60 * 60 * 24));
      const penaltyAmount = delayDays * commande.montantTotal * 0.001;
      
      let penalty = await Penalty.findOne({ commandeId: commande._id });
      
      if (!penalty) {
        penalty = new Penalty({
          commandeId: commande._id,
          fournisseurId: commande.fournisseurId._id,
          dueDate: commande.dateLivraisonPrevue,
          delayDays,
          penaltyAmount
        });
        await penalty.save();
        calculated++;
        
        // Créer une notification
        await Notification.create({
          userId: commande.fournisseurId._id,
          userRole: 'Fournisseur',
          type: 'warning',
          title: 'Pénalité de retard',
          message: `Pénalité de ${penaltyAmount.toFixed(2)} TND pour la commande ${commande.numero}`,
          data: { commandeId: commande._id, penaltyId: penalty._id }
        });
      } else if (penalty.delayDays !== delayDays) {
        penalty.delayDays = delayDays;
        penalty.penaltyAmount = penaltyAmount;
        await penalty.save();
      }
    }
    
    res.json({ 
      message: `${calculated} pénalités calculées`,
      totalCommandesTraitees: commandes.length 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Payer une pénalité
exports.payPenalty = async (req, res) => {
  try {
    const { id } = req.params;
    
    const penalty = await Penalty.findById(id);
    if (!penalty) {
      return res.status(404).json({ message: 'Pénalité non trouvée' });
    }
    
    penalty.status = 'paid';
    penalty.paymentDate = new Date();
    await penalty.save();
    
    // Journaliser l'action
    await History.create({
      userId: penalty.fournisseurId,
      userRole: 'Fournisseur',
      userEmail: req.user?.email || 'system',
      action: 'update',
      entityType: 'penalty',
      entityId: penalty._id,
      details: { status: 'paid', amount: penalty.penaltyAmount }
    });
    
    res.json({ success: true, message: 'Paiement effectué' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};