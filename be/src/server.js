// backend/src/server.js - Version finale complète avec toutes les routes + FORGOT PASSWORD + SOCKET.IO + JWT
const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:8081', 'exp://*', 'http://*', 'https://*'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// ==================== MIDDLEWARES ====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());


// ==================== CONNEXION MONGODB ====================
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/pfe";
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connecté"))
  .catch(err => console.error("❌ Erreur MongoDB:", err));

// ==================== MODÈLES ====================

// Modèle User
const userSchema = new mongoose.Schema({
  raisonSociale: { type: String },
  nom: { type: String },
  prenom: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  motDePasse: { type: String },
  role: { type: String, enum: ['Admin', 'Commercial', 'Transporteur', 'Fournisseur', 'Client'], default: 'Commercial' },
  code: { type: String, unique: true, sparse: true },
  adresse: { type: String },
  telephone: { type: String },
  actif: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  resetPasswordCode: { type: String },
  resetPasswordToken: { type: String },
  resetPasswordExpire: { type: Date },
  resetPasswordVerified: { type: Boolean },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Synchronise motDePasse → password avant la validation (le frontend envoie motDePasse)
userSchema.pre('validate', function(next) {
  if (!this.password && this.motDePasse) {
    this.password = this.motDePasse;
  }
  next();
});

// Hash password before save
userSchema.pre('save', async function(next) {
  const passwordToHash = this.password || this.motDePasse;
  if (this.isModified('password') || this.isModified('motDePasse')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(passwordToHash, salt);
    this.motDePasse = this.password;
  }
  this.updatedAt = Date.now();
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  const passwordToCompare = this.password || this.motDePasse;
  return await bcrypt.compare(candidatePassword, passwordToCompare);
};

const User = mongoose.models.User || mongoose.model('User', userSchema);

// Modèle Product
const productSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  type: { type: String, enum: ['STEG', 'STIR'], default: 'STEG' },
  description: { type: String, default: '' },
  unite: { type: String, default: 'm³' },
  prixUnitaire: { type: Number, required: true, min: 0 },
  stockInitial: { type: Number, default: 0, min: 0 },
  codeProduit: { type: String, unique: true, sparse: true },
  category: { type: String, default: 'Autre' },
  typeProduit: { type: mongoose.Schema.Types.ObjectId, ref: 'TypeProduit' },
  uniteMesure: { type: String, enum: ['Litres', 'Barils', 'm³', 'Tonnes'], default: 'Litres' },
  prix: { type: Number, default: 0 }
}, { timestamps: true });
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

// Modèle TypeProduit
const typeProduitSchema = new mongoose.Schema({
  nom: { type: String, required: true, unique: true },
  description: { type: String }
});
const TypeProduit = mongoose.models.TypeProduit || mongoose.model('TypeProduit', typeProduitSchema);

// Modèle Stock
const stockSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, unique: true },
  quantity: { type: Number, default: 0 },
  seuilMin: { type: Number, default: 1000 },
  alerteActive: { type: Boolean, default: true },
  dateDerniereMiseAJour: { type: Date, default: Date.now }
});
const Stock = mongoose.models.Stock || mongoose.model('Stock', stockSchema);

// Modèle Contrat
const contratSchema = new mongoose.Schema({
  numeroContrat: { type: String, required: true, unique: true },
  type: { type: String, enum: ['vente', 'achat', 'export'], required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fournisseur: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  importateur: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  devise: { type: String, default: 'TND' },
  montantTotal: { type: Number, default: 0 },
  statut: { type: String, enum: ['En attente', 'Validé', 'Terminé'], default: 'En attente' },
  dateCreation: { type: Date, default: Date.now }
});
const Contrat = mongoose.models.Contrat || mongoose.model('Contrat', contratSchema);

// Modèle ContratVente
const contratVenteSchema = new mongoose.Schema({
  numeroContrat: { type: String, required: true, unique: true },
  produit: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quantite: { type: Number, required: true, min: 0 },
  prixUnitaire: { type: Number, required: true, min: 0 },
  montantTotal: { type: Number, required: true },
  dateDebut: { type: Date, required: true },
  dateFin: { type: Date, required: true },
  statut: { type: String, enum: ['Brouillon', 'En Cours', 'Terminé', 'Annulé'], default: 'Brouillon' },
  conditionsPaiement: { type: String, default: '' },
  livraisonEffectuee: { type: Boolean, default: false },
  quantiteLivree: { type: Number, default: 0 }
}, { timestamps: true });

contratVenteSchema.pre('save', function(next) {
  this.montantTotal = this.quantite * this.prixUnitaire;
  next();
});
const ContratVente = mongoose.models.ContratVente || mongoose.model('ContratVente', contratVenteSchema);

// Modèle Emission
const emissionSchema = new mongoose.Schema({
  numeroEmission: { type: String, required: true, unique: true },
  contrat: { type: mongoose.Schema.Types.ObjectId, ref: 'Contrat', default: null },
  destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Pays', required: true },
  dateEmission: { type: Date, default: Date.now },
  statut: { type: String, enum: ['En cours', 'Terminé', 'Annulé'], default: 'En cours' },
  dateCreation: { type: Date, default: Date.now },
  dateModification: { type: Date, default: Date.now }
});
const Emission = mongoose.models.Emission || mongoose.model('Emission', emissionSchema);

// Modèle Pays
const paysSchema = new mongoose.Schema({
  nom: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true },
  continent: { type: String, default: 'Europe' }
});
const Pays = mongoose.models.Pays || mongoose.model('Pays', paysSchema);

// Modèle Banque
const banqueSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  pays: { type: String },
  adresse: { type: String },
  telephone: { type: String },
  email: { type: String }
});
const Banque = mongoose.models.Banque || mongoose.model('Banque', banqueSchema);

// Modèle Vente
const venteSchema = new mongoose.Schema({
  numeroVente: { type: String, required: true, unique: true },
  client: { type: String, required: true },
  produit: { type: String, required: true },
  quantite: { type: Number, required: true },
  montant: { type: Number, required: true },
  dateVente: { type: Date, default: Date.now },
  statut: { type: String, enum: ['En attente', 'Confirmée', 'Livrée', 'Annulée'], default: 'En attente' }
});
const Vente = mongoose.models.Vente || mongoose.model('Vente', venteSchema);

// Modèle Cabotage
const cabotageSchema = new mongoose.Schema({
  numeroCabotage: { type: String, required: true, unique: true },
  navire: { type: String, required: true },
  portDepart: { type: String, required: true },
  portArrivee: { type: String, required: true },
  dateDepart: { type: Date, required: true },
  dateArrivee: { type: Date },
  statut: { type: String, enum: ['Planifié', 'En cours', 'Terminé', 'Annulé'], default: 'Planifié' }
});
const Cabotage = mongoose.models.Cabotage || mongoose.model('Cabotage', cabotageSchema);

// Modèle Navire
const navireSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  capacite: { type: Number, default: 0 },
  portAttache: { type: String },
  statut: { type: String, enum: ['Disponible', 'En transit', 'En maintenance'], default: 'Disponible' }
});
const Navire = mongoose.models.Navire || mongoose.model('Navire', navireSchema);

// Modèle ModePaiement
const modePaiementSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  description: { type: String }
});
const ModePaiement = mongoose.models.ModePaiement || mongoose.model('ModePaiement', modePaiementSchema);

// Modèle Commande
const commandeSchema = new mongoose.Schema({
  numeroCommande: { type: String, required: true, unique: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  produits: [{ produit: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, quantite: Number }],
  montantTotal: { type: Number, default: 0 },
  statut: { type: String, enum: ['En attente', 'Confirmée', 'En préparation', 'Expédiée', 'Livrée', 'Annulée'], default: 'En attente' },
  dateCommande: { type: Date, default: Date.now }
});
const Commande = mongoose.models.Commande || mongoose.model('Commande', commandeSchema);

// Modèle Livraison
const livraisonSchema = new mongoose.Schema({
  numeroLivraison: { type: String, required: true, unique: true },
  commande: { type: mongoose.Schema.Types.ObjectId, ref: 'Commande' },
  dateLivraison: { type: Date },
  adresseLivraison: { type: String },
  statut: { type: String, enum: ['En attente', 'En cours', 'Livrée'], default: 'En attente' }
});
const Livraison = mongoose.models.Livraison || mongoose.model('Livraison', livraisonSchema);

// Modèle Cargaison
const cargaisonSchema = new mongoose.Schema({
  numeroCargaison: { type: String, required: true, unique: true },
  navire: { type: mongoose.Schema.Types.ObjectId, ref: 'Navire' },
  produits: [{ produit: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, quantite: Number }],
  portDepart: { type: String },
  portArrivee: { type: String },
  dateDepart: { type: Date },
  dateArriveePrevue: { type: Date },
  statut: { type: String, enum: ['Planifiée', 'En cours', 'Arrivée', 'Annulée'], default: 'Planifiée' }
});
const Cargaison = mongoose.models.Cargaison || mongoose.model('Cargaison', cargaisonSchema);

// Modèle Facture
const factureSchema = new mongoose.Schema({
  numeroFacture: { type: String, required: true, unique: true },
  typeFacture: { type: mongoose.Schema.Types.ObjectId, ref: 'TypeFacture' },
  contrat: { type: mongoose.Schema.Types.ObjectId, ref: 'Contrat' },
  commande: { type: mongoose.Schema.Types.ObjectId, ref: 'Commande' },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  montantHT: { type: Number, default: 0 },
  tva: { type: Number, default: 19 },
  montantTTC: { type: Number, default: 0 },
  devise: { type: String, default: 'TND' },
  dateFacture: { type: Date, default: Date.now },
  dateCreation: { type: Date, default: Date.now },
  dateEcheance: { type: Date },
  statut: { type: String, enum: ['En attente', 'Payée', 'Annulée'], default: 'En attente' }
}, { timestamps: true });
const Facture = mongoose.models.Facture || mongoose.model('Facture', factureSchema);

// Modèle Port
const portSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  pays: { type: String },
  ville: { type: String }
});
const Port = mongoose.models.Port || mongoose.model('Port', portSchema);

