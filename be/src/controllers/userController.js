// backend/src/controllers/userController.js - Version complète et unifiée
const User = require('../models/User');
const History = require('../models/History');
const bcrypt = require('bcryptjs');

// ==================== FONCTIONS UTILITAIRES ====================

// Journaliser les actions
const logAction = async (userId, userRole, userEmail, action, entityType, entityId, details, req) => {
  try {
    if (History) {
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
    }
  } catch (err) {
    console.error('Erreur journalisation:', err);
  }
};

// Formater la réponse utilisateur
const formatUserResponse = (user) => {
  const userObj = user.toObject ? user.toObject() : user;
  delete userObj.password;
  delete userObj.motDePasse;
  delete userObj.resetPasswordCode;
  delete userObj.resetPasswordToken;
  delete userObj.resetPasswordExpire;
  delete userObj.__v;
  
  return {
    id: userObj._id,
    nom: userObj.nom || userObj.raisonSociale,
    prenom: userObj.prenom,
    email: userObj.email,
    telephone: userObj.telephone,
    adresse: userObj.adresse,
    role: userObj.role,
    code: userObj.code,
    actif: userObj.actif !== undefined ? userObj.actif : userObj.isActive,
    raisonSociale: userObj.raisonSociale,
    lastLogin: userObj.lastLogin,
    createdAt: userObj.createdAt || userObj.dateCreation,
    updatedAt: userObj.updatedAt
  };
};

