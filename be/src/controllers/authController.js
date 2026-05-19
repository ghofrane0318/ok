// backend/src/controllers/authController.js - Version complète et unifiée
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Modèle History (si disponible)
let History = null;
try {
  History = require('../models/History');
} catch (err) {
  console.log('⚠️ Modèle History non trouvé, journalisation désactivée');
}

// Configuration email (optionnel)
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ==================== FONCTIONS UTILITAIRES ====================

const generateToken = (userId, role = null) => {
  const payload = { id: userId };
  if (role) payload.role = role;
  
  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'etapgas2026',
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
};

const generateResetCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Journaliser les actions
const logAction = async (userId, userRole, userEmail, action, entityType, entityId, details, req) => {
  if (!History) return;
  
  try {
    await History.create({
      userId,
      userRole,
      userEmail,
      action,
      entityType,
      entityId,
      details,
      ipAddress: req?.ip || 'unknown',
      userAgent: req?.headers?.['user-agent'] || 'unknown'
    });
  } catch (err) {
    console.error('Erreur journalisation:', err);
  }
};

// ==================== AUTHENTIFICATION ====================

// LOGIN - Connexion utilisateur
exports.login = async (req, res) => {
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
    
    // Rechercher l'utilisateur
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log('❌ Utilisateur non trouvé:', email);
      return res.status(401).json({ 
        success: false,
        message: 'Email ou mot de passe incorrect' 
      });
    }
    
    console.log('✅ Utilisateur trouvé:', user.email, 'Rôle:', user.role);
    
    // Vérifier si le compte est actif
    const isActive = user.actif !== false && user.isActive !== false;
    console.log('📊 Compte actif:', isActive);
    
    if (!isActive) {
      console.log('⚠️ Compte désactivé:', email);
      return res.status(401).json({ 
        success: false,
        message: 'Compte désactivé. Veuillez contacter l\'administrateur.' 
      });
    }
    
    // Vérifier le mot de passe avec la méthode comparePassword
    const isMatch = await user.comparePassword(loginPassword);
    console.log('🔑 Mot de passe valide:', isMatch);
    
    if (!isMatch) {
      console.log('❌ Mot de passe incorrect pour:', email);
      return res.status(401).json({ 
        success: false,
        message: 'Email ou mot de passe incorrect' 
      });
    }
    
    // Mettre à jour la dernière connexion
    user.lastLogin = new Date();
    await user.save();
    
    // Générer le token JWT
    const token = generateToken(user._id, user.role);
    
    // Préparer les données utilisateur à retourner
    const userData = {
      id: user._id,
      nom: user.nom || user.raisonSociale,
      prenom: user.prenom,
      email: user.email,
      telephone: user.telephone,
      adresse: user.adresse,
      role: user.role,
      code: user.code,
      actif: user.actif
    };
    
    // Journaliser l'action
    await logAction(
      user._id, user.role, user.email, 'login', 
      'user', user._id, { email: user.email }, req
    );
    
    console.log('🎉 Login réussi pour:', email);
    
    res.json({
      success: true,
      message: 'Connexion réussie',
      token,
      user: userData
    });
    
  } catch (err) {
    console.error('❌ Erreur login:', err);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur lors de la connexion' 
    });
  }
};