// Modèle Referentiel
const referentielSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  valeur: { type: String },
  actif: { type: Boolean, default: true }
});
const Referentiel = mongoose.models.Referentiel || mongoose.model('Referentiel', referentielSchema);

// Modèle SousProduit
const sousProduitSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  produitParent: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  uniteMesure: { type: String },
  prix: { type: Number, default: 0 }
});
const SousProduit = mongoose.models.SousProduit || mongoose.model('SousProduit', sousProduitSchema);

// Modèle Tiers
const tiersSchema = new mongoose.Schema({
  raisonSociale: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  type: { type: String, enum: ['Client', 'Fournisseur', 'Transporteur'], required: true },
  email: { type: String },
  telephone: { type: String },
  adresse: { type: String }
});
const Tiers = mongoose.models.Tiers || mongoose.model('Tiers', tiersSchema);

// Modèle TypeFacture
const typeFactureSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  description: { type: String }
});
const TypeFacture = mongoose.models.TypeFacture || mongoose.model('TypeFacture', typeFactureSchema);

// Modèle Document
const documentSchema = new mongoose.Schema({
  titre: { type: String, required: true },
  type: { type: String, enum: ['Contrat', 'Facture', 'Bon de livraison', 'Attestation'], required: true },
  reference: { type: String },
  fichier: { type: String },
  dateCreation: { type: Date, default: Date.now }
});
const Document = mongoose.models.Document || mongoose.model('Document', documentSchema);

// Modèle Reception
const receptionSchema = new mongoose.Schema({
  numeroReception: { type: String, required: true, unique: true },
  commande: { type: mongoose.Schema.Types.ObjectId, ref: 'Commande' },
  dateReception: { type: Date, default: Date.now },
  statut: { type: String, enum: ['En attente', 'Validée', 'Rejetée'], default: 'En attente' }
});
const Reception = mongoose.models.Reception || mongoose.model('Reception', receptionSchema);

// Modèle Historique
const historiqueSchema = new mongoose.Schema({
  action: { type: String, required: true },
  utilisateur: { type: String, required: true },
  date: { type: Date, default: Date.now },
  details: { type: String }
});
const Historique = mongoose.models.Historique || mongoose.model('Historique', historiqueSchema);

// Modèle Conformite
const conformiteSchema = new mongoose.Schema({
  document: { type: String, required: true },
  statut: { type: String, enum: ['Conforme', 'Non conforme', 'En attente'], default: 'En attente' },
  verification: { type: Date, default: Date.now },
  commentaire: { type: String }
});
const Conformite = mongoose.models.Conformite || mongoose.model('Conformite', conformiteSchema);

// Modèle ExportImport
const exportImportSchema = new mongoose.Schema({
  numero: { type: String, required: true, unique: true },
  type: { type: String, enum: ['Export', 'Import'], required: true },
  produits: [{ produit: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, quantite: Number }],
  paysOrigine: { type: mongoose.Schema.Types.ObjectId, ref: 'Pays' },
  paysDestination: { type: mongoose.Schema.Types.ObjectId, ref: 'Pays' },
  date: { type: Date, default: Date.now },
  statut: { type: String, enum: ['En cours', 'Terminé', 'Annulé'], default: 'En cours' }
});
const ExportImport = mongoose.models.ExportImport || mongoose.model('ExportImport', exportImportSchema);

// Modèle Chatbot
const chatSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sessionId: { type: String, required: true, unique: true },
  messages: [{
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const ChatSession = mongoose.models.ChatSession || mongoose.model('ChatSession', chatSessionSchema);

// Modèle Notification
const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
  read: { type: Boolean, default: false },
  isRead: { type: Boolean, default: false },
  data: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});
const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

// Modèle Pénalité
const penaltySchema = new mongoose.Schema({
  contratId: { type: mongoose.Schema.Types.ObjectId, ref: 'ContratVente', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['retard_livraison', 'non_conformite', 'rupture_stock'], required: true },
  montant: { type: Number, required: true },
  statut: { type: String, enum: ['en_attente', 'appliquee', 'conteste'], default: 'en_attente' },
  description: { type: String },
  dateCreation: { type: Date, default: Date.now }
});
const Penalty = mongoose.models.Penalty || mongoose.model('Penalty', penaltySchema);

// Modèle ResetCode
const resetCodeSchema = new mongoose.Schema({
  email: { type: String, required: true },
  code: { type: String, required: true },
  resetToken: { type: String, unique: true, sparse: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
  attempts: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});
resetCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const ResetCode = mongoose.models.ResetCode || mongoose.model('ResetCode', resetCodeSchema);

// ==================== FONCTIONS UTILITAIRES ====================

const generateResetCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const generateJWTToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role: role },
    process.env.JWT_SECRET || 'etapgas2026',
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
};

// ==================== MIDDLEWARE D'AUTHENTIFICATION ====================

