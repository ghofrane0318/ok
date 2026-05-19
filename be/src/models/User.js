const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  nom: { type: String, required: true, trim: true },
  prenom: { type: String, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  telephone: { type: String, trim: true },
  adresse: { type: String, trim: true },
  role: {
    type: String,
    enum: ['Admin', 'Commercial', 'Client', 'Transporteur', 'Fournisseur'],
    default: 'Client'
  },
  raisonSociale: { type: String, trim: true },
  code: { type: String, unique: true, sparse: true },
  actif: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  deviceToken: { type: String },
  resetPasswordCode: { type: String },
  resetPasswordToken: { type: String },
  resetPasswordExpire: { type: Date },
  resetPasswordVerified: { type: Boolean }
}, {
  timestamps: true
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET || 'etapgas2026',
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
};

userSchema.methods.getPublicData = function () {
  return {
    id: this._id,
    nom: this.nom || this.raisonSociale,
    prenom: this.prenom,
    email: this.email,
    telephone: this.telephone,
    adresse: this.adresse,
    role: this.role,
    code: this.code,
    actif: this.actif,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt
  };
};

userSchema.methods.updateLastLogin = async function () {
  this.lastLogin = new Date();
  await this.save();
};

module.exports = mongoose.model('User', userSchema);
