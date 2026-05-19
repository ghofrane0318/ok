// routes/chatbotRoutes.js
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  sendMessage,
  getConversations,
  getConversation,
  deleteConversation,
  updateConversationTitle,
  getSuggestedQuestions,
  clearConversation
} from '../controllers/chatbotController.js';

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes principales
router.post('/message', sendMessage);                    // Envoyer un message
router.get('/conversations', getConversations);          // Liste des conversations
router.get('/suggestions', getSuggestedQuestions);       // Questions suggérées

// Routes pour une conversation spécifique
router.get('/conversation/:id', getConversation);        // Récupérer une conversation
router.delete('/conversation/:id', deleteConversation);  // Supprimer une conversation
router.put('/conversation/:id/title', updateConversationTitle); // Mettre à jour le titre
router.delete('/conversation/:id/clear', clearConversation);    // Effacer l'historique
router.post('/', chatbotController.chat);
export default router;