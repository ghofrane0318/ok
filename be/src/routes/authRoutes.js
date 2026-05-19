// backend/src/routes/authRoutes.js - Version complète et unifiée
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protectRoute, authorize } = require('../middlewares/authMiddleware');

// Vérification des contrôleurs au démarrage
if (!authController.login || !authController.register) {
  console.error('❌ Erreur: login ou register non trouvés dans authController');
}

console.log('✅ Routes d\'authentification chargées');

// ==================== ROUTES PUBLIQUES ====================

/**
 * @route   POST /api/auth/login
 * @desc    Connexion utilisateur
 * @access  Public
 * @body    { email, password, motDePasse }
 */
router.post("/login", authController.login);

/**
 * @route   POST /api/auth/register
 * @desc    Inscription utilisateur
 * @access  Public
 * @body    { nom, prenom, email, password, telephone, adresse, role }
 */
router.post("/register", authController.register);

/**
 * @route   POST /api/auth/qr-login
 * @desc    Connexion par QR code
 * @access  Public
 * @body    { qrData }
 */
router.post("/qr-login", authController.qrLogin);

// ==================== ROUTES FORGOT PASSWORD ====================

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Envoyer un code de réinitialisation
 * @access  Public
 * @body    { email }
 */
router.post("/forgot-password", authController.forgotPassword);

/**
 * @route   POST /api/auth/verify-reset-code
 * @desc    Vérifier le code de réinitialisation
 * @access  Public
 * @body    { email, code, resetToken }
 */
router.post("/verify-reset-code", authController.verifyResetCode);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Réinitialiser le mot de passe
 * @access  Public
 * @body    { email, code, newPassword, resetToken }
 */
router.post("/reset-password", authController.resetPassword);

/**
 * @route   POST /api/auth/resend-reset-code
 * @desc    Renvoyer un code de réinitialisation
 * @access  Public
 * @body    { email }
 */
router.post("/resend-reset-code", authController.resendResetCode);

// ==================== ROUTES DE VÉRIFICATION DE COMPTE ====================

/**
 * @route   GET /api/auth/verify/:token
 * @desc    Vérifier un compte par token
 * @access  Public
 */
router.get("/verify/:token", authController.verifyAccount);

/**
 * @route   GET /api/auth/reject/:token
 * @desc    Rejeter un compte par token
 * @access  Public
 */
router.get("/reject/:token", authController.rejectAccount);

// ==================== ROUTES PROTÉGÉES ====================

/**
 * @route   POST /api/auth/logout
 * @desc    Déconnexion utilisateur
 * @access  Private
 */
router.post("/logout", protectRoute, authController.logout);

/**
 * @route   GET /api/auth/me
 * @desc    Obtenir le profil de l'utilisateur connecté
 * @access  Private
 */
router.get("/me", protectRoute, authController.getMe);

/**
 * @route   PUT /api/auth/profile
 * @desc    Mettre à jour le profil
 * @access  Private
 * @body    { nom, prenom, telephone, adresse }
 */
router.put("/profile", protectRoute, authController.updateProfile);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Changer le mot de passe
 * @access  Private
 * @body    { currentPassword, newPassword }
 */
router.put("/change-password", protectRoute, authController.changePassword);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Rafraîchir le token JWT
 * @access  Private
 */
router.post("/refresh-token", protectRoute, (req, res) => {
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { id: req.user._id, role: req.user.role },
    process.env.JWT_SECRET || 'etapgas2026',
    { expiresIn: '7d' }
  );
  res.json({ success: true, token });
});

// ==================== ROUTES ADMIN (CRÉATION D'UTILISATEURS) ====================

/**
 * @route   POST /api/auth/create-user
 * @desc    Créer un utilisateur (Admin)
 * @access  Private/Admin
 * @body    { nom, prenom, email, password, telephone, adresse, role }
 */
router.post("/create-user", protectRoute, authorize('Admin'), authController.createUser);

/**
 * @route   POST /api/auth/users
 * @desc    Créer un utilisateur (Admin) - Alias
 * @access  Private/Admin
 */
router.post("/users", protectRoute, authorize('Admin'), authController.createUser);

/**
 * @route   GET /api/auth/users
 * @desc    Liste tous les utilisateurs (Admin)
 * @access  Private/Admin
 */
router.get("/users", protectRoute, authorize('Admin'), authController.getAllUsers);

/**
 * @route   GET /api/auth/users/stats
 * @desc    Statistiques des utilisateurs (Admin)
 * @access  Private/Admin
 */