// ==================== GET ALL USERS ====================
exports.getUsers = async (req, res) => {
  try {
    const { role, actif, search, limit = 100, page = 1 } = req.query;
    
    let query = {};
    
    // Filtre par rôle
    if (role) {
      query.role = role;
    }
    
    // Filtre par statut
    if (actif !== undefined) {
      query.actif = actif === 'true';
    }
    
    // Recherche par nom ou email
    if (search) {
      query.$or = [
        { nom: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { raisonSociale: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -motDePasse -resetPasswordCode -resetPasswordToken -resetPasswordExpire')
        .sort({ createdAt: -1, dateCreation: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);
    
    const formattedUsers = users.map(formatUserResponse);
    
    res.json({
      success: true,
      data: formattedUsers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('❌ Erreur getUsers:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== GET ALL USERS (ALIAS) ====================
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password -motDePasse -resetPasswordCode -resetPasswordToken -resetPasswordExpire')
      .sort({ createdAt: -1, dateCreation: -1 });
    
    const formattedUsers = users.map(formatUserResponse);
    
    res.json({
      success: true,
      data: formattedUsers,
      total: formattedUsers.length
    });
  } catch (error) {
    console.error('❌ Erreur getAllUsers:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ==================== GET USERS BY ROLE ====================
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
    
    const formattedUsers = users.map(formatUserResponse);
    
    console.log(`✅ ${formattedUsers.length} utilisateur(s) trouvé(s) pour le rôle ${role}`);
    
    res.json({
      success: true,
      data: formattedUsers,
      count: formattedUsers.length,
      role
    });
  } catch (err) {
    console.error(`❌ Erreur getUsersByRole (${role}):`, err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== GET TRANSPORTEURS ====================
exports.getTransporteurs = async (req, res) => {
  try {
    console.log('🔍 Récupération des transporteurs...');
    
    const transporteurs = await User.find({ 
      role: 'Transporteur', 
      actif: true 
    })
      .select('nom prenom email telephone role actif adresse code')
      .sort({ nom: 1 });
    
    const formattedTransporteurs = transporteurs.map(t => ({
      id: t._id,
      nom: t.nom,
      prenom: t.prenom,
      email: t.email,
      telephone: t.telephone,
      adresse: t.adresse,
      role: t.role,
      code: t.code,
      actif: t.actif
    }));
    
    console.log(`✅ ${formattedTransporteurs.length} transporteur(s) trouvé(s)`);
    
    res.json({
      success: true,
      data: formattedTransporteurs,
      count: formattedTransporteurs.length
    });
  } catch (err) {
    console.error('❌ Erreur getTransporteurs:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== GET FOURNISSEURS ====================
exports.getFournisseurs = async (req, res) => {
  try {
    const fournisseurs = await User.find({ 
      role: 'Fournisseur', 
      actif: true 
    })
      .select('nom prenom email telephone role actif adresse code raisonSociale')
      .sort({ nom: 1 });
    
    const formattedFournisseurs = fournisseurs.map(f => ({
      id: f._id,
      nom: f.nom,
      prenom: f.prenom,
      email: f.email,
      telephone: f.telephone,
      adresse: f.adresse,
      role: f.role,
      code: f.code,
      raisonSociale: f.raisonSociale,
      actif: f.actif
    }));
    
    res.json({
      success: true,
      data: formattedFournisseurs,
      count: formattedFournisseurs.length
    });
  } catch (err) {
    console.error('❌ Erreur getFournisseurs:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== GET COMMERCIAUX ====================
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
    console.error('❌ Erreur getCommerciaux:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== GET CLIENTS ====================
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
    console.error('❌ Erreur getClients:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== GET USER BY ID ====================
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -motDePasse -resetPasswordCode -resetPasswordToken -resetPasswordExpire');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }
    
    res.json({
      success: true,
      data: formatUserResponse(user)
    });
  } catch (err) {
    console.error('❌ Erreur getUserById:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== GET PROFILE ====================
exports.getProfile = async (req, res) => {
  try {
    const userId = req.params.id || req.user?._id;
    
    const user = await User.findById(userId)
      .select('-password -motDePasse -resetPasswordCode -resetPasswordToken -resetPasswordExpire');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }
    
    res.json({
      success: true,
      data: formatUserResponse(user)
    });
  } catch (error) {
    console.error('❌ Erreur getProfile:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ==================== CREATE USER ====================
exports.createUser = async (req, res) => {
  try {
    const { 
      nom, prenom, email, password, motDePasse, 
      telephone, adresse, role, raisonSociale, code 
    } = req.body;
    
    const userPassword = password || motDePasse;
    
    // Validation
    if (!nom || !email || !userPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nom, email et mot de passe requis' 
      });
    }
    
    if (userPassword.length < 6) {
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
    
    // Créer un code unique si non fourni
    const userCode = code || `USER${Date.now()}${Math.floor(Math.random() * 1000)}`;
    
    const user = await User.create({
      nom,
      prenom,
      email: email.toLowerCase(),
      password: userPassword,
      telephone,
      adresse,
      role: role || 'Client',
      raisonSociale: raisonSociale || nom,
      code: userCode,
      actif: true,
      isActive: true
    });
    
    // Journaliser l'action
    await logAction(
      user._id, user.role, user.email, 'create', 
      'user', user._id, { nom, email, role }, req
    );
    
    console.log(`✅ Utilisateur créé: ${user.email} (${user.role})`);
    
    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      data: formatUserResponse(user)
    });
  } catch (err) {
    console.error('❌ Erreur createUser:', err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// ==================== UPDATE USER ====================
exports.updateUser = async (req, res) => {
  try {
    const { nom, prenom, email, telephone, adresse, role, raisonSociale, code } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    // Vérifier si l'email est déjà utilisé par un autre utilisateur
    if (email && email.toLowerCase() !== user.email) {
      const existingUser = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Cet email est déjà utilisé'
        });
      }
    }

    // Construire les champs à mettre à jour
    const updateFields = {};
    if (nom) updateFields.nom = nom;
    if (prenom !== undefined) updateFields.prenom = prenom;
    if (email) updateFields.email = email.toLowerCase();
    if (telephone !== undefined) updateFields.telephone = telephone;
    if (adresse !== undefined) updateFields.adresse = adresse;
    if (role) updateFields.role = role;
    if (raisonSociale) updateFields.raisonSociale = raisonSociale;
    if (code !== undefined) updateFields.code = code || undefined;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: false }
    );

    // Journaliser l'action
    await logAction(
      user._id, user.role, user.email, 'update',
      'user', user._id, { nom, prenom, email, role }, req
    );

    console.log(`✏️ Utilisateur mis à jour: ${updatedUser.email}`);

    res.json({
      success: true,
      message: 'Utilisateur mis à jour avec succès',
      data: formatUserResponse(updatedUser)
    });
  } catch (err) {
    console.error('❌ Erreur updateUser:', err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// ==================== UPDATE PROFILE ====================
exports.updateProfile = async (req, res) => {
  try {
    const { nom, prenom, telephone, adresse } = req.body;
    const userId = req.params.id || req.user?._id;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }
    
    if (nom) user.nom = nom;
    if (prenom) user.prenom = prenom;
    if (telephone) user.telephone = telephone;
    if (adresse) user.adresse = adresse;
    
    await user.save();
    
    // Journaliser
    await logAction(
      user._id, user.role, user.email, 'update_profile', 
      'user', user._id, { nom, prenom, telephone, adresse }, req
    );
    
    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      data: formatUserResponse(user)
    });
  } catch (error) {
    console.error('❌ Erreur updateProfile:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ==================== CHANGE PASSWORD ====================
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, currentPassword, newPassword } = req.body;
    const passwordToCheck = oldPassword || currentPassword;
    const userId = req.params.id || req.user?._id;
    
    if (!passwordToCheck || !newPassword) {
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
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }
    
    const isMatch = await user.comparePassword(passwordToCheck);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false, 
        message: 'Mot de passe actuel incorrect' 
      });
    }
    
    user.password = newPassword;
    await user.save();
    
    // Journaliser
    await logAction(
      user._id, user.role, user.email, 'change_password', 
      'user', user._id, {}, req
    );
    
    res.json({
      success: true,
      message: 'Mot de passe modifié avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur changePassword:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ==================== DELETE USER ====================
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }
    
    const userEmail = user.email;
    await user.deleteOne();
    
    // Journaliser
    await logAction(
      req.user?._id, req.user?.role, req.user?.email, 'delete', 
      'user', req.params.id, { deletedUser: userEmail }, req
    );
    
    console.log(`🗑️ Utilisateur supprimé: ${userEmail}`);
    
    res.json({
      success: true,
      message: 'Utilisateur supprimé avec succès'
    });
  } catch (err) {
    console.error('❌ Erreur deleteUser:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== ACTIVATE USER ====================
exports.activateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }
    
    user.actif = true;
    user.isActive = true;
    await user.save();
    
    // Journaliser
    await logAction(
      req.user?._id, req.user?.role, req.user?.email, 'activate', 
      'user', user._id, { userEmail: user.email }, req
    );
    
    console.log(`✅ Utilisateur activé: ${user.email}`);
    
    res.json({
      success: true,
      message: 'Utilisateur activé avec succès',
      data: formatUserResponse(user)
    });
  } catch (err) {
    console.error('❌ Erreur activateUser:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== DEACTIVATE USER ====================
exports.deactivateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }
    
    user.actif = false;
    user.isActive = false;
    await user.save();
    
    // Journaliser
    await logAction(
      req.user?._id, req.user?.role, req.user?.email, 'deactivate', 
      'user', user._id, { userEmail: user.email }, req
    );
    
    console.log(`⚠️ Utilisateur désactivé: ${user.email}`);
    
    res.json({
      success: true,
      message: 'Utilisateur désactivé avec succès',
      data: formatUserResponse(user)
    });
  } catch (err) {
    console.error('❌ Erreur deactivateUser:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== BATCH OPERATIONS ====================

// Désactiver plusieurs utilisateurs
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
    console.error('❌ Erreur batchDeactivateUsers:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Activer plusieurs utilisateurs
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
    console.error('❌ Erreur batchActivateUsers:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== STATISTIQUES ====================

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
    console.error('❌ Erreur getUserStats:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};