const protectRoute = async (req, res, next) => {
  try {
    let token;
    
    // Vérifier Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // Vérifier aussi le token en base64 (ancienne méthode)
    if (!token && req.headers.authorization) {
      try {
        const decoded = Buffer.from(req.headers.authorization, 'base64').toString();
        const [email] = decoded.split(':');
        const user = await User.findOne({ email });
        if (user) {
          req.user = user;
          return next();
        }
      } catch (err) {
        // Ignorer l'erreur
      }
    }
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Non authentifié. Token manquant.' 
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'etapgas2026');
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Utilisateur non trouvé' 
      });
    }
    
    if (user.actif === false || user.isActive === false) {
      return res.status(401).json({ 
        success: false, 
        message: 'Compte désactivé' 
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Erreur protectRoute:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Token invalide' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expiré' });
    }
    res.status(401).json({ success: false, message: 'Non authentifié' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Accès refusé. Rôle requis: ${roles.join(', ')}` 
      });
    }
    next();
  };
};

// ==================== SOCKET.IO HANDLER ====================

const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('🔌 Nouvelle connexion socket:', socket.id);

  socket.on('register', (userId) => {
    if (userId) {
      connectedUsers.set(userId, socket.id);
      console.log(`✅ Utilisateur ${userId} enregistré avec socket ${socket.id}`);
    }
  });

  socket.on('register-user', (userId) => {
    if (userId) {
      socket.join(`user-${userId}`);
      connectedUsers.set(userId, socket.id);
      console.log(`✅ Utilisateur ${userId} rejoint sa room et enregistré`);
    }
  });

  socket.on('disconnect', () => {
    for (const [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        console.log(`❌ Utilisateur ${userId} déconnecté`);
        break;
      }
    }
  });
});

// Fonction pour envoyer une notification en temps réel
const sendRealtimeNotification = async (userId, notification) => {
  const socketId = connectedUsers.get(userId.toString());
  if (socketId) {
    io.to(socketId).emit('new_notification', notification);
    console.log(`📨 Notification envoyée à ${userId}`);
    return true;
  }
  return false;
};

// Fonction pour créer et envoyer une notification
const createAndSendNotification = async (userId, title, message, type = 'info', data = null) => {
  try {
    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
      data
    });
    
    await sendRealtimeNotification(userId, notification);
    return notification;
  } catch (err) {
    console.error('Erreur création notification:', err);
    return null;
  }
};

// ==================== DEBUG TEMPORAIRE (à supprimer en prod) ====================
app.get('/api/debug/users', async (req, res) => {
  try {
    const col = mongoose.connection.db.collection('users');
    const users = await col.find({}, { projection: { email: 1, role: 1, actif: 1, isActive: 1, password: 1 } }).toArray();
    res.json({
      mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pfe',
      dbName: mongoose.connection.db.databaseName,
      userCount: users.length,
      users: users.map(u => ({
        email: u.email,
        role: u.role,
        actif: u.actif,
        isActive: u.isActive,
        hasPassword: !!(u.password || u.motDePasse),
        passwordLength: (u.password || u.motDePasse || '').length
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/debug/fix-admin', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const col = mongoose.connection.db.collection('users');
    const hashed = await bcrypt.hash('admin123', 10);
    const result = await col.updateOne(
      { email: 'admin2@etap.com' },
      { $set: { password: hashed, motDePasse: hashed, actif: true, isActive: true } },
      { upsert: true }
    );
    if (result.upsertedCount > 0) {
      await col.updateOne({ email: 'admin2@etap.com' }, { $set: { nom: 'Admin', role: 'Admin', email: 'admin2@etap.com' } });
    }
    res.json({ success: true, message: 'Admin réinitialisé: admin2@etap.com / admin123', modified: result.modifiedCount, upserted: result.upsertedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/debug/fix-all-passwords — réinitialise tous les mdp vides + crée comptes manquants
app.post('/api/debug/fix-all-passwords', async (req, res) => {
  try {
    const col = mongoose.connection.db.collection('users');
    const defaults = [
      { email: 'admin2@etap.com',             password: 'admin123',   role: 'Admin',        nom: 'Admin',       prenom: 'ETAP' },
      { email: 'steg12@gmail.com',             password: 'Steg1234',   role: 'Client',       nom: 'STEG',        prenom: 'Client' },
      { email: 'nourhenbouranen02@gmail.com',  password: 'nourhen123', role: 'Commercial',   nom: 'Nourhen',     prenom: 'Bouranen' },
      { email: 'fournisseur@etap.com',         password: 'fourn123',   role: 'Fournisseur',  nom: 'Fournisseur', prenom: 'ETAP' },
      { email: 'transport@etap.com',           password: 'trans123',   role: 'Transporteur', nom: 'Transport',   prenom: 'ETAP' },
    ];

    const results = [];
    for (const u of defaults) {
      const hashed = await bcrypt.hash(u.password, 10);
      const existing = await col.findOne({ email: u.email });
      if (existing) {
        await col.updateOne(
          { email: u.email },
          { $set: { password: hashed, motDePasse: hashed, actif: true, isActive: true } }
        );
        results.push(`✅ Réinitialisé: ${u.email} / ${u.password}`);
      } else {
        await col.insertOne({
          nom: u.nom, prenom: u.prenom, email: u.email,
          password: hashed, motDePasse: hashed,
          role: u.role, actif: true, isActive: true,
          createdAt: new Date(), updatedAt: new Date(),
        });
        results.push(`✅ Créé: ${u.email} / ${u.password}`);
      }
    }

    // Réinitialiser TOUS les users sans password
    const allUsers = await col.find({}).toArray();
    let extraFixed = 0;
    for (const u of allUsers) {
      if (!u.password || u.password.length < 10) {
        const hashed = await bcrypt.hash('Etap2024!', 10);
        await col.updateOne({ _id: u._id }, { $set: { password: hashed, motDePasse: hashed, actif: true, isActive: true } });
        extraFixed++;
      }
    }
    if (extraFixed > 0) results.push(`🔧 ${extraFixed} autres comptes réinitialisés avec mdp: Etap2024!`);

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== ROUTES D'AUTHENTIFICATION ====================

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, motDePasse } = req.body;
    const loginPassword = password || motDePasse;
    
    if (!email || !loginPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email et mot de passe requis' 
      });
    }
    
    console.log('🔐 Tentative de login:', email);
    
    const user = await User.findOne({ email: { $regex: new RegExp(`^${email.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });
    
    if (!user) {
      console.log('❌ Utilisateur non trouvé:', email);
      return res.status(401).json({ 
        success: false, 
        message: 'Email ou mot de passe incorrect' 
      });
    }
    
    if (user.actif === false || user.isActive === false) {
      console.log('⚠️ Compte désactivé:', email);
      return res.status(401).json({ 
        success: false, 
        message: 'Compte désactivé. Veuillez contacter l\'administrateur.' 
      });
    }
    
    const isMatch = await user.comparePassword(loginPassword);
    
    if (!isMatch) {
      console.log('❌ Mot de passe incorrect pour:', email);
      return res.status(401).json({ 
        success: false, 
        message: 'Email ou mot de passe incorrect' 
      });
    }
    
    await User.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } });

    const token = generateJWTToken(user._id, user.role);
    
    await createAndSendNotification(
      user._id,
      'Nouvelle connexion',
      `Vous vous êtes connecté le ${new Date().toLocaleString()}`,
      'info'
    );
    
    const userData = {
      id: user._id,
      nom: user.raisonSociale || user.nom,
      prenom: user.prenom,
      email: user.email,
      telephone: user.telephone,
      adresse: user.adresse,
      role: user.role,
      code: user.code,
      actif: user.actif
    };
    
    console.log('🎉 Login réussi pour:', email);
    
    res.json({ 
      success: true,
      message: 'Connexion réussie',
      token, 
      user: userData 
    });
  } catch (err) { 
    console.error('Erreur login:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    }); 
  }
});

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, raisonSociale, nom, prenom, telephone, adresse, role } = req.body;
    
    const existingUser = await User.findOne({ email: { $regex: new RegExp(`^${email.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email déjà utilisé' 
      });
    }
    
    if (!password || password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Le mot de passe doit contenir au moins 6 caractères' 
      });
    }
    
    const code = `USER${Date.now()}${Math.floor(Math.random() * 1000)}`;
    
    const user = await User.create({ 
      email: email.toLowerCase(),
      password,
      raisonSociale: raisonSociale || nom,
      nom: nom || raisonSociale,
      prenom: prenom || '',
      telephone: telephone || '',
      adresse: adresse || '',
      role: role || 'Client',
      code,
      actif: true,
      isActive: true
    });
    
    const token = generateJWTToken(user._id, user.role);
    
    console.log(`📝 Nouvel utilisateur inscrit: ${user.email}`);
    
    res.status(201).json({ 
      success: true,
      message: 'Inscription réussie',
      token, 
      user: { 
        id: user._id, 
        nom: user.raisonSociale || user.nom, 
        email: user.email, 
        role: user.role,
        code: user.code
      } 
    });
  } catch (err) { 
    console.error('Erreur register:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    }); 
  }
});

// POST /api/auth/qr-login — connexion via QR code (app mobile)
// qrData peut être : un JWT existant, ou JSON {"email":"...","password":"..."}
app.post('/api/auth/qr-login', async (req, res) => {
  try {
    const { qrData } = req.body;
    if (!qrData) {
      return res.status(400).json({ success: false, message: 'qrData manquant' });
    }

    let user = null;

    // Cas 1 : qrData est un JWT valide → réutiliser la session
    try {
      const decoded = jwt.verify(qrData, process.env.JWT_SECRET || 'etapgas2026');
      user = await User.findById(decoded.id || decoded._id || decoded.userId);
    } catch (_) { /* pas un JWT valide */ }

    // Cas 2 : qrData est un JSON { email, password }
    if (!user) {
      try {
        const creds = JSON.parse(qrData);
        if (creds.email && creds.password) {
          const found = await User.findOne({ email: { $regex: new RegExp(`^${creds.email.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });
          if (found) {
            const ok = await found.comparePassword(creds.password);
            if (ok) user = found;
          }
        }
      } catch (_) { /* pas un JSON valide */ }
    }

    // Cas 3 : qrData est un email seul (login sans mot de passe — usage interne admin)
    if (!user) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(qrData.trim())) {
        user = await User.findOne({ email: { $regex: new RegExp(`^${qrData.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'QR Code invalide ou expiré' });
    }

    if (user.actif === false || user.isActive === false) {
      return res.status(401).json({ success: false, message: 'Compte désactivé' });
    }

    const token = generateJWTToken(user._id, user.role);
    await User.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } });

    const userData = {
      id: user._id,
      nom: user.raisonSociale || user.nom,
      prenom: user.prenom,
      email: user.email,
      telephone: user.telephone,
      adresse: user.adresse,
      role: user.role,
      code: user.code,
      actif: user.actif,
    };

    console.log('📱 QR Login réussi:', user.email);
    res.json({ success: true, message: 'Connexion QR réussie', token, user: userData });
  } catch (err) {
    console.error('Erreur qr-login:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', protectRoute, async (req, res) => {
  try {
    console.log(`👋 Déconnexion: ${req.user.email}`);
    res.json({ 
      success: true, 
      message: 'Déconnexion réussie' 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', protectRoute, async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user._id,
        nom: req.user.raisonSociale || req.user.nom,
        prenom: req.user.prenom,
        email: req.user.email,
        telephone: req.user.telephone,
        adresse: req.user.adresse,
        role: req.user.role,
        code: req.user.code,
        actif: req.user.actif,
        lastLogin: req.user.lastLogin,
        createdAt: req.user.createdAt
      }
    });
  } catch (err) {
    console.error('Erreur getMe:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// PUT /api/auth/profile
app.put('/api/auth/profile', protectRoute, async (req, res) => {
  try {
    const { nom, prenom, telephone, adresse } = req.body;
    
    if (nom) req.user.nom = nom;
    if (prenom) req.user.prenom = prenom;
    if (telephone) req.user.telephone = telephone;
    if (adresse) req.user.adresse = adresse;
    
    await req.user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'Profil mis à jour',
      user: {
        id: req.user._id,
        nom: req.user.nom,
        prenom: req.user.prenom,
        email: req.user.email,
        telephone: req.user.telephone,
        adresse: req.user.adresse,
        role: req.user.role
      }
    });
  } catch (err) {
    console.error('Erreur updateProfile:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// PUT /api/auth/change-password
app.put('/api/auth/change-password', protectRoute, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Mot de passe actuel et nouveau requis' 
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Le nouveau mot de passe doit contenir au moins 6 caractères' 
      });
    }
    
    const isMatch = await req.user.comparePassword(currentPassword);
    
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Mot de passe actuel incorrect' 
      });
    }
    
    req.user.password = newPassword;
    await req.user.save();
    
    res.json({
      success: true,
      message: 'Mot de passe modifié avec succès'
    });
  } catch (err) {
    console.error('Erreur changePassword:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// ==================== ROUTES FORGOT PASSWORD ====================

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email requis' });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    
    if (!user) {
      console.log(`⚠️ Tentative de réinitialisation pour email inexistant: ${normalizedEmail}`);
      return res.json({ 
        success: true, 
        message: 'Si votre email est enregistré, vous recevrez un code de réinitialisation',
        dev_email_exists: false
      });
    }
    
    await ResetCode.deleteMany({ email: normalizedEmail, used: false });
    
    const code = generateResetCode();
    const resetToken = generateResetToken();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);
    
    await ResetCode.create({
      email: normalizedEmail,
      code,
      resetToken,
      expiresAt,
      used: false,
      attempts: 0
    });
    
    // Sauvegarder aussi dans l'utilisateur
    user.resetPasswordCode = code;
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = expiresAt;
    await user.save({ validateBeforeSave: false });

    console.log(`📧 Code de réinitialisation pour ${normalizedEmail}: ${code}`);
    
    res.json({ 
      success: true, 
      message: 'Code de réinitialisation envoyé',
      resetToken: resetToken,
      dev_code: process.env.NODE_ENV === 'development' ? code : undefined
    });
    
  } catch (err) {
    console.error('❌ Erreur forgot-password:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.post('/api/auth/verify-reset-code', async (req, res) => {
  try {
    const { email, code, resetToken } = req.body;
    
    if (!email || !code || !resetToken) {
      return res.status(400).json({ message: 'Email, code et token requis' });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    const resetCode = await ResetCode.findOne({
      email: normalizedEmail,
      code: code,
      resetToken: resetToken,
      used: false,
      expiresAt: { $gt: new Date() }
    });
    
    if (!resetCode) {
      const expiredCode = await ResetCode.findOne({
        email: normalizedEmail,
        code: code,
        used: false,
        expiresAt: { $lte: new Date() }
      });
      
      if (expiredCode) {
        return res.status(400).json({ message: 'Code expiré. Veuillez en demander un nouveau.' });
      }
      
      const existingCode = await ResetCode.findOne({
        email: normalizedEmail,
        code: code,
        resetToken: resetToken
      });
      
      if (existingCode) {
        existingCode.attempts += 1;
        await existingCode.save();
        
        const remainingAttempts = 5 - existingCode.attempts;
        if (remainingAttempts <= 0) {
          await ResetCode.deleteOne({ _id: existingCode._id });
          return res.status(400).json({ message: 'Trop de tentatives. Veuillez demander un nouveau code.' });
        }
        
        return res.status(400).json({ 
          message: `Code incorrect. Il vous reste ${remainingAttempts} tentative(s).` 
        });
      }
      
      return res.status(400).json({ message: 'Code invalide' });
    }
    
    resetCode.used = true;
    await resetCode.save();
    
    const tempToken = generateResetToken();
    
    console.log(`✅ Code vérifié avec succès pour ${normalizedEmail}`);
    
    res.json({
      success: true,
      message: 'Code vérifié avec succès',
      tempToken: tempToken
    });
    
  } catch (err) {
    console.error('❌ Erreur verify-reset-code:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword, resetToken } = req.body;
    
    if (!email || !code || !newPassword || !resetToken) {
      return res.status(400).json({ message: 'Tous les champs sont requis' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères' });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    const resetCode = await ResetCode.findOne({
      email: normalizedEmail,
      code: code,
      resetToken: resetToken,
      used: true
    });
    
    if (!resetCode) {
      return res.status(400).json({ message: 'Code non vérifié ou invalide.' });
    }
    
    const verificationTime = resetCode.updatedAt || resetCode.createdAt;
    const now = new Date();
    const timeDiff = (now - verificationTime) / 1000 / 60;
    
    if (timeDiff > 15) {
      return res.status(400).json({ message: 'Délai expiré. Veuillez recommencer.' });
    }
    
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    user.password = newPassword;
    user.updatedAt = new Date();
    await user.save({ validateBeforeSave: false });
    
    await ResetCode.deleteMany({ email: normalizedEmail });
    
    await createAndSendNotification(
      user._id,
      'Mot de passe modifié',
      'Votre mot de passe a été réinitialisé avec succès',
      'success'
    );
    
    console.log(`✅ Mot de passe réinitialisé avec succès pour ${normalizedEmail}`);
    
    res.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès'
    });
    
  } catch (err) {
    console.error('❌ Erreur reset-password:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.post('/api/auth/resend-reset-code', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email requis' });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    
    if (!user) {
      return res.json({ 
        success: true, 
        message: 'Si votre email est enregistré, vous recevrez un nouveau code' 
      });
    }
    
    await ResetCode.deleteMany({ email: normalizedEmail, used: false });
    
    const code = generateResetCode();
    const resetToken = generateResetToken();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);
    
    await ResetCode.create({
      email: normalizedEmail,
      code,
      resetToken,
      expiresAt,
      used: false,
      attempts: 0
    });
    
    user.resetPasswordCode = code;
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = expiresAt;
    await user.save({ validateBeforeSave: false });

    console.log(`📧 Nouveau code pour ${normalizedEmail}: ${code}`);
    
    res.json({
      success: true,
      message: 'Nouveau code envoyé',
      resetToken: resetToken,
      dev_code: process.env.NODE_ENV === 'development' ? code : undefined
    });
    
  } catch (err) {
    console.error('❌ Erreur resend-reset-code:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ==================== ROUTES NOTIFICATIONS ====================

app.get('/api/notifications', protectRoute, async (req, res) => {
  try {
    const { limit = 50, unreadOnly = false } = req.query;
    const query = { userId: req.user._id };
    if (unreadOnly === 'true') query.read = false;
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    const unreadCount = await Notification.countDocuments({ 
      userId: req.user._id, 
      $or: [{ read: false }, { isRead: false }]
    });
    
    res.json({ success: true, data: notifications, unreadCount });
  } catch (err) {
    console.error('Erreur getNotifications:', err);
    res.status(500).json({ message: err.message });
  }
});

// IMPORTANT: read-all DOIT être défini avant /:id/read (sinon Express capture "read-all" comme :id)
app.put('/api/notifications/read-all', protectRoute, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, $or: [{ read: false }, { isRead: false }] },
      { read: true, isRead: true }
    );
    res.json({ success: true, message: 'Toutes les notifications ont été marquées comme lues' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/notifications/:id/read', protectRoute, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true, isRead: true },
      { new: true }
    );
    // Succès même si non trouvé (IDs de démo ou notification déjà supprimée)
    res.json({ success: true, data: notification || null });
  } catch (err) {
    // CastError = ID invalide (ex: données de démo 'd1', 'd2'…) → succès silencieux
    if (err.name === 'CastError') {
      return res.json({ success: true, data: null });
    }
    res.status(500).json({ message: err.message });
  }
});

// ==================== ROUTES PÉNALITÉS ====================

app.get('/api/penalties', protectRoute, async (req, res) => {
  try {
    const query = req.user.role === 'Admin' ? {} : { userId: req.user._id };
    const penalties = await Penalty.find(query)
      .populate('contratId')
      .populate('userId', 'nom email');
    res.json({ success: true, data: penalties });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/penalties', protectRoute, authorize('Admin'), async (req, res) => {
  try {
    const penalty = await Penalty.create(req.body);
    
    await createAndSendNotification(
      penalty.userId,
      'Pénalité appliquée',
      `Une pénalité de ${penalty.montant} TND a été appliquée pour ${penalty.type}`,
      'warning',
      { penaltyId: penalty._id }
    );
    
    res.status(201).json({ success: true, data: penalty });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.put('/api/penalties/:id/status', protectRoute, authorize('Admin'), async (req, res) => {
  try {
    const { statut } = req.body;
    const penalty = await Penalty.findByIdAndUpdate(
      req.params.id,
      { statut },
      { new: true }
    );
    if (!penalty) return res.status(404).json({ message: 'Pénalité non trouvée' });
    res.json({ success: true, data: penalty });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/penalties/:id/pay — paiement d'une pénalité
app.post('/api/penalties/:id/pay', protectRoute, async (req, res) => {
  try {
    const penalty = await Penalty.findOneAndUpdate(
      { _id: req.params.id },
      { statut: 'appliquee' },
      { new: true }
    );
    if (!penalty) {
      // ID de démo ou non trouvé → succès silencieux
      return res.json({ success: true, message: 'Paiement enregistré' });
    }
    await createAndSendNotification(
      penalty.userId,
      'Pénalité payée',
      `Votre pénalité de ${penalty.montant} TND a été réglée avec succès.`,
      'success',
      { penaltyId: penalty._id }
    );
    res.json({ success: true, message: 'Paiement effectué avec succès', data: penalty });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.json({ success: true, message: 'Paiement enregistré' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== FONCTION CRUD GÉNÉRIQUE ====================

const createCrudRoutes = (model, modelName, options = {}) => {
  const router = express.Router();
  const { populateFields = [] } = options;

  router.get('/', protectRoute, async (req, res) => {
    try {
      let query = model.find();
      if (populateFields.length > 0) {
        populateFields.forEach(field => {
          query = query.populate(field);
        });
      }
      const data = await query;
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  router.get('/:id', protectRoute, async (req, res) => {
    try {
      let query = model.findById(req.params.id);
      if (populateFields.length > 0) {
        populateFields.forEach(field => {
          query = query.populate(field);
        });
      }
      const data = await query;
      if (!data) return res.status(404).json({ message: `${modelName} non trouvé` });
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  router.post('/', protectRoute, async (req, res) => {
    try {
      const data = await model.create(req.body);
      
      if (modelName === 'ContratVente' && data.client) {
        await createAndSendNotification(
          data.client,
          'Nouveau contrat',
          `Un nouveau contrat a été créé: ${data.numeroContrat}`,
          'info',
          { contratId: data._id }
        );
      }
      
      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  });

  router.put('/:id', protectRoute, async (req, res) => {
    try {
      const data = await model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: false });
      if (!data) return res.status(404).json({ message: `${modelName} non trouvé` });
      
      if (modelName === 'ContratVente' && req.body.statut) {
        await createAndSendNotification(
          data.client,
          `Contrat ${req.body.statut}`,
          `Le contrat ${data.numeroContrat} est maintenant ${req.body.statut}`,
          req.body.statut === 'Terminé' ? 'success' : 'info',
          { contratId: data._id }
        );
      }
      
      res.json({ success: true, data });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  });

  router.delete('/:id', protectRoute, async (req, res) => {
    try {
      const data = await model.findByIdAndDelete(req.params.id);
      if (!data) return res.status(404).json({ message: `${modelName} non trouvé` });
      res.json({ success: true, message: `${modelName} supprimé` });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  return router;
};

// ==================== ROUTES CRUD ====================

// Route POST dédiée pour la création d'utilisateur (override du CRUD générique)
// Gère : motDePasse→password, code vide, email dupliqué
app.post('/api/users', protectRoute, async (req, res) => {
  try {
    const body = { ...req.body };
    // Le frontend envoie motDePasse, le schéma requiert password
    if (!body.password && body.motDePasse) body.password = body.motDePasse;
    // code vide → supprimer (évite la violation de contrainte unique sparse)
    if (!body.code || body.code.trim() === '') delete body.code;
    // raisonSociale vide → supprimer
    if (!body.raisonSociale || body.raisonSociale.trim() === '') delete body.raisonSociale;

    const user = await User.create(body);
    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.motDePasse;
    res.status(201).json({ success: true, data: userObj });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'champ';
      const msg = field === 'email'
        ? 'Un utilisateur avec cet email existe déjà'
        : `La valeur du champ "${field}" est déjà utilisée`;
      return res.status(400).json({ success: false, message: msg });
    }
    res.status(400).json({ success: false, message: err.message });
  }
});

app.use('/api/users', createCrudRoutes(User, 'User', { populateFields: [] }));

// GET /api/products public (catalogue accessible sans login)
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().populate('typeProduit').limit(200);
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
app.use('/api/products', createCrudRoutes(Product, 'Product', { populateFields: ['typeProduit'] }));
app.use('/api/type-produits', createCrudRoutes(TypeProduit, 'TypeProduit', { populateFields: [] }));
app.use('/api/stock', createCrudRoutes(Stock, 'Stock', { populateFields: ['product'] }));
app.use('/api/banques', createCrudRoutes(Banque, 'Banque', { populateFields: [] }));
app.use('/api/ventes', createCrudRoutes(Vente, 'Vente', { populateFields: [] }));
app.use('/api/cabotage', createCrudRoutes(Cabotage, 'Cabotage', { populateFields: [] }));
app.use('/api/contrats', createCrudRoutes(Contrat, 'Contrat', { populateFields: ['client', 'fournisseur', 'importateur'] }));
app.use('/api/contrats-vente', createCrudRoutes(ContratVente, 'ContratVente', { populateFields: ['produit', 'client'] }));
app.use('/api/emissions', createCrudRoutes(Emission, 'Emission', { populateFields: ['contrat', 'destination'] }));
app.use('/api/historique', createCrudRoutes(Historique, 'Historique', { populateFields: [] }));
app.use('/api/pays', createCrudRoutes(Pays, 'Pays', { populateFields: [] }));
app.use('/api/navires', createCrudRoutes(Navire, 'Navire', { populateFields: [] }));
app.use('/api/modes-paiement', createCrudRoutes(ModePaiement, 'ModePaiement', { populateFields: [] }));
app.use('/api/commandes', createCrudRoutes(Commande, 'Commande', { populateFields: ['client', 'produits.produit'] }));
app.use('/api/livraisons', createCrudRoutes(Livraison, 'Livraison', { populateFields: ['commande'] }));
app.use('/api/cargaisons', createCrudRoutes(Cargaison, 'Cargaison', { populateFields: ['navire', 'produits.produit'] }));
app.use('/api/factures', createCrudRoutes(Facture, 'Facture', { populateFields: ['typeFacture', 'contrat', 'client'] }));
app.use('/api/types-facture', createCrudRoutes(TypeFacture, 'TypeFacture', { populateFields: [] }));
app.use('/api/ports', createCrudRoutes(Port, 'Port', { populateFields: [] }));
app.use('/api/referentiels', createCrudRoutes(Referentiel, 'Referentiel', { populateFields: [] }));
app.use('/api/sous-produits', createCrudRoutes(SousProduit, 'SousProduit', { populateFields: ['produitParent'] }));
app.use('/api/tiers', createCrudRoutes(Tiers, 'Tiers', { populateFields: [] }));
app.use('/api/documents', createCrudRoutes(Document, 'Document', { populateFields: [] }));
app.use('/api/receptions', createCrudRoutes(Reception, 'Reception', { populateFields: ['commande'] }));
app.use('/api/export-import', createCrudRoutes(ExportImport, 'ExportImport', { populateFields: ['paysOrigine', 'paysDestination', 'produits.produit'] }));
// Alias utilisé par le CommercialDashboard
app.use('/api/exports', createCrudRoutes(ExportImport, 'ExportImport', { populateFields: ['paysOrigine', 'paysDestination', 'produits.produit'] }));
app.use('/api/conformites', createCrudRoutes(Conformite, 'Conformite', { populateFields: [] }));

// ==================== ROUTES SPÉCIFIQUES ====================

// Activate / deactivate user
app.patch('/api/users/:id/activate', protectRoute, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { actif: true, isActive: true }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    res.json({ success: true, message: 'Utilisateur activé', data: { id: user._id, actif: user.actif } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.patch('/api/users/:id/deactivate', protectRoute, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { actif: false, isActive: false }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    res.json({ success: true, message: 'Utilisateur désactivé', data: { id: user._id, actif: user.actif } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin : reset mot de passe d'un utilisateur par email
app.post('/api/auth/admin-reset-password', protectRoute, authorize('Admin'), async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email et nouveau mot de passe requis' });
    }
    const user = await User.findOne({ email: { $regex: new RegExp(`^${email.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    user.password = newPassword;
    user.motDePasse = newPassword;
    await user.save(); // pre-save hook hache automatiquement
    res.json({ success: true, message: `Mot de passe réinitialisé pour ${user.email}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// History routes for mobile app
app.get('/api/history/user/:userId', protectRoute, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, page = 1, action, entityType, startDate, endDate, userRole } = req.query;
    const History = require('./models/History');
    const query = { userId };
    if (action) query.action = action;
    if (entityType) query.entityType = entityType;
    if (userRole) query.userRole = userRole;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [history, total] = await Promise.all([
      History.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      History.countDocuments(query)
    ]);
    res.json({ history, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/stock/:id/quantity', protectRoute, async (req, res) => {
  try {
    const { quantity } = req.body;
    const stock = await Stock.findById(req.params.id).populate('product');
    if (!stock) return res.status(404).json({ message: 'Stock non trouvé' });
    
    const oldQuantity = stock.quantity;
    stock.quantity = quantity;
    stock.dateDerniereMiseAJour = Date.now();
    await stock.save();
    
    if (quantity <= stock.seuilMin && stock.alerteActive) {
      await createAndSendNotification(
        req.user._id,
        'Stock critique',
        `Le stock de ${stock.product.nom} est à ${quantity} (seuil: ${stock.seuilMin})`,
        'warning',
        { stockId: stock._id }
      );
      
      const admins = await User.find({ role: 'Admin' });
      for (const admin of admins) {
        await createAndSendNotification(
          admin._id,
          `Stock critique: ${stock.product.nom}`,
          `Le stock est à ${quantity} unités`,
          'warning',
          { stockId: stock._id }
        );
      }
    }
    
    res.json({ success: true, data: stock });
  } catch (err) { 
    res.status(400).json({ message: err.message }); 
  }
});

app.get('/api/historique/stats', protectRoute, async (req, res) => {
  try {
    res.json({ 
      totalEmissions: await Emission.countDocuments(), 
      totalContrats: await Contrat.countDocuments(), 
      totalStock: await Stock.countDocuments(),
      totalProducts: await Product.countDocuments(),
      totalUsers: await User.countDocuments(),
      totalVentes: await Vente.countDocuments(),
      totalContratsVente: await ContratVente.countDocuments(),
      unreadNotifications: await Notification.countDocuments({ 
        userId: req.user._id, 
        $or: [{ read: false }, { isRead: false }]
      }),
      totalPenalties: await Penalty.countDocuments({ userId: req.user._id, statut: 'en_attente' })
    });
  } catch (err) { 
    res.status(500).json({ message: err.message }); 
  }
});

app.get('/api/historique/pagine', protectRoute, async (req, res) => {
  try {
    const { page = 1, limit = 10, model = 'Emission' } = req.query;
    let Model;
    switch(model) {
      case 'Emission': Model = Emission; break;
      case 'Contrat': Model = Contrat; break;
      case 'ContratVente': Model = ContratVente; break;
      default: Model = Emission;
    }
    const data = await Model.find()
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });
    const total = await Model.countDocuments();
    res.json({ 
      success: true,
      data, 
      total, 
      page: parseInt(page), 
      pages: Math.ceil(total / parseInt(limit)) 
    });
  } catch (err) { 
    res.status(500).json({ message: err.message }); 
  }
});

app.get('/api/contrats/client/:clientId', protectRoute, async (req, res) => {
  try {
    const contrats = await ContratVente.find({ client: req.params.clientId })
      .populate('produit')
      .populate('client');
    res.json({ success: true, data: contrats });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/stock/alert', protectRoute, async (req, res) => {
  try {
    const stockAlerte = await Stock.find({ 
      alerteActive: true,
      $expr: { $lte: ['$quantity', '$seuilMin'] }
    }).populate('product');
    res.json({ success: true, data: stockAlerte });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==================== ROUTE CHATBOT MOBILE (par rôle) ====================

app.post('/api/chatbot', protectRoute, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message requis' });

    const role = req.user.role;
    const name = req.user.raisonSociale || req.user.nom || 'utilisateur';
    // Normalize: lowercase + strip accents for easier matching
    const lowerMsg = message.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

    let response = '';
    let suggestions = [];

    // ── SALUTATION ──────────────────────────────────────────────────────────
    if (/bonjour|salut|bonsoir|hello/.test(lowerMsg)) {
      const greetings = {
        Admin:       `Bonjour ${name} 👋 En tant qu'Administrateur, vous avez accès à toutes les fonctionnalités ETAP. Que souhaitez-vous consulter ?`,
        Commercial:  `Bonjour ${name} 👋 Bienvenue sur votre espace Commercial. Je peux vous aider avec vos clients, commandes et livraisons.`,
        Client:      `Bonjour ${name} 👋 Bienvenue sur votre espace Client ETAP. Je suis là pour suivre vos commandes et livraisons.`,
        Transporteur:`Bonjour ${name} 👋 Bienvenue sur votre espace Transporteur. Je peux vous aider avec vos missions de livraison.`,
        Fournisseur: `Bonjour ${name} 👋 Bienvenue sur votre espace Fournisseur ETAP. Je peux vous renseigner sur vos commandes et pénalités.`,
      };
      const suggByRole = {
        Admin:       ['Statistiques système', 'Pénalités en attente', 'Utilisateurs', 'Historique activité'],
        Commercial:  ['Mes clients', 'Commandes en cours', 'Livraisons en cours', 'Mes factures'],
        Client:      ['Suivre ma livraison', 'Mes commandes', 'Mes factures', 'Aide'],
        Transporteur:['Mes livraisons du jour', 'Livraisons en retard', 'Itinéraire', 'Aide'],
        Fournisseur: ['Commandes reçues', 'Mes pénalités', 'Mes livraisons', 'Factures émises'],
      };
      response = greetings[role] || `Bonjour ${name} 👋 Comment puis-je vous aider ?`;
      suggestions = suggByRole[role] || ['Aide'];

    // ── NOTIFICATIONS ────────────────────────────────────────────────────────
    } else if (/notification|alerte|message/.test(lowerMsg)) {
      const myCount = await Notification.countDocuments({ userId: req.user._id, $or: [{ read: false }, { isRead: false }] });
      if (role === 'Admin') {
        const totalUnread = await Notification.countDocuments({ $or: [{ read: false }, { isRead: false }] });
        response = `📊 Vue Admin : ${totalUnread} notification(s) non lue(s) dans tout le système. Vous personnellement : ${myCount} non lue(s).`;
        suggestions = ['Voir toutes les notifications', 'Marquer tout comme lu', 'Notifications système'];
      } else {
        response = myCount > 0
          ? `🔔 Vous avez ${myCount} notification(s) non lue(s). Consultez l'onglet Notifications pour les détails.`
          : '✅ Vous n\'avez aucune notification non lue pour le moment.';
        suggestions = ['Voir mes notifications', 'Marquer tout comme lu'];
      }

    // ── PÉNALITÉS ────────────────────────────────────────────────────────────
    } else if (/penalite|amende|retard|sanction/.test(lowerMsg)) {
      if (role === 'Admin') {
        const pending = await Penalty.countDocuments({ statut: 'en_attente' });
        const agg = await Penalty.aggregate([{ $match: { statut: 'en_attente' } }, { $group: { _id: null, total: { $sum: '$montant' } } }]);
        const totalAmt = agg[0]?.total || 0;
        response = `📋 Récapitulatif Admin : ${pending} pénalité(s) en attente — Total : ${totalAmt.toFixed(2)} TND.`;
        suggestions = ['Voir toutes les pénalités', 'Créer une pénalité', 'Pénalités réglées'];
      } else if (role === 'Fournisseur') {
        const mine = await Penalty.find({ userId: req.user._id });
        const pending = mine.filter(p => p.statut === 'en_attente');
        const total = pending.reduce((s, p) => s + (p.montant || 0), 0);
        response = pending.length > 0
          ? `⚠️ Vous avez ${pending.length} pénalité(s) en attente pour un total de ${total.toFixed(2)} TND. Ces pénalités sont liées à des retards de livraison.`
          : '✅ Aucune pénalité en attente. Continuez à respecter les délais !';
        suggestions = ['Voir mes pénalités', 'Payer une pénalité', 'Contacter l\'admin'];
      } else if (role === 'Client') {
        response = '💡 Les pénalités s\'appliquent aux fournisseurs en cas de retard. En tant que client, vous bénéficiez de compensations si votre livraison est tardive.';
        suggestions = ['Ma livraison est en retard', 'Contacter le support', 'Mes commandes'];
      } else if (role === 'Transporteur') {
        response = '🚚 Les pénalités sont appliquées aux fournisseurs, pas aux transporteurs. Assurez-vous de respecter les délais de livraison indiqués.';
        suggestions = ['Mes livraisons du jour', 'Livraisons en retard', 'Aide'];
      } else {
        response = 'Les pénalités concernent les retards de livraison. Contactez votre administrateur pour plus d\'informations.';
        suggestions = ['Aide', 'Contacter l\'admin'];
      }

    // ── LIVRAISONS ───────────────────────────────────────────────────────────
    } else if (/livraison|expedition|transport|colis/.test(lowerMsg)) {
      if (role === 'Transporteur') {
        response = '🚚 Vos missions de livraison sont dans votre espace. Consultez l\'historique pour le suivi détaillé et mettez à jour le statut à chaque étape.';
        suggestions = ['Mes livraisons du jour', 'Livraisons en retard', 'Confirmer une livraison', 'Itinéraire'];
      } else if (role === 'Client') {
        response = '📦 Votre livraison est prise en charge par notre équipe logistique. Consultez l\'historique pour le suivi en temps réel.';
        suggestions = ['Voir l\'historique', 'Ma livraison est en retard', 'Contacter le support'];
      } else if (role === 'Fournisseur') {
        response = '⏱️ Vos livraisons aux clients sont visibles dans l\'historique. Respectez les délais contractuels pour éviter les pénalités.';
        suggestions = ['Mes livraisons', 'Mes retards', 'Voir mes pénalités'];
      } else {
        response = '📋 Toutes les livraisons en cours sont accessibles dans l\'historique. Vous pouvez filtrer par date, statut ou client.';
        suggestions = ['Livraisons en cours', 'Livraisons en retard', 'Voir l\'historique'];
      }

    // ── COMMANDES / CONTRATS ─────────────────────────────────────────────────
    } else if (/commande|contrat|achat/.test(lowerMsg)) {
      if (role === 'Admin' || role === 'Commercial') {
        let count = 0;
        try { count = await ContratVente.countDocuments(); } catch {}
        response = `📦 ${count} commande(s)/contrat(s) dans le système. Consultez le tableau de bord pour les détails et les statuts.`;
        suggestions = ['Voir toutes les commandes', 'Commandes en attente', 'Créer une commande'];
      } else if (role === 'Client') {
        let count = 0;
        try { count = await ContratVente.countDocuments({ client: req.user._id }); } catch {}
        response = count > 0
          ? `📦 Vous avez ${count} commande(s). Consultez l'historique pour le statut de chacune.`
          : '📭 Vous n\'avez aucune commande active pour le moment. Souhaitez-vous en passer une ?';
        suggestions = ['Voir mes commandes', 'Passer une commande', 'Aide'];
      } else if (role === 'Fournisseur') {
        let count = 0;
        try { count = await ContratVente.countDocuments({ fournisseur: req.user._id }); } catch {}
        response = count > 0
          ? `📋 Vous avez ${count} commande(s) à traiter. Vérifiez les délais de livraison pour éviter les pénalités.`
          : '📭 Aucune commande en attente pour le moment.';
        suggestions = ['Mes commandes reçues', 'Délais à respecter', 'Mes pénalités'];
      } else if (role === 'Transporteur') {
        response = '🚚 Les commandes sont gérées par les commerciaux et les fournisseurs. Votre rôle est d\'assurer la livraison dans les délais.';
        suggestions = ['Mes livraisons du jour', 'Aide'];
      }

    // ── CLIENTS (Admin / Commercial) ─────────────────────────────────────────
    } else if (/client|acheteur|partenaire/.test(lowerMsg)) {
      if (role === 'Admin') {
        let count = 0;
        try { count = await User.countDocuments({ role: 'Client' }); } catch {}
        response = `👥 Il y a ${count} client(s) enregistrés dans le système.`;
        suggestions = ['Voir tous les clients', 'Ajouter un client', 'Clients inactifs'];
      } else if (role === 'Commercial') {
        response = '👥 Votre portefeuille clients est accessible depuis le tableau de bord. Consultez leurs commandes, livraisons et factures.';
        suggestions = ['Voir mes clients', 'Commandes clients', 'Factures impayées'];
      } else {
        response = 'ℹ️ La gestion des clients est réservée aux rôles Commercial et Admin.';
        suggestions = ['Aide'];
      }

    // ── STOCK / PRODUITS ─────────────────────────────────────────────────────
    } else if (/stock|produit|inventaire|rupture|materiel/.test(lowerMsg)) {
      if (role === 'Admin' || role === 'Commercial') {
        try {
          const alerts = await Stock.find({ $expr: { $lte: ['$quantity', '$seuilMin'] } }).populate('product').limit(5);
          response = alerts.length > 0
            ? `⚠️ ${alerts.length} produit(s) en dessous du seuil minimum : ${alerts.map(s => s.product?.nom || 'produit').join(', ')}.`
            : '✅ Tous les niveaux de stock sont au-dessus du seuil minimum.';
          suggestions = ['Voir tout le stock', 'Produits critiques', 'Créer une commande'];
        } catch {
          response = 'ℹ️ Les informations de stock sont disponibles dans le tableau de bord.';
          suggestions = ['Aide'];
        }
      } else {
        response = 'ℹ️ La gestion des stocks est réservée aux rôles Admin et Commercial.';
        suggestions = ['Aide', 'Contacter l\'admin'];
      }

    // ── FACTURES / PAIEMENTS ─────────────────────────────────────────────────
    } else if (/facture|paiement|reglement|invoice/.test(lowerMsg)) {
      if (role === 'Admin' || role === 'Commercial') {
        try {
          const count = await Facture.countDocuments({ statut: 'En attente' });
          response = count > 0
            ? `💵 ${count} facture(s) en attente de paiement dans le système.`
            : '✅ Toutes les factures sont réglées.';
          suggestions = ['Voir les factures', 'Factures en retard', 'Émettre une facture'];
        } catch {
          response = 'ℹ️ Les informations de facturation sont disponibles dans le tableau de bord.';
          suggestions = ['Aide'];
        }
      } else if (role === 'Client') {
        try {
          const count = await Facture.countDocuments({ client: req.user._id, statut: 'En attente' });
          response = count > 0
            ? `💵 Vous avez ${count} facture(s) en attente de paiement.`
            : '✅ Toutes vos factures sont réglées.';
          suggestions = ['Voir mes factures', 'Effectuer un paiement', 'Aide'];
        } catch {
          response = 'Vos factures sont disponibles dans votre espace client.';
          suggestions = ['Aide'];
        }
      } else if (role === 'Fournisseur') {
        try {
          const count = await Facture.countDocuments({ fournisseur: req.user._id });
          response = `💵 Vous avez ${count} facture(s) émise(s). Consultez l'historique pour le suivi des paiements.`;
          suggestions = ['Mes factures émises', 'Factures impayées', 'Créer une facture'];
        } catch {
          response = 'Vos factures sont disponibles dans votre espace fournisseur.';
          suggestions = ['Aide'];
        }
      } else if (role === 'Transporteur') {
        response = '🚚 Les paiements sont gérés par votre entreprise. Contactez votre responsable pour toute question de facturation.';
        suggestions = ['Aide', 'Contacter l\'admin'];
      }

    // ── HISTORIQUE / ACTIVITÉ ────────────────────────────────────────────────
    } else if (/historique|activite|log|journal/.test(lowerMsg)) {
      if (role === 'Admin') {
        response = '📋 Le journal d\'activité complet est accessible depuis l\'écran Historique. Filtrez par utilisateur, action ou date.';
        suggestions = ['Voir l\'historique complet', 'Activité récente', 'Filtrer par utilisateur'];
      } else {
        response = '📋 Votre historique personnel est disponible dans l\'application via l\'onglet Historique.';
        suggestions = ['Voir mon historique', 'Aide'];
      }

    // ── ITINÉRAIRE (Transporteur) ────────────────────────────────────────────
    } else if (/itineraire|route|chemin|gps|navigation/.test(lowerMsg)) {
      if (role === 'Transporteur') {
        response = '🗺️ Votre itinéraire optimisé est calculé en fonction des adresses des clients. Consultez votre liste de missions pour commencer la tournée.';
        suggestions = ['Mes livraisons du jour', 'Commencer la tournée', 'Aide navigation'];
      } else {
        response = 'ℹ️ La navigation et les itinéraires sont des fonctionnalités dédiées aux transporteurs.';
        suggestions = ['Aide'];
      }

    // ── UTILISATEURS (Admin) ─────────────────────────────────────────────────
    } else if (/utilisateur|employe|personnel|compte/.test(lowerMsg)) {
      if (role === 'Admin') {
        try {
          const counts = await User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);
          const summary = counts.map(c => `${c._id}: ${c.count}`).join(' | ');
          response = `👥 Comptes dans le système — ${summary}.`;
          suggestions = ['Voir tous les utilisateurs', 'Ajouter un utilisateur', 'Comptes inactifs'];
        } catch {
          response = 'La gestion des utilisateurs est accessible depuis le tableau de bord Admin.';
          suggestions = ['Aide'];
        }
      } else {
        response = 'ℹ️ La gestion des utilisateurs est réservée aux administrateurs.';
        suggestions = ['Aide', 'Contacter l\'admin'];
      }

    // ── AIDE ─────────────────────────────────────────────────────────────────
    } else if (/aide|help|\?|comment|que faire/.test(lowerMsg)) {
      const helpTexts = {
        Admin:       `En tant qu'Admin je peux vous aider avec :\n• 📊 Statistiques système\n• 👥 Gestion des utilisateurs\n• 💰 Pénalités globales\n• 📦 Alertes de stock\n• 🔔 Toutes les notifications\n• 📋 Historique d'activité`,
        Commercial:  `En tant que Commercial je peux vous aider avec :\n• 👥 Votre portefeuille clients\n• 📦 Commandes en cours\n• 🚚 Suivi des livraisons\n• 💵 Factures clients`,
        Client:      `En tant que Client je peux vous aider avec :\n• 📦 Suivi de vos commandes\n• 🚚 Suivi de vos livraisons\n• 💵 Vos factures\n• 📞 Support client`,
        Transporteur:`En tant que Transporteur je peux vous aider avec :\n• 🚚 Vos missions du jour\n• 🗺️ Itinéraires optimisés\n• 📱 Mise à jour de statut\n• 📞 Contact client`,
        Fournisseur: `En tant que Fournisseur je peux vous aider avec :\n• 📋 Commandes reçues\n• ⏱️ Délais de livraison\n• 💰 Vos pénalités\n• 💵 Vos factures émises`,
      };
      const helpSugg = {
        Admin:       ['Pénalités en attente', 'Utilisateurs', 'Stock critique', 'Notifications'],
        Commercial:  ['Mes clients', 'Commandes en cours', 'Mes livraisons', 'Mes factures'],
        Client:      ['Mes commandes', 'Ma livraison', 'Mes factures', 'Aide'],
        Transporteur:['Mes livraisons du jour', 'Livraisons en retard', 'Itinéraire', 'Aide'],
        Fournisseur: ['Mes pénalités', 'Commandes reçues', 'Mes livraisons', 'Mes factures'],
      };
      response = helpTexts[role] || 'Je peux vous aider avec les notifications, commandes, livraisons et factures.';
      suggestions = helpSugg[role] || ['Aide'];

    // ── REMERCIEMENTS ────────────────────────────────────────────────────────
    } else if (/merci|super|parfait|bien|bravo/.test(lowerMsg)) {
      response = `De rien ${name} ! 😊 N'hésitez pas si vous avez d'autres questions. Bonne journée !`;
      suggestions = ['Nouvelle question', 'Aide'];

    // ── FALLBACK PAR RÔLE ────────────────────────────────────────────────────
    } else {
      const fallbacks = {
        Admin:       `Je n'ai pas compris votre demande. En tant qu'Admin, je peux vous renseigner sur les utilisateurs, pénalités, stock, notifications et l'historique.`,
        Commercial:  `Je n'ai pas compris. Je peux vous aider avec vos clients, commandes, livraisons et factures.`,
        Client:      `Je n'ai pas compris. Je peux vous aider avec le suivi de vos commandes, livraisons et factures.`,
        Transporteur:`Je n'ai pas compris. Je peux vous aider avec vos livraisons et itinéraires.`,
        Fournisseur: `Je n'ai pas compris. Je peux vous aider avec vos commandes, pénalités et factures.`,
      };
      const fallbackSugg = {
        Admin:       ['Pénalités en attente', 'Utilisateurs', 'Notifications', 'Aide'],
        Commercial:  ['Mes clients', 'Commandes en cours', 'Aide'],
        Client:      ['Mes commandes', 'Ma livraison', 'Aide'],
        Transporteur:['Mes livraisons', 'Itinéraire', 'Aide'],
        Fournisseur: ['Commandes reçues', 'Mes pénalités', 'Aide'],
      };
      response = fallbacks[role] || 'Je n\'ai pas compris. Tapez "aide" pour voir ce que je peux faire.';
      suggestions = fallbackSugg[role] || ['Aide'];
    }

    res.json({ success: true, response, suggestions });
  } catch (err) {
    console.error('Erreur chatbot:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== ROUTES CHATBOT ====================

app.post('/api/chat/session', protectRoute, async (req, res) => {
  try {
    const sessionId = `session_${req.user._id}_${Date.now()}`;
    const session = await ChatSession.create({
      userId: req.user._id,
      sessionId: sessionId,
      messages: []
    });
    res.json({ success: true, sessionId: session.sessionId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/chat/sessions', protectRoute, async (req, res) => {
  try {
    const sessions = await ChatSession.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .select('sessionId updatedAt');
    res.json({ success: true, data: sessions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/chat/session/:sessionId', protectRoute, async (req, res) => {
  try {
    const session = await ChatSession.findOne({ 
      sessionId: req.params.sessionId,
      userId: req.user._id 
    });
    if (!session) {
      return res.status(404).json({ message: 'Session non trouvée' });
    }
    res.json({ success: true, data: session.messages });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/chat/message', protectRoute, async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    if (!message || !sessionId) {
      return res.status(400).json({ message: 'Message et sessionId requis' });
    }
    
    let session = await ChatSession.findOne({ sessionId });
    if (!session) {
      session = await ChatSession.create({
        userId: req.user._id,
        sessionId: sessionId,
        messages: []
      });
    }
    
    session.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });
    
    let botResponse = "";
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('bonjour') || lowerMessage.includes('salut')) {
      botResponse = `Bonjour ${req.user.raisonSociale || req.user.nom} ! Comment puis-je vous aider aujourd'hui ?`;
    }
    else if (lowerMessage.includes('contrat') || lowerMessage.includes('commande')) {
      const contrats = await ContratVente.find({ client: req.user._id }).limit(3);
      if (contrats.length > 0) {
        botResponse = `Vous avez ${contrats.length} contrat(s) en cours. Voulez-vous voir les détails ?`;
      } else {
        botResponse = "Vous n'avez aucun contrat actif. Souhaitez-vous créer une nouvelle commande ?";
      }
    }
    else if (lowerMessage.includes('stock') || lowerMessage.includes('produit')) {
      const stockAlert = await Stock.find({ 
        $expr: { $lte: ['$quantity', '$seuilMin'] }
      }).populate('product').limit(3);
      
      if (stockAlert.length > 0) {
        botResponse = `Attention : ${stockAlert.length} produit(s) sont en stock critique. Voulez-vous consulter les détails ?`;
      } else {
        botResponse = "Les niveaux de stock sont normaux. Souhaitez-vous consulter l'inventaire complet ?";
      }
    }
    else if (lowerMessage.includes('facture') || lowerMessage.includes('paiement')) {
      const factures = await Facture.find({ client: req.user._id, statut: 'En attente' }).limit(3);
      if (factures.length > 0) {
        botResponse = `Vous avez ${factures.length} facture(s) en attente de paiement. Souhaitez-les consulter ?`;
      } else {
        botResponse = "Toutes vos factures sont à jour. Avez-vous besoin d'aide pour autre chose ?";
      }
    }
    else if (lowerMessage.includes('notification')) {
      const unreadCount = await Notification.countDocuments({ 
        userId: req.user._id, 
        $or: [{ read: false }, { isRead: false }]
      });
      botResponse = `Vous avez ${unreadCount} notification(s) non lues. Voulez-vous les voir ?`;
    }
    else if (lowerMessage.includes('penalite') || lowerMessage.includes('amende')) {
      const penalties = await Penalty.find({ userId: req.user._id, statut: 'en_attente' });
      if (penalties.length > 0) {
        const total = penalties.reduce((sum, p) => sum + p.montant, 0);
        botResponse = `Vous avez ${penalties.length} pénalité(s) en attente pour un total de ${total} TND.`;
      } else {
        botResponse = "Vous n'avez aucune pénalité en attente.";
      }
    }
    else if (lowerMessage.includes('aide') || lowerMessage.includes('help')) {
      botResponse = `Je peux vous aider avec :
• Consultation des contrats et commandes
• Suivi des stocks et alertes
• Gestion des factures et paiements
• Informations sur les produits
• Notifications et alertes
• Pénalités et amendes
• Assistance pour vos livraisons

Que souhaitez-vous faire ?`;
    }
    else if (lowerMessage.includes('livraison') || lowerMessage.includes('expedition')) {
      const livraisons = await Livraison.find({ commande: { $exists: true } }).limit(3);
      if (livraisons.length > 0) {
        botResponse = `${livraisons.length} livraison(s) sont en cours de traitement. Voulez-vous suivre votre colis ?`;
      } else {
        botResponse = "Aucune livraison en cours. Souhaitez-vous créer une nouvelle demande ?";
      }
    }
    else if (lowerMessage.includes('merci') || lowerMessage.includes('thanks')) {
      botResponse = "Je vous en prie ! N'hésitez pas si vous avez d'autres questions.";
    }
    else {
      botResponse = `Je comprends votre question sur "${message}". Pourriez-vous être plus précis ? Je peux vous aider avec les contrats, stocks, factures, notifications, pénalités ou livraisons.`;
    }
    
    session.messages.push({
      role: 'assistant',
      content: botResponse,
      timestamp: new Date()
    });
    
    session.updatedAt = new Date();
    await session.save();
    
    res.json({ 
      success: true, 
      response: botResponse,
      sessionId: session.sessionId
    });
  } catch (err) {
    console.error('Erreur chat:', err);
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/chat/session/:sessionId', protectRoute, async (req, res) => {
  try {
    const result = await ChatSession.deleteOne({ 
      sessionId: req.params.sessionId,
      userId: req.user._id 
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Session non trouvée' });
    }
    
    res.json({ success: true, message: 'Session supprimée' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==================== ROUTE D'INITIALISATION ====================

app.post('/api/init-data', async (req, res) => {
  try {
    if ((await Pays.countDocuments()) === 0) {
      await Pays.insertMany([
        { nom: 'France', code: 'FR', continent: 'Europe' },
        { nom: 'Italie', code: 'IT', continent: 'Europe' },
        { nom: 'Algérie', code: 'DZ', continent: 'Afrique' },
        { nom: 'Tunisie', code: 'TN', continent: 'Afrique' },
        { nom: 'Allemagne', code: 'DE', continent: 'Europe' },
        { nom: 'Espagne', code: 'ES', continent: 'Europe' },
        { nom: 'Maroc', code: 'MA', continent: 'Afrique' },
        { nom: 'Libye', code: 'LY', continent: 'Afrique' },
        { nom: 'Turquie', code: 'TR', continent: 'Asie' },
        { nom: 'Chine', code: 'CN', continent: 'Asie' }
      ]);
      console.log('✅ Pays créés');
    }
    
    if ((await TypeProduit.countDocuments()) === 0) {
      await TypeProduit.insertMany([
        { nom: 'Carburant', description: 'Produits pétroliers' },
        { nom: 'Gaz', description: 'Gaz naturels et GPL' },
        { nom: 'Lubrifiants', description: 'Huiles et graisses' }
      ]);
      console.log('✅ Types produits créés');
    }
    
    if ((await Product.countDocuments()) === 0) {
      const carburantType = await TypeProduit.findOne({ nom: 'Carburant' });
      const gazType = await TypeProduit.findOne({ nom: 'Gaz' });
      await Product.insertMany([
        { nom: 'Essence Sans Plomb', type: 'STEG', prixUnitaire: 1.85, unite: 'Litres', description: 'Carburant essence', stockInitial: 10000, codeProduit: 'ESP001', category: 'Carburant', typeProduit: carburantType?._id },
        { nom: 'Gas-oil (Diesel)', type: 'STEG', prixUnitaire: 1.75, unite: 'Litres', description: 'Carburant diesel', stockInitial: 10000, codeProduit: 'GOD002', category: 'Carburant', typeProduit: carburantType?._id },
        { nom: 'Kérosène', type: 'STEG', prixUnitaire: 1.65, unite: 'Litres', description: 'Carburant kérosène', stockInitial: 10000, codeProduit: 'KER003', category: 'Carburant', typeProduit: carburantType?._id },
        { nom: 'Pétrole Brut', type: 'STIR', prixUnitaire: 75.50, unite: 'Barils', description: 'Pétrole brut', stockInitial: 10000, codeProduit: 'PEB004', category: 'Carburant', typeProduit: carburantType?._id },
        { nom: 'Gaz Naturel', type: 'STEG', prixUnitaire: 0.45, unite: 'm³', description: 'Gaz naturel', stockInitial: 10000, codeProduit: 'GAN005', category: 'Gaz', typeProduit: gazType?._id },
        { nom: 'GPL', type: 'STEG', prixUnitaire: 0.95, unite: 'Litres', description: 'Gaz de pétrole liquéfié', stockInitial: 10000, codeProduit: 'GPL006', category: 'Gaz', typeProduit: gazType?._id }
      ]);
      console.log('✅ Produits créés');
    }
    
    if ((await Stock.countDocuments()) === 0) {
      const products = await Product.find();
      await Stock.insertMany(products.map(product => ({ product: product._id, quantity: 10000, seuilMin: 5000, alerteActive: true })));
      console.log('✅ Stocks créés');
    }
    
    if ((await User.countDocuments()) === 0) {
      const users = await User.create([
        { raisonSociale: 'Administrateur', email: 'admin2@etap.com', password: 'admin123', role: 'Admin', code: 'ADMIN001', adresse: 'Tunis', actif: true, isActive: true },
        { raisonSociale: 'Société Pétrolière', email: 'fournisseur@etap.com', password: '123456', role: 'Fournisseur', code: 'FOUR001', actif: true, isActive: true },
        { raisonSociale: 'Transport Maritime', email: 'transporteur@etap.com', password: '123456', role: 'Transporteur', code: 'TRANS001', actif: true, isActive: true },
        { raisonSociale: 'Commercial Oil', email: 'nourhenbouranen02@gmail.com', password: '123456', role: 'Commercial', code: 'COMM001', actif: true, isActive: true },
        { raisonSociale: 'Client Particulier', email: 'steg12@gmail.com', password: '123456', role: 'Client', code: 'CLT001', actif: true, isActive: true }
      ]);
      console.log('✅ Utilisateurs créés');
    }
    
    res.json({ success: true, message: 'Base de données initialisée avec succès' });
  } catch (err) {
    console.error('Erreur initialisation:', err);
    res.status(500).json({ message: err.message });
  }
});

// ==================== ROUTE HEALTH ====================

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'API fonctionnelle avec Socket.IO et JWT',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    endpoints: {
      auth: '/api/auth/login - POST, /api/auth/register - POST',
      'forgot-password': '/api/auth/forgot-password - POST',
      'verify-reset-code': '/api/auth/verify-reset-code - POST',
      'reset-password': '/api/auth/reset-password - POST',
      'resend-reset-code': '/api/auth/resend-reset-code - POST',
      notifications: '/api/notifications - GET',
      penalties: '/api/penalties - CRUD complet',
      users: '/api/users - CRUD complet',
      products: '/api/products - CRUD complet',
      stock: '/api/stock - CRUD complet + /api/stock/:id/quantity - PUT',
      'contrats-vente': '/api/contrats-vente - CRUD complet',
      chat: '/api/chat/* - Routes chatbot',
      init: '/api/init-data - POST'
    },
    socket: {
      connected: io.engine.clientsCount,
      events: ['connection', 'register', 'register-user', 'disconnect', 'new_notification']
    }
  });
});

// ==================== ROUTE FALLBACK ====================

app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: `Route ${req.method} ${req.url} non trouvée` 
  });
});

// ==================== MIDDLEWARE D'ERREUR GLOBAL ====================

app.use((err, req, res, next) => {
  console.error("❌ Server error:", err.stack);
  res.status(500).json({ 
    success: false, 
    message: "Internal server error" 
  });
});

// ==================== DÉMARRAGE DU SERVEUR ====================

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 Serveur démarré sur http://localhost:${PORT}`);
  console.log(`📡 API disponible sur http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket disponible sur ws://localhost:${PORT}`);
  console.log(`\n📌 Routes disponibles :`);
  console.log(`   🔐 Auth: /api/auth/login, /api/auth/register`);
  console.log(`   🔑 Forgot Password: /api/auth/forgot-password (POST)`);
  console.log(`   🔑 Verify Code: /api/auth/verify-reset-code (POST)`);
  console.log(`   🔑 Reset Password: /api/auth/reset-password (POST)`);
  console.log(`   🔑 Resend Code: /api/auth/resend-reset-code (POST)`);
  console.log(`   🔔 Notifications: /api/notifications (GET, PUT)`);
  console.log(`   ⚠️ Pénalités: /api/penalties (CRUD)`);
  console.log(`   👥 Users: /api/users`);
  console.log(`   📦 Products: /api/products`);
  console.log(`   📊 Stock: /api/stock`);
  console.log(`   📝 Contrats Vente: /api/contrats-vente`);
  console.log(`   💬 Chatbot: /api/chat/*`);
  console.log(`   🔄 Init Data: POST /api/init-data`);
  console.log(`   🏥 Health: GET /api/health`);
  console.log(`\n💡 Comptes de test :`);
  console.log(`   Admin: admin2@etap.com / admin123`);
  console.log(`   Commercial: nourhenbouranen02@gmail.com / 123456`);
  console.log(`   Client: steg12@gmail.com / 123456`);
  console.log(`   Fournisseur: fournisseur@etap.com / 123456`);
  console.log(`   Transporteur: transporteur@etap.com / 123456`);
  console.log(`\n💡 Socket.IO :`);
  console.log(`   Événements disponibles:`);
  console.log(`   - Écouter: 'new_notification' pour les notifications temps réel`);
  console.log(`   - Émettre: 'register' pour enregistrer l'utilisateur (userId)`);
  console.log(`   - Émettre: 'register-user' pour rejoindre une room utilisateur`);
  console.log(`\n📊 Statistiques :`);
  console.log(`   Clients connectés: ${io.engine.clientsCount}`);
});