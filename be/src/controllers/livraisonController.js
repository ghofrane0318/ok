const Livraison = require('../models/Livraison');
const Commande = require('../models/Commande');
const Tiers = require('../models/Tiers');
const User = require('../models/User');
const PDFDocument = require('pdfkit');
const HistoriqueController = require('./historiqueController');

// ==================== LISTE DES LIVRAISONS ====================
exports.getLivraisons = async (req, res) => {
  try {
    let query = {};
    const userRole = req.user.role;
    const userId = req.user.id;
    
    // Transporteur : ne voit que ses propres livraisons
    if (userRole === 'Transporteur') {
      query.transporteur = userId;
    }
    // Admin et Commercial : query = {} → toutes les livraisons
    // (inclut les commandes clients, export, vente, fournisseurs)
    
    const livraisons = await Livraison.find(query)
      .populate({
        path: 'commande',
        select: 'numeroCommande montantTotal dateCreation produits',
        populate: {
          path: 'produits.sousProduit',
          model: 'SousProduit',
          select: 'nom uniteMesure prixUnitaire'
        }
      })
      .populate('transporteur', 'nom email telephone adresse raisonSociale')
      .sort({ dateCreation: -1 });
    
    res.json(livraisons);
  } catch (err) {
    console.error('Erreur getLivraisons:', err);
    res.status(500).json({ message: err.message });
  }
};

// ==================== CRÉER LIVRAISON DEPUIS COMMANDE ====================
exports.createLivraisonFromCommande = async (req, res) => {
  try {
    if (req.user.role !== 'Commercial' && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Accès non autorisé. Seuls les commerciaux et administrateurs peuvent créer des livraisons.' });
    }
    
    const commande = await Commande.findById(req.params.commandeId)
      .populate('produits.sousProduit', 'nom uniteMesure');
    
    if (!commande) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }
    
    if (commande.statut !== 'Validée') {
      return res.status(400).json({ message: 'La commande doit être validée pour créer une livraison' });
    }
    
    const existingLivraison = await Livraison.findOne({ commande: commande._id });
    if (existingLivraison) {
      return res.status(400).json({ message: 'Une livraison existe déjà pour cette commande' });
    }
    
    const numeroLivraison = 'LIV-' + Date.now();
    
    const livraison = await Livraison.create({
      numeroLivraison: numeroLivraison,
      commande: commande._id,
      etat: 'À préparer',
      dateDepot: new Date(),
      dateCreation: new Date(),
      dateDerniereMiseAJour: new Date()
    });
    
    await HistoriqueController.addHistorique({
      entityType: "Livraison",
      entityId: livraison._id,
      action: "Création",
      details: `Livraison #${numeroLivraison} créée pour la commande #${commande.numeroCommande}`,
      utilisateur: req.user._id,
      ipAddress: req.ip,
    });
    
    const populatedLivraison = await Livraison.findById(livraison._id)
      .populate('commande', 'numeroCommande montantTotal dateCreation')
      .populate('transporteur', 'nom raisonSociale email');
    
    res.status(201).json(populatedLivraison);
  } catch (err) {
    console.error('Erreur createLivraisonFromCommande:', err);
    await HistoriqueController.addHistorique({
      entityType: "Livraison",
      action: "Création",
      details: `Erreur création livraison: ${err.message}`,
      utilisateur: req.user?._id,
      ipAddress: req.ip
    });
    res.status(400).json({ message: err.message });
  }
};

