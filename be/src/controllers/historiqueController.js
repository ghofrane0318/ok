// pfe/be/src/controllers/historiqueController.js
const Historique = require('../models/Historique');

// Récupérer tout l'historique (admin seulement)
const getAllHistorique = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Filtres
    const filters = {};
    if (req.query.entityType) filters.entityType = req.query.entityType;
    if (req.query.search) {
      filters.$or = [
        { details: { $regex: req.query.search, $options: 'i' } },
        { 'utilisateur.nom': { $regex: req.query.search, $options: 'i' } },
        { 'utilisateur.email': { $regex: req.query.search, $options: 'i' } }
      ];
    }
    if (req.query.dateStart) {
      filters.createdAt = { $gte: new Date(req.query.dateStart) };
    }
    if (req.query.dateEnd) {
      const endDate = new Date(req.query.dateEnd);
      endDate.setHours(23, 59, 59);
      filters.createdAt = { ...filters.createdAt, $lte: endDate };
    }
    
    const [historique, total] = await Promise.all([
      Historique.find(filters)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Historique.countDocuments(filters)
    ]);
    
    res.json({
      success: true,
      data: historique,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Erreur getAllHistorique:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Récupérer l'historique de l'utilisateur connecté
const getUserHistorique = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const filters = { 'utilisateur.id': req.user._id };
    if (req.query.entityType) filters.entityType = req.query.entityType;
    
    const [historique, total] = await Promise.all([
      Historique.find(filters)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Historique.countDocuments(filters)
    ]);
    
    res.json({
      success: true,
      data: historique,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Erreur getUserHistorique:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Statistiques (admin seulement)
const getHistoriqueStats = async (req, res) => {
  try {
    const [actionsParType, totalParEntite] = await Promise.all([
      Historique.aggregate([
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Historique.aggregate([
        { $group: { _id: '$entityType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);
    
    const totalParEntiteObj = {};
    totalParEntite.forEach(item => {
      totalParEntiteObj[item._id] = item.count;
    });
    
    res.json({
      success: true,
      actionsParType,
      totalParEntite: totalParEntiteObj
    });
  } catch (error) {
    console.error('Erreur getHistoriqueStats:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Export CSV (admin seulement)
const exportHistorique = async (req, res) => {
  try {
    const filters = {};
    if (req.query.entityType) filters.entityType = req.query.entityType;
    if (req.query.search) {
      filters.$or = [
        { details: { $regex: req.query.search, $options: 'i' } },
        { 'utilisateur.nom': { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    const historique = await Historique.find(filters).sort({ createdAt: -1 });
    
    // Génération CSV
    const headers = ['Type', 'Action', 'Ancien Statut', 'Nouveau Statut', 'Détails', 'Utilisateur', 'Date', 'IP'];
    const rows = [headers];
    
    historique.forEach(item => {
      rows.push([
        item.entityType || '',
        item.action || '',
        item.ancienStatut || '',
        item.nouveauStatut || '',
        item.details || '',
        item.utilisateur?.nom || '',
        item.createdAt?.toISOString() || '',
        item.ipAddress || ''
      ]);
    });
    
    const csvContent = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=historique_${new Date().toISOString().slice(0,19)}.csv`);
    res.send('\uFEFF' + csvContent);
  } catch (error) {
    console.error('Erreur exportHistorique:', error);
    res.status(500).json({ success: false, message: 'Erreur export' });
  }
};

module.exports = {
  getAllHistorique,
  getUserHistorique,
  getHistoriqueStats,
  exportHistorique
};