const Facture = require('../models/Facture');
const Contrat = require('../models/Contrat');
const Commande = require('../models/Commande');
const Livraison = require('../models/Livraison');
const Document = require('../models/Document');
const TypeFacture = require('../models/TypeFacture');
const pdfGenerator = require('../utils/pdfGenerator');
const { addHistorique } = require("./historiqueController");

// GET /api/factures/:id/pdf
exports.generatePDF = async (req, res) => {
  try {
    const facture = await Facture.findById(req.params.id)
      .populate('typeFacture')
      .populate('contrat')
      .populate('client')
      .lean();

    if (!facture) {
      return res.status(404).json({ success: false, message: 'Facture introuvable' });
    }

    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
      `attachment; filename="facture_${facture.numeroFacture || facture._id}.pdf"`
    );

    doc.pipe(res);

    doc.fontSize(24).fillColor('#0a2540').font('Helvetica-Bold')
       .text('FACTURE', { align: 'center' });
    doc.moveDown(0.5);

    doc.fontSize(12).fillColor('#666').font('Helvetica')
       .text(facture.numeroFacture || facture._id.toString(), { align: 'center' });
    doc.moveDown(1.5);

    doc.strokeColor('#dbe5f5').lineWidth(1)
       .moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    doc.fontSize(13).fillColor('#0a2540').font('Helvetica-Bold')
       .text('INFORMATIONS FACTURE');
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor('#333').font('Helvetica');

    const infos = [
      ['Numéro:', facture.numeroFacture || 'N/A'],
      ['Type:', facture.typeFacture?.nom || 'N/A'],
      ['Date:', facture.dateCreation ? new Date(facture.dateCreation).toLocaleDateString('fr-FR') : 'N/A'],
      ['Date échéance:', facture.dateEcheance ? new Date(facture.dateEcheance).toLocaleDateString('fr-FR') : 'N/A'],
      ['Client:', facture.client?.raisonSociale || facture.client?.nom || 'N/A'],
      ['Statut:', facture.statut || 'En attente'],
      ['Montant HT:', `${(facture.montantHT || 0).toFixed(2)} TND`],
      ['TVA:', `${facture.tva || 19} %`],
      ['Montant TTC:', `${(facture.montantTTC || 0).toFixed(2)} TND`]
    ];

    infos.forEach(([label, value]) => {
      doc.font('Helvetica-Bold').text(label, 50, doc.y, { continued: true, width: 150 });
      doc.font('Helvetica').text(`  ${value}`);
      doc.moveDown(0.4);
    });

    doc.moveDown(2);

    doc.fontSize(9).fillColor('#999').font('Helvetica')
       .text(
         `Généré le ${new Date().toLocaleDateString('fr-FR')} - ETAP`,
         50, 770, { align: 'center', width: 495 }
       );

    doc.end();
  } catch (err) {
    console.error('Erreur GET /api/factures/:id/pdf:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

// PATCH /api/factures/:id/statut
exports.updateStatut = async (req, res) => {
  try {
    const { statut } = req.body;
    if (!statut) {
      return res.status(400).json({ success: false, message: 'Statut requis' });
    }

    const validStatuts = ['En attente', 'Payée', 'Annulée', 'Impayée', 'En retard'];
    if (!validStatuts.includes(statut)) {
      return res.status(400).json({
        success: false,
        message: `Statut invalide. Valeurs autorisées: ${validStatuts.join(', ')}`
      });
    }

    const facture = await Facture.findByIdAndUpdate(
      req.params.id,
      { statut, updatedAt: new Date() },
      { new: true }
    )
      .populate('typeFacture')
      .populate('contrat')
      .populate('client');

    if (!facture) {
      return res.status(404).json({ success: false, message: 'Facture introuvable' });
    }

    res.json({ success: true, data: facture, message: 'Statut mis à jour' });
  } catch (err) {
    console.error('Erreur PATCH /api/factures/:id/statut:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
// Obtenir toutes les factures
exports.getFactures = async (req, res) => {
  try {
    const factures = await Facture.find()
      .populate('typeFacture', 'nom devise')
      .populate('contrat', 'numeroContrat')
      .populate('commande', 'numeroCommande')
      .sort({ dateCreation: -1 });
    res.json(factures);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Obtenir une facture par ID
exports.getFactureById = async (req, res) => {
  try {
    const facture = await Facture.findById(req.params.id)
      .populate('typeFacture', 'nom devise')
      .populate('contrat', 'numeroContrat client')
      .populate('commande', 'numeroCommande');
    if (!facture) return res.status(404).json({ message: 'Facture non trouvée' });
    res.json(facture);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Créer une facture (AVEC HISTORIQUE)
exports.createFacture = async (req, res) => {
  try {
    const { typeFacture, contrat, commande, livraison, montantHT, dateEcheance } = req.body;
    
    // Vérifier si le contrat existe
    const contratExist = await Contrat.findById(contrat);
    if (!contratExist) {
      return res.status(404).json({ message: 'Contrat non trouvé' });
    }
    
    // Récupérer le type de facture
    const typeFactureData = await TypeFacture.findById(typeFacture);
    if (!typeFactureData) {
      return res.status(404).json({ message: 'Type de facture non trouvé' });
    }
    
    // Pour les factures normales (Locale TN, Export USD), le contrat doit être validé
    if (typeFactureData.nom !== 'Proforma' && typeFactureData.nom !== 'Avoir') {
      if (contratExist.statut !== 'Validé') {
        return res.status(400).json({ message: 'Le contrat doit être validé pour créer cette facture' });
      }
    }
    
    // Récupérer la devise depuis le type de facture
    const devise = typeFactureData.devise;
    
    // Calculer TVA (19% pour TND, 0% pour USD)
    const tauxTVA = devise === 'TND' ? 0.19 : 0;
    const montantTVA = montantHT * tauxTVA;
    let montantTTC = montantHT + montantTVA;
    
    // Pour l'avoir, le montant est négatif
    if (typeFactureData.nom === 'Avoir') {
      montantTTC = -montantTTC;
    }
    
    // Générer numéro de facture selon le type
    const count = await Facture.countDocuments();
    let prefix = 'FACT';
    if (typeFactureData.nom === 'Export USD') prefix = 'EXP';
    if (typeFactureData.nom === 'Proforma') prefix = 'PRO';
    if (typeFactureData.nom === 'Avoir') prefix = 'AVR';
    
    const numeroFacture = `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    
    // Déterminer le statut initial
    let statut = 'En attente';
    if (typeFactureData.nom === 'Avoir') statut = 'Approuvé';
    if (typeFactureData.nom === 'Proforma') statut = 'En attente';
    
    const facture = await Facture.create({
      numeroFacture,
      typeFacture,
      contrat,
      commande,
      livraison,
      montantHT,
      montantTVA,
      montantTTC,
      devise,
      dateEcheance,
      statut
    });
    
    // ➜ AJOUT DE L'HISTORIQUE POUR LA CRÉATION
    await addHistorique({
      entityType: "Facture",
      entityId: facture._id,
      action: "Création",
      details: `Facture #${numeroFacture} créée (Type: ${typeFactureData.nom}, Montant: ${montantTTC.toLocaleString()} ${devise})`,
      utilisateur: req.user._id,
      ipAddress: req.ip
    });
    
    // Générer PDF automatiquement
    try {
      const pdfPath = await pdfGenerator.generateFacturePDF(facture);
      facture.pdfPath = pdfPath;
      await facture.save();
      
      // Créer document dans la base
      await Document.create({
        type: 'Facture',
        referenceId: facture._id,
        filePath: pdfPath,
        generePar: req.user.id
      });
      
      // ➜ AJOUT DE L'HISTORIQUE POUR LA GÉNÉRATION PDF
      await addHistorique({
        entityType: "Facture",
        entityId: facture._id,
        action: "Modification",
        details: `PDF généré automatiquement pour la facture #${numeroFacture}`,
        utilisateur: req.user._id,
        ipAddress: req.ip
      });
    } catch (pdfError) {
      console.error('Erreur génération PDF:', pdfError);
      // Continuer même si le PDF échoue
    }
    
    const populated = await Facture.findById(facture._id)
      .populate('typeFacture', 'nom devise')
      .populate('contrat', 'numeroContrat');
    
    res.status(201).json(populated);
  } catch (err) {
    console.error('Erreur createFacture:', err);
    
    // ➜ AJOUT DE L'HISTORIQUE D'ERREUR
    await addHistorique({
      entityType: "Facture",
      action: "Création",
      details: `Erreur création facture: ${err.message}`,
      utilisateur: req.user?._id,
      ipAddress: req.ip
    });
    
    res.status(400).json({ message: err.message });
  }
};

// Mettre à jour statut facture (AVEC HISTORIQUE AMÉLIORÉ)
exports.updateStatut = async (req, res) => {
  try {
    const { statut } = req.body;
    
    // Vérifier les statuts valides
    const statutsValides = ['En attente', 'Payée', 'Annulée', 'Approuvé'];
    if (!statutsValides.includes(statut)) {
      return res.status(400).json({ message: 'Statut invalide' });
    }

    const ancienneFacture = await Facture.findById(req.params.id)
      .populate('typeFacture', 'nom');
    
    if (!ancienneFacture) {
      return res.status(404).json({ message: 'Facture non trouvée' });
    }

    // Vérifier si le changement est valide
    if (ancienneFacture.statut === 'Payée' && statut !== 'Payée') {
      return res.status(400).json({ message: 'Une facture payée ne peut pas changer de statut' });
    }
    
    if (ancienneFacture.statut === 'Annulée') {
      return res.status(400).json({ message: 'Une facture annulée ne peut pas être modifiée' });
    }

    const facture = await Facture.findByIdAndUpdate(
      req.params.id,
      { statut, dateModification: Date.now() },
      { new: true }
    ).populate('typeFacture', 'nom devise');

    // ➜ AJOUT DE L'HISTORIQUE POUR LE CHANGEMENT DE STATUT
    let details = `Statut changé de ${ancienneFacture.statut} à ${statut}`;
    if (statut === 'Payée') {
      details = `Facture #${ancienneFacture.numeroFacture} payée avec succès`;
    } else if (statut === 'Annulée') {
      details = `Facture #${ancienneFacture.numeroFacture} annulée`;
    }

    await addHistorique({
      entityType: "Facture",
      entityId: facture._id,
      action: "Changement statut",
      ancienStatut: ancienneFacture.statut,
      nouveauStatut: statut,
      details: details,
      utilisateur: req.user._id,
      ipAddress: req.ip
    });

    res.json(facture);

  } catch (err) {
    console.error('Erreur updateStatut:', err);
    
    await addHistorique({
      entityType: "Facture",
      entityId: req.params.id,
      action: "Changement statut",
      details: `Erreur changement statut: ${err.message}`,
      utilisateur: req.user?._id,
      ipAddress: req.ip
    });

    res.status(400).json({ message: err.message });
  }
};

// Supprimer une facture (AVEC HISTORIQUE AMÉLIORÉ)
exports.deleteFacture = async (req, res) => {
  try {
    const facture = await Facture.findById(req.params.id)
      .populate('typeFacture', 'nom');
    
    if (!facture) {
      return res.status(404).json({ message: 'Facture non trouvée' });
    }
    
    // Vérifier si la facture peut être supprimée
    if (facture.statut === 'Payée') {
      return res.status(400).json({ message: 'Impossible de supprimer une facture déjà payée' });
    }
    
    if (facture.statut === 'Approuvé' && facture.typeFacture?.nom === 'Avoir') {
      return res.status(400).json({ message: 'Impossible de supprimer un avoir déjà approuvé' });
    }
    
    // Vérifier si des documents sont associés
    const documents = await Document.find({ referenceId: facture._id });
    if (documents.length > 0) {
      // Optionnel: Supprimer aussi les documents physiques
      console.log(`${documents.length} document(s) associé(s) à supprimer`);
    }

    // ➜ AJOUT DE L'HISTORIQUE AVANT SUPPRESSION
    await addHistorique({
      entityType: "Facture",
      entityId: facture._id,
      action: "Suppression",
      details: `Facture #${facture.numeroFacture} supprimée (Type: ${facture.typeFacture?.nom || '-'}, Montant: ${Math.abs(facture.montantTTC).toLocaleString()} ${facture.devise}, Statut: ${facture.statut})`,
      utilisateur: req.user._id,
      ipAddress: req.ip
    });
    
    await Facture.findByIdAndDelete(req.params.id);
    
    // Supprimer les documents associés
    await Document.deleteMany({ referenceId: facture._id });
    
    res.json({ message: 'Facture supprimée avec succès' });

  } catch (err) {
    console.error('Erreur deleteFacture:', err);
    
    await addHistorique({
      entityType: "Facture",
      entityId: req.params.id,
      action: "Suppression",
      details: `Erreur suppression: ${err.message}`,
      utilisateur: req.user?._id,
      ipAddress: req.ip
    });

    res.status(500).json({ message: err.message });
  }
};

// Statistiques des factures
exports.getFacturesStats = async (req, res) => {
  try {
    const total = await Facture.countDocuments();
    const enAttente = await Facture.countDocuments({ statut: 'En attente' });
    const payees = await Facture.countDocuments({ statut: 'Payée' });
    const annulees = await Facture.countDocuments({ statut: 'Annulée' });
    const approuves = await Facture.countDocuments({ statut: 'Approuvé' });
    
    const totalMontant = await Facture.aggregate([
      { $group: { _id: null, total: { $sum: '$montantTTC' } } }
    ]);
    
    // Statistiques par type
    const parType = await Facture.aggregate([
      { $group: { _id: '$typeFacture', count: { $sum: 1 } } },
      { $lookup: { from: 'typefactures', localField: '_id', foreignField: '_id', as: 'typeInfo' } }
    ]);
    
    res.json({
      total,
      enAttente,
      payees,
      annulees,
      approuves,
      totalMontant: totalMontant[0]?.total || 0,
      parType
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==================== EXPORT PDF FACTURE (AVEC HISTORIQUE) ====================
exports.exportFacturePDF = async (req, res) => {
  try {
    const facture = await Facture.findById(req.params.id)
      .populate('typeFacture', 'nom devise')
      .populate('contrat', 'numeroContrat')
      .populate('commande', 'numeroCommande');

    if (!facture) {
      return res.status(404).json({ message: 'Facture non trouvée' });
    }
    
    // ➜ AJOUT DE L'HISTORIQUE POUR L'EXPORT PDF
    await addHistorique({
      entityType: "Facture",
      entityId: facture._id,
      action: "Modification",
      details: `Export PDF de la facture #${facture.numeroFacture} par ${req.user.nom || req.user.email}`,
      utilisateur: req.user._id,
      ipAddress: req.ip
    });
    
    // Déterminer le titre selon le type
    let title = 'FACTURE';
    if (facture.typeFacture?.nom === 'Proforma') title = 'FACTURE PROFORMA';
    if (facture.typeFacture?.nom === 'Avoir') title = "FACTURE D'AVOIR";
    
    // Créer le PDF
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];
    
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=facture_${facture.numeroFacture}.pdf`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    });
    
    // En-tête
    doc.fontSize(20)
      .font('Helvetica-Bold')
      .text(title, { align: 'center' })
      .moveDown();
    
    doc.fontSize(10)
      .font('Helvetica')
      .text(`N° Facture: ${facture.numeroFacture}`, { align: 'center' })
      .text(`Date d'émission: ${new Date(facture.dateEmission).toLocaleDateString('fr-FR')}`, { align: 'center' })
      .moveDown();
    
    // Ligne de séparation
    doc.strokeColor('#000000')
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke()
      .moveDown();
    
    // Informations facture
    doc.fontSize(12)
      .font('Helvetica-Bold')
      .text('Informations', { underline: true })
      .moveDown(0.5);
    
    doc.fontSize(10)
      .font('Helvetica')
      .text(`Type de facture: ${facture.typeFacture?.nom || '-'}`)
      .text(`Contrat: ${facture.contrat?.numeroContrat || '-'}`)
      .text(`Commande: ${facture.commande?.numeroCommande || '-'}`)
      .text(`Livraison: ${facture.livraison?.numeroLivraison || '-'}`)
      .text(`Statut: ${facture.statut}`)
      .text(`Date d'échéance: ${new Date(facture.dateEcheance).toLocaleDateString('fr-FR')}`)
      .moveDown();
    
    // Détails financiers
    doc.fontSize(12)
      .font('Helvetica-Bold')
      .text('Détails financiers', { underline: true })
      .moveDown(0.5);
    
    doc.fontSize(10)
      .font('Helvetica')
      .text(`Montant HT: ${facture.montantHT.toLocaleString()} ${facture.devise}`)
      .text(`TVA (${facture.devise === 'TND' ? '19%' : '0%'}): ${Math.abs(facture.montantTVA).toLocaleString()} ${facture.devise}`)
      .moveDown();
    
    doc.fontSize(14)
      .font('Helvetica-Bold')
      .text(`Montant TTC: ${Math.abs(facture.montantTTC).toLocaleString()} ${facture.devise}`, { align: 'center' })
      .moveDown();
    
    if (facture.typeFacture?.nom === 'Avoir') {
      doc.fontSize(10)
        .font('Helvetica')
        .text('(Montant à déduire)', { align: 'center' });
    }
    
    // Pied de page
    doc.fontSize(8)
      .font('Helvetica')
      .text('Document généré automatiquement', 50, 750, { align: 'center' });
    
    doc.end();
    
  } catch (error) {
    console.error('Erreur export facture PDF:', error);
    res.status(500).json({ message: error.message });
  }
};