// ==================== METTRE À JOUR ÉTAT LIVRAISON ====================
exports.updateEtatLivraison = async (req, res) => {
  try {
    const { etat, commentaire } = req.body;
    const userRole = req.user.role;
    
    const livraison = await Livraison.findById(req.params.id)
      .populate('commande', 'numeroCommande');
    
    if (!livraison) {
      return res.status(404).json({ message: 'Livraison non trouvée' });
    }
    
    const ancienEtat = livraison.etat;
    
    const transitionsValides = {
      'À préparer': { next: ['Prête', 'Annulée'], roles: ['Commercial', 'Admin'] },
      'Prête': { next: ['En cours', 'Annulée'], roles: ['Commercial', 'Admin', 'Transporteur'] },
      'En cours': { next: ['Livrée', 'Annulée'], roles: ['Commercial', 'Admin', 'Transporteur'] },
      'Livrée': { next: [], roles: [] },
      'Annulée': { next: [], roles: [] }
    };
    
    const transition = transitionsValides[livraison.etat];
    if (!transition || !transition.next.includes(etat)) {
      return res.status(400).json({ message: `Transition invalide de ${livraison.etat} vers ${etat}` });
    }
    
    if (!transition.roles.includes(userRole)) {
      return res.status(403).json({ message: `Seuls ${transition.roles.join(', ')} peuvent changer l'état de ${livraison.etat} vers ${etat}` });
    }
    
    livraison.etat = etat;
    if (commentaire) livraison.commentaire = commentaire;
    livraison.dateDerniereMiseAJour = Date.now();
    
    if (etat === 'Livrée') {
      livraison.dateLivraison = Date.now();
    }
    
    await livraison.save();
    
    let details = `État changé de ${exports.getEtatText(ancienEtat)} à ${exports.getEtatText(etat)}`;
    if (commentaire) details += ` - Commentaire: ${commentaire}`;
    
    await HistoriqueController.addHistorique({
      entityType: "Livraison",
      entityId: livraison._id,
      action: "Changement statut",
      ancienStatut: ancienEtat,
      nouveauStatut: etat,
      details: details,
      utilisateur: req.user._id,
      ipAddress: req.ip,
    });
    
    const populatedLivraison = await Livraison.findById(livraison._id)
      .populate('commande', 'numeroCommande montantTotal')
      .populate('transporteur', 'nom raisonSociale email');
    
    res.json(populatedLivraison);
  } catch (err) {
    console.error('Erreur updateEtatLivraison:', err);
    await HistoriqueController.addHistorique({
      entityType: "Livraison",
      entityId: req.params.id,
      action: "Changement statut",
      details: `Erreur changement état: ${err.message}`,
      utilisateur: req.user?._id,
      ipAddress: req.ip
    });
    res.status(400).json({ message: err.message });
  }
};

// ==================== ASSIGNER TRANSPORTEUR ====================
exports.assignTransporteur = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Accès non autorisé. Seul l\'administrateur peut assigner un transporteur.' });
    }
    
    const { transporteurId } = req.body;
    if (!transporteurId) {
      return res.status(400).json({ message: 'Veuillez sélectionner un transporteur' });
    }
    
    const transporteur = await User.findById(transporteurId);
    if (!transporteur || transporteur.role !== 'Transporteur') {
      return res.status(404).json({ message: 'Transporteur non trouvé' });
    }
    
    const livraison = await Livraison.findById(req.params.id);
    if (!livraison) {
      return res.status(404).json({ message: 'Livraison non trouvée' });
    }
    
    const ancienTransporteur = livraison.transporteur;
    
    const livraisonUpdated = await Livraison.findByIdAndUpdate(
      req.params.id,
      { transporteur: transporteurId, dateDerniereMiseAJour: Date.now() },
      { new: true }
    )
      .populate('commande', 'numeroCommande montantTotal')
      .populate('transporteur', 'nom raisonSociale email telephone adresse');
    
    let details = `Transporteur assigné: ${transporteur.raisonSociale || transporteur.nom}`;
    if (ancienTransporteur) {
      const ancien = await User.findById(ancienTransporteur);
      details += ` (remplace ${ancien?.raisonSociale || ancien?.nom || 'précédent'})`;
    }
    
    await HistoriqueController.addHistorique({
      entityType: "Livraison",
      entityId: livraison._id,
      action: "Modification",
      details: details,
      utilisateur: req.user._id,
      ipAddress: req.ip,
    });
    
    res.json(livraisonUpdated);
  } catch (err) {
    console.error('Erreur assignTransporteur:', err);
    await HistoriqueController.addHistorique({
      entityType: "Livraison",
      entityId: req.params.id,
      action: "Modification",
      details: `Erreur assignation transporteur: ${err.message}`,
      utilisateur: req.user?._id,
      ipAddress: req.ip
    });
    res.status(400).json({ message: err.message });
  }
};