// REGISTER - Inscription utilisateur
exports.register = async (req, res) => {
  try {
    const { nom, prenom, email, password, telephone, adresse, role, raisonSociale } = req.body;
    
    // Validation
    if (!nom || !email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Nom, email et mot de passe requis' 
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'Le mot de passe doit contenir au moins 6 caractères' 
      });
    }
    
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: 'Cet email est déjà utilisé' 
      });
    }
    
    // Créer un code unique
    const code = `USER${Date.now()}${Math.floor(Math.random() * 1000)}`;
    
    // Créer l'utilisateur
    const user = new User({
      nom,
      prenom,
      email: email.toLowerCase(),
      password,
      telephone,
      adresse,
      role: role || 'Client',
      raisonSociale: raisonSociale || nom,
      code,
      actif: true,
      isActive: true
    });
    
    await user.save();
    
    // Générer le token
    const token = generateToken(user._id, user.role);
    
    // Journaliser l'inscription
    await logAction(
      user._id, user.role, user.email, 'create', 
      'user', user._id, { nom, email, role: user.role }, req
    );
    
    console.log(`📝 Nouvel utilisateur inscrit: ${user.email} (${user.role})`);
    
    // Préparer les données à retourner
    const userData = {
      id: user._id,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      telephone: user.telephone,
      adresse: user.adresse,
      role: user.role,
      code: user.code
    };
    
    res.status(201).json({
      success: true,
      message: 'Inscription réussie',
      token,
      user: userData
    });
    
  } catch (err) {
    console.error('❌ Erreur register:', err);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur lors de l\'inscription' 
    });
  }
};

// LOGOUT - Déconnexion
exports.logout = async (req, res) => {
  try {
    if (req.user) {
      await logAction(
        req.user._id, req.user.role, req.user.email, 'logout', 
        'user', req.user._id, {}, req
      );
      console.log(`👋 Déconnexion: ${req.user.email}`);
    }
    
    res.json({
      success: true,
      message: 'Déconnexion réussie'
    });
  } catch (err) {
    console.error('Erreur logout:', err);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la déconnexion' 
    });
  }
};

// GET ME - Obtenir le profil de l'utilisateur connecté
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -motDePasse -resetPasswordCode -resetPasswordToken -resetPasswordExpire');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Utilisateur non trouvé' 
      });
    }
    
    res.json({
      success: true,
      user: {
        id: user._id,
        nom: user.nom || user.raisonSociale,
        prenom: user.prenom,
        email: user.email,
        telephone: user.telephone,
        adresse: user.adresse,
        role: user.role,
        code: user.code,
        actif: user.actif,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error('Erreur getMe:', err);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur' 
    });
  }
};

// UPDATE PROFILE - Mettre à jour le profil
exports.updateProfile = async (req, res) => {
  try {
    const { nom, prenom, telephone, adresse } = req.body;
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Utilisateur non trouvé' 
      });
    }
    
    if (nom) user.nom = nom;
    if (prenom) user.prenom = prenom;
    if (telephone) user.telephone = telephone;
    if (adresse) user.adresse = adresse;
    
    await user.save();
    
    await logAction(
      user._id, user.role, user.email, 'update_profile', 
      'user', user._id, { nom, prenom, telephone, adresse }, req
    );
    
    res.json({
      success: true,
      message: 'Profil mis à jour',
      user: {
        id: user._id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        telephone: user.telephone,
        adresse: user.adresse,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Erreur updateProfile:', err);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur' 
    });
  }
};

// CHANGE PASSWORD - Changer le mot de passe
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, oldPassword, newPassword } = req.body;
    const oldPwd = currentPassword || oldPassword;
    
    if (!oldPwd || !newPassword) {
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
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Utilisateur non trouvé' 
      });
    }
    
    const isMatch = await user.comparePassword(oldPwd);
    
    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        message: 'Mot de passe actuel incorrect' 
      });
    }
    
    user.password = newPassword;
    await user.save();
    
    await logAction(
      user._id, user.role, user.email, 'change_password', 
      'user', user._id, {}, req
    );
    
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
};

// ==================== FORGOT PASSWORD (CODE À 6 CHIFFRES) ====================

