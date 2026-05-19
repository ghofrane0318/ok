// models/ChatConversation.js
import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const chatConversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    default: 'Nouvelle conversation'
  },
  messages: [chatMessageSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware pour mettre à jour updatedAt
chatConversationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Méthode pour ajouter un message
chatConversationSchema.methods.addMessage = function(role, content) {
  this.messages.push({ role, content, timestamp: new Date() });
  this.updatedAt = Date.now();
  return this.save();
};

// Méthode pour obtenir les derniers messages (contexte)
chatConversationSchema.methods.getContextMessages = function(limit = 10) {
  return this.messages.slice(-limit).map(msg => ({
    role: msg.role,
    content: msg.content
  }));
};

// Index pour les recherches
chatConversationSchema.index({ userId: 1, updatedAt: -1 });

const ChatConversation = mongoose.model('ChatConversation', chatConversationSchema);

export default ChatConversation;