// ==================== LISTE DES TRANSPORTEURS (SANS ERREUR 500) ====================
exports.getTransporteurs = async (req, res) => {
  try {
    let transporteurs = [];
    
    // Tentative avec le modèle Tiers
    try {
      transporteurs = await Tiers.find({ role: 'Transporteur' })
        .select('_id nom raisonSociale email telephone adresse')
        .lean();
    } catch (err) {
      console.warn('Modèle Tiers indisponible:', err.message);
    }
    
    // Fallback avec User
    if (!transporteurs || transporteurs.length === 0) {
      try {
        transporteurs = await User.find({ role: 'Transporteur' })
          .select('_id nom raisonSociale email telephone adresse')
          .lean();
      } catch (err) {
        console.warn('Modèle User indisponible:', err.message);
      }
    }
    
    // Retourne toujours un tableau (vide si aucun transporteur)
    res.json(transporteurs || []);
  } catch (err) {
    console.error('Erreur getTransporteurs:', err);
    res.json([]); // Jamais d'erreur 500
  }
};

// ==================== GÉNÉRER BON DE LIVRAISON PDF ====================
exports.generateBonLivraisonPDF = async (req, res) => {
  try {
    const livraison = await Livraison.findById(req.params.id)
      .populate({
        path: 'commande',
        select: 'numeroCommande montantTotal dateCreation produits',
        populate: {
          path: 'produits.sousProduit',
          model: 'SousProduit',
          select: 'nom uniteMesure prixUnitaire'
        }
      })
      .populate('transporteur', 'nom raisonSociale email telephone adresse');
    
    if (!livraison) {
      return res.status(404).json({ message: 'Livraison non trouvée' });
    }
    
    const userRole = req.user.role;
    const userId = req.user.id;
    
    if (userRole === 'Transporteur' && livraison.transporteur?._id?.toString() !== userId) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }
    
    await HistoriqueController.addHistorique({
      entityType: "Livraison",
      entityId: livraison._id,
      action: "Modification",
      details: `Export PDF du bon de livraison #${livraison.numeroLivraison} par ${req.user.nom || req.user.email}`,
      utilisateur: req.user._id,
      ipAddress: req.ip,
    });
    
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];
    
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=bon_livraison_${livraison.numeroLivraison}.pdf`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    });
    doc.on('error', (err) => {
      console.error('Erreur PDF:', err);
      res.status(500).json({ message: err.message });
    });
    
    // En-tête
    doc.fontSize(20).font('Helvetica-Bold').text('BON DE LIVRAISON', { align: 'center' }).moveDown();
    doc.fontSize(12).font('Helvetica').text(`N° Livraison: ${livraison.numeroLivraison}`, { align: 'center' }).moveDown();
    
    doc.strokeColor('#000000').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown();
    
    // Infos livraison
    doc.fontSize(14).font('Helvetica-Bold').text('Informations de livraison', { underline: true }).moveDown(0.5);
    doc.fontSize(10).font('Helvetica')
      .text(`État: ${exports.getEtatText(livraison.etat)}`)
      .text(`Date de dépôt: ${new Date(livraison.dateDepot).toLocaleDateString('fr-FR')}`)
      .text(`Date de création: ${new Date(livraison.dateCreation).toLocaleDateString('fr-FR')}`);
    if (livraison.dateArriveePrevue) doc.text(`Date d'arrivée prévue: ${new Date(livraison.dateArriveePrevue).toLocaleDateString('fr-FR')}`);
    if (livraison.dateLivraison) doc.text(`Date de livraison: ${new Date(livraison.dateLivraison).toLocaleDateString('fr-FR')}`);
    if (livraison.commentaire) doc.text(`Commentaire: ${livraison.commentaire}`);
    doc.moveDown();
    
    // Transporteur
    if (livraison.transporteur) {
      doc.fontSize(14).font('Helvetica-Bold').text('Transporteur', { underline: true }).moveDown(0.5);
      doc.fontSize(10).font('Helvetica')
        .text(`Nom: ${livraison.transporteur.raisonSociale || livraison.transporteur.nom || '-'}`)
        .text(`Email: ${livraison.transporteur.email || '-'}`)
        .text(`Téléphone: ${livraison.transporteur.telephone || '-'}`)
        .text(`Adresse: ${livraison.transporteur.adresse || '-'}`)
        .moveDown();
    }
    
    // Détails commande
    doc.fontSize(14).font('Helvetica-Bold').text('Détails de la commande', { underline: true }).moveDown(0.5);
    doc.fontSize(10).font('Helvetica')
      .text(`N° Commande: ${livraison.commande?.numeroCommande || '-'}`)
      .text(`Date commande: ${livraison.commande?.dateCreation ? new Date(livraison.commande.dateCreation).toLocaleDateString('fr-FR') : '-'}`)
      .moveDown();
    
    // Produits
    doc.fontSize(12).font('Helvetica-Bold').text('Produits', { underline: true }).moveDown(0.5);
    
    const startY = doc.y;
    const productX = 50;
    const qtyX = 250;
    const priceX = 350;
    const totalX = 450;
    
    doc.fontSize(9).font('Helvetica-Bold')
      .text('Produit', productX, startY)
      .text('Quantité', qtyX, startY)
      .text('Prix unitaire', priceX, startY)
      .text('Total', totalX, startY);
    
    let y = startY + 20;
    let totalGeneral = 0;
    
    livraison.commande?.produits?.forEach((produit) => {
      const nom = produit.sousProduit?.nom || 'Produit';
      const quantite = produit.quantite;
      const prixUnitaire = produit.prixUnitaire;
      const total = quantite * prixUnitaire;
      totalGeneral += total;
      
      doc.font('Helvetica').fontSize(9)
        .text(nom, productX, y)
        .text(`${quantite} ${produit.sousProduit?.uniteMesure || ''}`, qtyX, y)
        .text(`${prixUnitaire.toLocaleString()} TND`, priceX, y)
        .text(`${total.toLocaleString()} TND`, totalX, y);
      
      y += 20;
    });
    
    y += 10;
    doc.font('Helvetica-Bold').fontSize(11)
      .text('Total général:', totalX - 80, y)
      .text(`${totalGeneral.toLocaleString()} TND`, totalX, y);
    
    doc.fontSize(8).font('Helvetica')
      .text('Document généré le ' + new Date().toLocaleDateString('fr-FR'), 50, 750, { align: 'center' });
    
    doc.end();
  } catch (error) {
    console.error('Erreur generateBonLivraisonPDF:', error);
    res.status(500).json({ message: error.message });
  }
};