// FORGOT PASSWORD - Envoyer le code de réinitialisation
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: 'Email requis' 
      });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    
    if (!user) {
      // Pour des raisons de sécurité, on ne révèle pas si l'email existe
      return res.status(200).json({
        success: true,
        message: 'Si votre email est enregistré, vous recevrez un code de réinitialisation'
      });
    }
    
    // Générer un code à 6 chiffres et un token
    const resetCode = generateResetCode();
    const resetToken = generateResetToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    // Sauvegarder dans l'utilisateur
    user.resetPasswordCode = resetCode;
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = expiresAt;
    await user.save();
    
    console.log(`📧 Code de réinitialisation pour ${normalizedEmail}: ${resetCode}`);
    
    // Envoyer l'email (optionnel)
    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await transporter.sendMail({
          to: user.email,
          subject: 'Réinitialisation de votre mot de passe - ETAP',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1a5f7a;">Réinitialisation de mot de passe</h2>
              <p>Bonjour ${user.nom || user.raisonSociale},</p>
              <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
              <p>Voici votre code de vérification :</p>
              <div style="background-color: #f0f0f0; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold;">
                ${resetCode}
              </div>
              <p>Ce code expire dans 15 minutes.</p>
              <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
              <hr>
              <p style="font-size: 12px; color: #666;">ETAP - Entreprise Tunisienne d'Activités Pétrolières</p>
            </div>
          `
        });
        console.log('✅ Email envoyé avec succès');
      }
    } catch (emailError) {
      console.warn('⚠️ Email non envoyé:', emailError.message);
    }
    
    res.status(200).json({
      success: true,
      message: 'Code de réinitialisation envoyé',
      resetToken: resetToken,
      dev_code: process.env.NODE_ENV === 'development' ? resetCode : undefined
    });
    
  } catch (error) {
    console.error('❌ Erreur forgotPassword:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur' 
    });
  }
};

// VERIFY RESET CODE - Vérifier le code
exports.verifyResetCode = async (req, res) => {
  try {
    const { email, code, resetToken } = req.body;
    
    if (!email || !code || !resetToken) {
      return res.status(400).json({ 
        success: false,
        message: 'Email, code et token requis' 
      });
    }
    
    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordCode: code,
      resetPasswordToken: resetToken,
      resetPasswordExpire: { $gt: Date.now() }
    });
    
    if (!user) {
      // Vérifier si le code est expiré
      const expiredUser = await User.findOne({
        email: email.toLowerCase(),
        resetPasswordCode: code,
        resetPasswordToken: resetToken,
        resetPasswordExpire: { $lte: Date.now() }
      });
      
      if (expiredUser) {
        return res.status(400).json({ 
          success: false,
          message: 'Code expiré. Veuillez en demander un nouveau.' 
        });
      }
      
      return res.status(400).json({ 
        success: false,
        message: 'Code invalide' 
      });
    }
    
    // Marquer le code comme vérifié
    user.resetPasswordVerified = true;
    await user.save();
    
    // Générer un token temporaire pour l'étape suivante
    const tempToken = generateResetToken();
    
    res.status(200).json({
      success: true,
      message: 'Code vérifié avec succès',
      tempToken: tempToken
    });
    
  } catch (error) {
    console.error('❌ Erreur verifyResetCode:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur' 
    });
  }
};

// RESET PASSWORD - Réinitialiser le mot de passe
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword, resetToken, tempToken } = req.body;
    
    // Accepter soit resetToken (étape 1) soit tempToken (étape 2)
    const tokenToUse = resetToken || tempToken;
    
    if (!email || !code || !newPassword || !tokenToUse) {
      return res.status(400).json({ 
        success: false,
        message: 'Tous les champs sont requis' 
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'Le mot de passe doit contenir au moins 6 caractères' 
      });
    }
    
    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordCode: code,
      resetPasswordExpire: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: 'Code invalide ou expiré' 
      });
    }
    
    // Mettre à jour le mot de passe
    user.password = newPassword;
    
    // Supprimer les champs de réinitialisation
    user.resetPasswordCode = undefined;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.resetPasswordVerified = undefined;
    
    await user.save();
    
    await logAction(
      user._id, user.role, user.email, 'reset_password', 
      'user', user._id, {}, req
    );
    
    console.log(`✅ Mot de passe réinitialisé pour ${user.email}`);
    
    res.status(200).json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès'
    });
    
  } catch (error) {
    console.error('❌ Erreur resetPassword:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur' 
    });
  }
};

// RESEND RESET CODE - Renvoyer le code
exports.resendResetCode = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: 'Email requis' 
      });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'Si votre email est enregistré, vous recevrez un nouveau code'
      });
    }
    
    const resetCode = generateResetCode();
    const resetToken = generateResetToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    
    user.resetPasswordCode = resetCode;
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = expiresAt;
    await user.save();
    
    console.log(`📧 Nouveau code pour ${normalizedEmail}: ${resetCode}`);
    
    res.status(200).json({
      success: true,
      message: 'Nouveau code envoyé',
      resetToken: resetToken,
      dev_code: process.env.NODE_ENV === 'development' ? resetCode : undefined
    });
    
  } catch (error) {
    console.error('❌ Erreur resendResetCode:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur' 
    });
  }
};

// ==================== QR CODE LOGIN ====================

// QR CODE LOGIN - Connexion par QR code
exports.qrLogin = async (req, res) => {
  try {
    const { qrData } = req.body;
    
    if (!qrData) {
      return res.status(400).json({ 
        success: false,
        message: 'Données QR code requises' 
      });
    }
    
    // Format: etap://featureId/role
    const match = qrData.match(/etap:\/\/(.+)\/(.+)/);
    
    if (!match) {
      return res.status(400).json({ 
        success: false,
        message: 'QR Code invalide' 
      });
    }
    
    const [, featureId, role] = match;
    
    // Normaliser le rôle
    const normalizedRole = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
    
    // Trouver un utilisateur avec ce rôle
    const user = await User.findOne({ role: normalizedRole, actif: true });
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Aucun utilisateur trouvé pour ce rôle' 
      });
    }
    
    const token = generateToken(user._id, user.role);
    
    const userData = {
      id: user._id,
      nom: user.nom || user.raisonSociale,
      prenom: user.prenom,
      email: user.email,
      telephone: user.telephone,
      role: user.role
    };
    
    res.json({
      success: true,
      user: userData,
      token,
      feature: featureId
    });
    
  } catch (error) {
    console.error('❌ Erreur qrLogin:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur' 
    });
  }
};

// ==================== GESTION DES UTILISATEURS (ADMIN) ====================

// CREATE USER - Créer un utilisateur (Admin)
exports.createUser = async (req, res) => {
  try {
    const { nom, prenom, email, password, telephone, adresse, role } = req.body;
    
    // Validation
    if (!nom || !email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Nom, email et mot de passe requis' 
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'Le mot de passe doit contenir au moins 6 caractères' 
      });
    }
    
    // Vérifier si l'utilisateur existe
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: 'Cet email est déjà utilisé' 
      });
    }
    
    // Créer le code
    const code = `USER${Date.now()}${Math.floor(Math.random() * 1000)}`;
    
    const newUser = new User({
      nom,
      prenom,
      email: email.toLowerCase(),
      password,
      telephone,
      adresse,
      role: role || 'Client',
      code,
      actif: true,
      isActive: true
    });
    
    await newUser.save();
    
    await logAction(
      req.user?._id, req.user?.role, req.user?.email, 'create_user', 
      'user', newUser._id, { email: newUser.email, role: newUser.role }, req
    );
    
    console.log(`👤 Nouvel utilisateur créé par admin: ${newUser.email} (${newUser.role})`);
    
    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      user: {
        id: newUser._id,
        nom: newUser.nom,
        prenom: newUser.prenom,
        email: newUser.email,
        telephone: newUser.telephone,
        adresse: newUser.adresse,
        role: newUser.role,
        code: newUser.code,
        actif: newUser.actif,
        createdAt: newUser.createdAt
      }
    });
    
  } catch (err) {
    console.error('❌ Erreur createUser:', err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// GET ALL USERS - Liste tous les utilisateurs (Admin)
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 100, search = '', role = '' } = req.query;
    
    let query = {};
    
    if (search) {
      query.$or = [
        { nom: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { raisonSociale: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) {
      query.role = role;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -motDePasse -resetPasswordCode -resetPasswordToken -resetPasswordExpire')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      data: users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Erreur getAllUsers:', err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// GET USER BY ID - Obtenir un utilisateur (Admin)
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -motDePasse -resetPasswordCode -resetPasswordToken -resetPasswordExpire');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Utilisateur non trouvé' 
      });
    }
    
    res.json({ 
      success: true, 
      data: user 
    });
  } catch (err) {
    console.error('Erreur getUserById:', err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// UPDATE USER - Mettre à jour un utilisateur (Admin)
exports.updateUser = async (req, res) => {
  try {
    const { nom, prenom, email, telephone, adresse, role, actif } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Utilisateur non trouvé' 
      });
    }
    
    if (nom) user.nom = nom;
    if (prenom) user.prenom = prenom;
    if (email) user.email = email.toLowerCase();
    if (telephone) user.telephone = telephone;
    if (adresse) user.adresse = adresse;
    if (role) user.role = role;
    if (actif !== undefined) {
      user.actif = actif;
      user.isActive = actif;
    }
    
    user.updatedAt = Date.now();
    await user.save();
    
    await logAction(
      req.user?._id, req.user?.role, req.user?.email, 'update_user', 
      'user', user._id, { email: user.email, role: user.role }, req
    );
    
    console.log(`✏️ Utilisateur mis à jour: ${user.email}`);
    
    res.json({
      success: true,
      message: 'Utilisateur mis à jour',
      user: {
        id: user._id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        telephone: user.telephone,
        adresse: user.adresse,
        role: user.role,
        actif: user.actif
      }
    });
  } catch (err) {
    console.error('Erreur updateUser:', err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// DELETE USER - Supprimer un utilisateur (Admin)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Utilisateur non trouvé' 
      });
    }
    
    await logAction(
      req.user?._id, req.user?.role, req.user?.email, 'delete_user', 
      'user', user._id, { email: user.email }, req
    );
    
    console.log(`🗑️ Utilisateur supprimé: ${user.email}`);
    
    res.json({
      success: true,
      message: 'Utilisateur supprimé avec succès'
    });
  } catch (err) {
    console.error('Erreur deleteUser:', err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// ACTIVATE USER - Activer un utilisateur
exports.activateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Utilisateur non trouvé' 
      });
    }
    
    user.actif = true;
    user.isActive = true;
    await user.save();
    
    await logAction(
      req.user?._id, req.user?.role, req.user?.email, 'activate_user', 
      'user', user._id, { email: user.email }, req
    );
    
    res.json({
      success: true,
      message: 'Utilisateur activé avec succès',
      user: {
        id: user._id,
        nom: user.nom,
        email: user.email,
        role: user.role,
        actif: user.actif
      }
    });
  } catch (err) {
    console.error('Erreur activateUser:', err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// DEACTIVATE USER - Désactiver un utilisateur
exports.deactivateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Utilisateur non trouvé' 
      });
    }
    
    user.actif = false;
    user.isActive = false;
    await user.save();
    
    await logAction(
      req.user?._id, req.user?.role, req.user?.email, 'deactivate_user', 
      'user', user._id, { email: user.email }, req
    );
    
    res.json({
      success: true,
      message: 'Utilisateur désactivé avec succès',
      user: {
        id: user._id,
        nom: user.nom,
        email: user.email,
        role: user.role,
        actif: user.actif
      }
    });
  } catch (err) {
    console.error('Erreur deactivateUser:', err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// GET USER STATS - Statistiques des utilisateurs
exports.getUserStats = async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          total: { $sum: 1 },
          actifs: { $sum: { $cond: [{ $eq: ['$actif', true] }, 1, 0] } },
          inactifs: { $sum: { $cond: [{ $eq: ['$actif', false] }, 1, 0] } }
        }
      }
    ]);
    
    const totalUsers = await User.countDocuments();
    
    res.json({
      success: true,
      data: {
        total: totalUsers,
        byRole: stats,
        roles: {
          Admin: await User.countDocuments({ role: 'Admin' }),
          Commercial: await User.countDocuments({ role: 'Commercial' }),
          Client: await User.countDocuments({ role: 'Client' }),
          Transporteur: await User.countDocuments({ role: 'Transporteur' }),
          Fournisseur: await User.countDocuments({ role: 'Fournisseur' })
        }
      }
    });
  } catch (err) {
    console.error('Erreur getUserStats:', err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// GET USERS BY ROLE - Liste des utilisateurs par rôle
exports.getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;
    const { actif = true } = req.query;
    
    const validRoles = ['Admin', 'Commercial', 'Client', 'Transporteur', 'Fournisseur'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        success: false, 
        message: `Rôle invalide. Utilisez: ${validRoles.join(', ')}` 
      });
    }
    
    const users = await User.find({ 
      role, 
      actif: actif === 'true' 
    })
      .select('-password -motDePasse -resetPasswordCode -resetPasswordToken -resetPasswordExpire')
      .sort({ nom: 1 });
    
    res.json({
      success: true,
      data: users,
      count: users.length,
      role
    });
  } catch (err) {
    console.error('Erreur getUsersByRole:', err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// GET TRANSPORTEURS
exports.getTransporteurs = async (req, res) => {
  try {
    const transporteurs = await User.find({ 
      role: 'Transporteur', 
      actif: true 
    })
      .select('nom prenom email telephone role actif adresse code')
      .sort({ nom: 1 });
    
    res.json({
      success: true,
      data: transporteurs,
      count: transporteurs.length
    });
  } catch (err) {
    console.error('Erreur getTransporteurs:', err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// GET FOURNISSEURS
exports.getFournisseurs = async (req, res) => {
  try {
    const fournisseurs = await User.find({ 
      role: 'Fournisseur', 
      actif: true 
    })
      .select('nom prenom email telephone role actif adresse code raisonSociale')
      .sort({ nom: 1 });
    
    res.json({
      success: true,
      data: fournisseurs,
      count: fournisseurs.length
    });
  } catch (err) {
    console.error('Erreur getFournisseurs:', err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// GET COMMERCIAUX
exports.getCommerciaux = async (req, res) => {
  try {
    const commerciaux = await User.find({ 
      role: 'Commercial', 
      actif: true 
    })
      .select('nom prenom email telephone role actif')
      .sort({ nom: 1 });
    
    res.json({
      success: true,
      data: commerciaux,
      count: commerciaux.length
    });
  } catch (err) {
    console.error('Erreur getCommerciaux:', err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// GET CLIENTS
exports.getClients = async (req, res) => {
  try {
    const clients = await User.find({ 
      role: 'Client', 
      actif: true 
    })
      .select('nom prenom email telephone adresse role actif code raisonSociale')
      .sort({ nom: 1 });
    
    res.json({
      success: true,
      data: clients,
      count: clients.length
    });
  } catch (err) {
    console.error('Erreur getClients:', err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// VERIFY ACCOUNT - Vérifier un compte
exports.verifyAccount = async (req, res) => {
  const { token } = req.params;
  res.json({ 
    success: true,
    message: `Compte vérifié avec le token ${token}` 
  });
};

// REJECT ACCOUNT - Rejeter un compte
exports.rejectAccount = async (req, res) => {
  const { token } = req.params;
  res.json({ 
    success: true,
    message: `Compte rejeté avec le token ${token}` 
  });
};

// BATCH OPERATIONS - Opérations par lot
exports.batchActivateUsers = async (req, res) => {
  try {
    const { userIds } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Liste d\'IDs utilisateur requise' 
      });
    }
    
    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { actif: true, isActive: true, updatedAt: Date.now() }
    );
    
    res.json({
      success: true,
      message: `${result.modifiedCount} utilisateur(s) activé(s)`,
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    console.error('Erreur batchActivateUsers:', err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

exports.batchDeactivateUsers = async (req, res) => {
  try {
    const { userIds } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Liste d\'IDs utilisateur requise' 
      });
    }
    
    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { actif: false, isActive: false, updatedAt: Date.now() }
    );
    
    res.json({
      success: true,
      message: `${result.modifiedCount} utilisateur(s) désactivé(s)`,
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    console.error('Erreur batchDeactivateUsers:', err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};