router.get("/users/stats", protectRoute, authorize('Admin'), authController.getUserStats);

/**
 * @route   GET /api/auth/users/:id
 * @desc    Obtenir un utilisateur par ID (Admin)
 * @access  Private/Admin
 */
router.get("/users/:id", protectRoute, authorize('Admin'), authController.getUserById);

/**
 * @route   PUT /api/auth/users/:id
 * @desc    Mettre à jour un utilisateur (Admin)
 * @access  Private/Admin
 * @body    { nom, prenom, email, telephone, adresse, role, actif }
 */
router.put("/users/:id", protectRoute, authorize('Admin'), authController.updateUser);

/**
 * @route   DELETE /api/auth/users/:id
 * @desc    Supprimer un utilisateur (Admin)
 * @access  Private/Admin
 */
router.delete("/users/:id", protectRoute, authorize('Admin'), authController.deleteUser);

/**
 * @route   PUT /api/auth/users/:id/activate
 * @desc    Activer un utilisateur (Admin)
 * @access  Private/Admin
 */
router.put("/users/:id/activate", protectRoute, authorize('Admin'), authController.activateUser);

/**
 * @route   PUT /api/auth/users/:id/deactivate
 * @desc    Désactiver un utilisateur (Admin)
 * @access  Private/Admin
 */
router.put("/users/:id/deactivate", protectRoute, authorize('Admin'), authController.deactivateUser);

// ==================== ROUTES PAR RÔLE ====================

/**
 * @route   GET /api/auth/transporteurs
 * @desc    Liste des transporteurs
 * @access  Private
 */
router.get("/transporteurs", protectRoute, authController.getTransporteurs);

/**
 * @route   GET /api/auth/fournisseurs
 * @desc    Liste des fournisseurs
 * @access  Private
 */
router.get("/fournisseurs", protectRoute, authController.getFournisseurs);

/**
 * @route   GET /api/auth/commerciaux
 * @desc    Liste des commerciaux
 * @access  Private
 */
router.get("/commerciaux", protectRoute, authController.getCommerciaux);

/**
 * @route   GET /api/auth/clients
 * @desc    Liste des clients
 * @access  Private
 */
router.get("/clients", protectRoute, authController.getClients);

/**
 * @route   GET /api/auth/users/role/:role
 * @desc    Liste des utilisateurs par rôle (Admin)
 * @access  Private/Admin
 */
router.get("/users/role/:role", protectRoute, authorize('Admin'), authController.getUsersByRole);

// ==================== ROUTES UTILITAIRES ====================

/**
 * @route   GET /api/auth/roles
 * @desc    Liste des rôles disponibles
 * @access  Private
 */
router.get("/roles", protectRoute, (req, res) => {
  res.json({
    success: true,
    roles: ['Admin', 'Commercial', 'Client', 'Transporteur', 'Fournisseur']
  });
});

/**
 * @route   GET /api/auth/check-email/:email
 * @desc    Vérifier si un email existe
 * @access  Public
 */
router.get("/check-email/:email", async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findOne({ email: req.params.email.toLowerCase() });
    res.json({
      success: true,
      exists: !!user,
      message: user ? 'Email déjà utilisé' : 'Email disponible'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== ROUTE DE TEST ====================

/**
 * @route   GET /api/auth/test
 * @desc    Route de test pour vérifier que les routes fonctionnent
 * @access  Public
 */
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Routes d'authentification fonctionnelles",
    timestamp: new Date().toISOString(),
    endpoints: {
      public: [
        "POST /login",
        "POST /register",
        "POST /qr-login",
        "POST /forgot-password",
        "POST /verify-reset-code",
        "POST /reset-password",
        "POST /resend-reset-code",
        "GET /verify/:token",
        "GET /reject/:token",
        "GET /check-email/:email"
      ],
      private: [
        "POST /logout",
        "GET /me",
        "PUT /profile",
        "PUT /change-password",
        "POST /refresh-token",
        "GET /roles"
      ],
      admin: [
        "POST /create-user",
        "GET /users",
        "GET /users/stats",
        "GET /users/:id",
        "PUT /users/:id",
        "DELETE /users/:id",
        "PUT /users/:id/activate",
        "PUT /users/:id/deactivate",
        "GET /users/role/:role"
      ],
      byRole: [
        "GET /transporteurs",
        "GET /fournisseurs",
        "GET /commerciaux",
        "GET /clients"
      ]
    }
  });
});

module.exports = router;