// ==================== SUPPRIMER UNE LIVRAISON ====================
exports.deleteLivraison = async (req, res) => {
  try {
    const livraison = await Livraison.findById(req.params.id);
    if (!livraison) {
      return res.status(404).json({ message: 'Livraison non trouvée' });
    }
    
    if (livraison.etat === 'En cours' || livraison.etat === 'Livrée') {
      return res.status(400).json({ message: 'Impossible de supprimer une livraison en cours ou déjà livrée' });
    }
    
    await HistoriqueController.addHistorique({
      entityType: "Livraison",
      entityId: livraison._id,
      action: "Suppression",
      details: `Livraison #${livraison.numeroLivraison} supprimée (État: ${livraison.etat})`,
      utilisateur: req.user._id,
      ipAddress: req.ip,
    });
    
    await Livraison.findByIdAndDelete(req.params.id);
    res.json({ message: 'Livraison supprimée avec succès' });
  } catch (err) {
    console.error('Erreur deleteLivraison:', err);
    res.status(500).json({ message: err.message });
  }
};

// ==================== UTILITAIRE : TEXTE D'ÉTAT AVEC ÉMOJI ====================
exports.getEtatText = (etat) => {
  const map = {
    'À préparer': '⏳ À préparer',
    'Prête': '✅ Prête',
    'En cours': '🚚 En cours',
    'Livrée': '📦 Livrée',
    'Annulée': '❌ Annulée'
  };
  return map[etat] || etat;
};