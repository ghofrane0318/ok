// backend/src/controllers/chatbotController.js - Version complète et unifiée
const ChatConversation = require('../models/ChatConversation');
const User = require('../models/User');
const Commande = require('../models/Commande');
const Facture = require('../models/Facture');
const Contrat = require('../models/Contrat');
const Stock = require('../models/Stock');
const Product = require('../models/Product');

// ==================== CONFIGURATION ====================

const SYSTEM_PROMPT = `Tu es ETAP Assistant, l'assistant virtuel intelligent de la plateforme ETAP (Entreprise Tunisienne d'Activités Pétrolières).

**Ton rôle :**
Tu aides les utilisateurs à naviguer sur la plateforme, comprendre les processus métiers et résoudre leurs problèmes.

**Domaines de compétence :**
- 📦 Commandes et devis
- 💰 Factures et paiements
- 📄 Contrats et signatures électroniques
- 🚚 Livraisons et logistique
- 📊 Exports Excel et rapports
- ⚖️ Pénalités et conformité
- 📈 Stock et produits
- 👥 Gestion des utilisateurs

**Règles :**
- Réponds toujours en français
- Sois concis, professionnel et bienveillant
- Utilise le formatage Markdown pour les listes
- Si tu ne sais pas, propose de contacter le support
- Redirige poliment si la question sort du contexte ETAP

**Informations contextuelles :**
- ETAP est une entreprise pétrolière tunisienne
- La plateforme permet la gestion des commandes, contrats, factures
- Les utilisateurs ont différents rôles: Admin, Commercial, Client, Transporteur, Fournisseur`;

// ==================== FALLBACK RESPONSES ====================

const getFallbackResponse = (userMessage, userRole = 'Client') => {
  const lowerMsg = userMessage.toLowerCase();
  
  // Commandes
  if (lowerMsg.includes('commande') || lowerMsg.includes('commandes')) {
    if (lowerMsg.includes('créer') || lowerMsg.includes('nouvelle')) {
      return `📦 **Création d'une nouvelle commande**

Voici les étapes à suivre :

1. Accédez au menu **Commandes** dans la barre latérale
2. Cliquez sur le bouton **+ Nouvelle commande**
3. Sélectionnez le(s) produit(s) et la quantité souhaitée
4. Choisissez la date de livraison prévue
5. Vérifiez le montant total
6. Cliquez sur **Confirmer la commande**

📌 **Statut après création :** En attente de validation

💰 **Délai de validation :** 24-48h ouvrées

Besoin d'aide pour une étape en particulier ?`;
    }
    
    if (lowerMsg.includes('annuler')) {
      return `❌ **Annulation d'une commande**

Pour annuler une commande :

1. Allez dans **Commandes** > **Mes commandes**
2. Trouvez la commande concernée (statut "En attente" uniquement)
3. Cliquez sur les 3 points (...) à droite
4. Sélectionnez **Annuler la commande**
5. Confirmez l'annulation

⚠️ **Conditions :**
- Seules les commandes en attente peuvent être annulées
- Les commandes déjà validées ne sont pas annulables
- Contactez votre commercial pour une commande déjà en traitement

Souhaitez-vous annuler une commande spécifique ?`;
    }
    
    if (lowerMsg.includes('suivre') || lowerMsg.includes('statut')) {
      return `🔍 **Suivi de commande**

Pour suivre l'état de vos commandes :

1. Rendez-vous dans **Commandes** > **Suivi des commandes**
2. Utilisez le filtre par période ou statut

📊 **Les statuts possibles :**
- 🟡 **En attente** : Commande créée, en cours de validation
- 🟢 **Confirmée** : Validée par le commercial
- 🟠 **En préparation** : Stock en cours de préparation
- 🔵 **Expédiée** : En route vers vous
- ✅ **Livrée** : Commande terminée
- 🔴 **Annulée** : Commande annulée

Entrez votre numéro de commande pour un suivi détaillé.`;
    }
    
    return `📋 **Gestion des commandes**

Je peux vous aider avec :
• Créer une nouvelle commande
• Annuler une commande en attente
• Suivre le statut d'une commande
• Consulter l'historique des commandes
• Télécharger un bon de livraison

Que souhaitez-vous faire ?`;
  }
  
  // Factures
  if (lowerMsg.includes('facture') || lowerMsg.includes('factures')) {
    if (lowerMsg.includes('payer') || lowerMsg.includes('paiement')) {
      return `💳 **Paiement d'une facture**

Pour payer une facture en ligne :

1. Allez dans **Facturation** > **Factures en attente**
2. Cliquez sur la facture concernée
3. Sélectionnez **Payer en ligne**
4. Choisissez le mode de paiement :
   - 💳 Carte bancaire
   - 🏦 Virement bancaire
   - 📝 Chèque (à envoyer par courrier)

💡 **Conseil :** Le délai de paiement standard est de 30 jours

Souhaitez-vous les coordonnées bancaires pour un virement ?`;
    }
    
    if (lowerMsg.includes('retard')) {
      return `⏰ **Facture en retard - Pénalités**

En cas de retard de paiement :

📅 **Délai de grâce :** 15 jours après échéance

💰 **Calcul des pénalités :**
Pénalité = Montant HT × 15% × (Jours de retard / 365)

⚠️ **Maximum :** 10% du montant de la facture

📞 **Que faire ?**
- Contactez rapidement le service client
- Proposez un échéancier de paiement
- Évitez l'application des pénalités

Votre facture est en retard ? Je peux vous aider à contacter le service concerné.`;
    }
    
    return `💰 **Gestion des factures**

Je peux vous aider avec :
• Consulter vos factures (payées/en attente)
• Payer une facture en ligne
• Télécharger une facture en PDF
• Demander un avoir
• Gérer un retard de paiement
• Calculer les pénalités

Avez-vous une question spécifique sur une facture ?`;
  }
  
  // Contrats
  if (lowerMsg.includes('contrat') || lowerMsg.includes('contrats')) {
    if (lowerMsg.includes('signer') || lowerMsg.includes('signature')) {
      return `✍️ **Signature électronique d'un contrat**

Processus de signature :

1. Accédez à **Contrats** > **À signer**
2. Ouvrez le contrat concerné
3. Lisez attentivement les conditions
4. Cliquez sur **Signer électroniquement**
5. Vérifiez votre identité (code SMS/email)
6. Confirmez la signature

✅ **Une fois signé :**
- Le contrat est immédiatement envoyé à l'autre partie
- Un PDF signé est disponible en téléchargement
- Vous recevez une confirmation par email

🔒 **Valeur légale :** La signature électronique a la même valeur qu'une signature manuscrite.`;
    }
    
    if (lowerMsg.includes('valider') || lowerMsg.includes('validation')) {
      return `✅ **Validation d'un contrat - Étapes**

📋 **Processus complet :**

1️⃣ **Création** : Rédaction des termes par le commercial
2️⃣ **Vérification juridique** : Analyse par le département juridique (1-2 jours)
3️⃣ **Validation commerciale** : Approbation par le responsable (1 jour)
4️⃣ **Signature client** : Signature électronique
5️⃣ **Signature ETAP** : Contreseing
6️⃣ **Archivage** : Stockage sécurisé

⏱️ **Durée estimée :** 3-5 jours ouvrés

📊 **Statuts possibles :**
- 📝 Brouillon
- 🔍 En vérification
- ✅ Validé
- ❌ Rejeté
- ✔️ Terminé

Besoin de faire avancer un contrat ?`;
    }
    
    return `📄 **Gestion des contrats**

Je peux vous aider avec :
• Créer un nouveau contrat
• Suivre l'avancement d'un contrat
• Signer électroniquement
• Télécharger un contrat signé
• Consulter les conditions générales
• Gérer les avenants

Quel type d'information cherchez-vous ?`;
  }
  
  // Livraisons
  if (lowerMsg.includes('livraison') || lowerMsg.includes('livrer')) {
    return `🚚 **Suivi de livraison**

Pour suivre votre livraison en temps réel :

1. Allez dans **Logistique** > **Suivi livraisons**
2. Entrez votre numéro de commande
3. Consultez la carte de localisation

📍 **Statuts de livraison :**
- 📦 **En préparation** : Commande en cours de préparation
- 🚛 **Prise en charge** : Transporteur récupère la marchandise
- 🗺️ **En transit** : Sur la route vers vous
- 🏠 **En cours de livraison** : Dernier kilomètre
- ✅ **Livrée** : Commande réceptionnée

🚨 **Problème de livraison ?**
- Retard : Contactez le transporteur
- Colis endommagé : Refusez et faites une réserve
- Adresse erronée : Contactez-nous immédiatement

Numéro de suivi : Transmis par email dès l'expédition.`;
  }
  
  // Stock et produits
  if (lowerMsg.includes('stock') || lowerMsg.includes('produit') || lowerMsg.includes('disponible')) {
    return `📊 **Consultation des stocks**

Pour vérifier la disponibilité d'un produit :

1. Accédez à **Catalogue** > **Produits**
2. Recherchez par nom ou référence
3. Consultez la colonne "Stock disponible"

📈 **Alertes stock :**
- 🟢 > 30 jours : Stock confortable
- 🟡 15-30 jours : Stock moyen - Anticiper
- 🟠 7-15 jours : Stock faible - Commande urgente
- 🔴 < 7 jours : Stock critique - Réapprovisionnement immédiat

🎯 **Seuils d'alerte paramétrables** par produit

Souhaitez-vous connaître le stock d'un produit spécifique ?`;
  }
  
  // Pénalités
  if (lowerMsg.includes('pénalité') || lowerMsg.includes('penalite') || lowerMsg.includes('retard') && lowerMsg.includes('paiement')) {
    return `⚖️ **Calcul des pénalités de retard**

📐 **Formule standard :**

📊 **Paramètres par défaut :**
- Taux annuel : 15%
- Délai de grâce : 15 jours
- Pénalité maximum : 10% du montant

📝 **Exemple concret :**
Montant HT : 10 000 €
Retard : 30 jours
Calcul : 10 000 × 0.15 × (30/365) = 123.29 €

💡 **Pour un calcul précis :**
Utilisez notre outil dans **Finance** > **Calcul des pénalités**

Avez-vous besoin d'estimer des pénalités ?`;
  }
  
  // Exports
  if (lowerMsg.includes('export') || lowerMsg.includes('excel') || lowerMsg.includes('pdf')) {
    return `📎 **Export des données**

**Formats disponibles :**
- 📊 Excel (.xlsx) - Pour analyse et tableaux croisés
- 📄 PDF - Pour archivage et impression
- 📑 CSV - Pour import dans d'autres logiciels

**Comment exporter :**
1. Ouvrez la liste/tableau concerné
2. Cliquez sur le bouton **Exporter** 📎
3. Choisissez le format
4. Sélectionnez les colonnes (optionnel)
5. Cliquez sur **Générer**

**Domaines exportables :**
• Commandes
• Factures
• Contrats
• Historique des livraisons
• Rapports de stocks

L'export sera disponible instantanément dans votre zone de téléchargement.`;
  }
  
  // Support et aide
  if (lowerMsg.includes('contact') || lowerMsg.includes('support') || lowerMsg.includes('aide') && !lowerMsg.includes('aide')) {
    return `📞 **Contacter le support ETAP**

**Support technique :**
- 📧 Email : support@etap.com.tn
- 📞 Téléphone : +216 XX XXX XXX
- 💬 Chat : Disponible en bas à droite (9h-17h)

**Support commercial :**
- 📧 commercial@etap.com.tn
- 📞 +216 XX XXX XXX

**Urgence (24/7) :**
- 📱 +216 XX XXX XXX

**Avant de contacter le support :**
1. Consultez notre FAQ
2. Vérifiez les tutoriels vidéo
3. Essayez de reformuler votre question

Souhaitez-vous qu'on programme un rappel ?`;
  }
  
  // Message d'accueil / aide générale
  if (lowerMsg.includes('bonjour') || lowerMsg.includes('salut') || lowerMsg.includes('coucou') || lowerMsg === 'bonjour' || userMessage.length < 15) {
    return `🤖 **Bonjour ! Je suis ETAP Assistant**

Je suis votre assistant virtuel dédié à la plateforme ETAP.

📌 **Je peux vous aider sur :**

• 📦 **Commandes** - Créer, suivre, annuler
• 💰 **Factures** - Consulter, payer, exporter
• 📄 **Contrats** - Signer, valider, archiver
• 🚚 **Livraisons** - Suivre en temps réel
• 📊 **Exports** - Excel, PDF, rapports
• ⚖️ **Pénalités** - Calcul et gestion
• 📈 **Stocks** - Disponibilité, alertes
• 👤 **Mon compte** - Profil, paramètres

💡 **Tutoriels disponibles** : Posez-moi une question sur n'importe quel sujet

Comment puis-je vous aider aujourd'hui ?`;
  }
  
  // Réponse par défaut
  return `🤔 **Je n'ai pas bien compris votre question**

Pour mieux vous aider, précisez votre demande en utilisant les mots-clés suivants :

🔹 **Commandes** - création, annulation, suivi
🔹 **Factures** - paiement, retard, téléchargement
🔹 **Contrats** - signature, validation
🔹 **Livraisons** - suivi, retard
🔹 **Produits** - stock, disponibilité
🔹 **Exports** - Excel, PDF, rapports
🔹 **Support** - contact, assistance

📌 **Exemples :**
• "Comment créer une nouvelle commande ?"
• "Je veux payer une facture"
• "Suivre ma livraison"
• "Calculer des pénalités de retard"
• "Exporter mes commandes en Excel"

Ou tapez simplement "Aide" pour revoir les sujets disponibles.`;
};

// ==================== API CLAUDE / IA ====================

const callClaudeAPI = async (messages, systemPrompt = SYSTEM_PROMPT) => {
  // Vérifier si l'API est configurée
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('⚠️ ANTHROPIC_API_KEY non configurée, utilisation du mode fallback');
    return null;
  }
  
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_MODEL || 'claude-3-sonnet-20241022',
        max_tokens: 1000,
        temperature: 0.7,
        system: systemPrompt,
        messages: messages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`API Anthropic error: ${response.status} - ${errorData}`);
      return null;
    }

    const data = await response.json();
    return data.content[0].text;
  } catch (error) {
    console.error('Claude API error:', error);
    return null;
  }
};

// ==================== RÉCUPÉRATION DE CONTEXTE MÉTIER ====================

const getBusinessContext = async (userId, userRole, userMessage) => {
  const lowerMsg = userMessage.toLowerCase();
  const context = {};
  
  try {
    // Récupérer les commandes récentes
    if (lowerMsg.includes('commande') || lowerMsg.includes('commandes')) {
      const query = userRole === 'Admin' ? {} : { clientId: userId };
      context.commandes = await Commande.find(query)
        .sort({ dateCommande: -1 })
        .limit(5)
        .select('numeroCommande statut montantTotal dateCommande');
      context.nbCommandes = context.commandes.length;
    }
    
    // Récupérer les factures en attente
    if (lowerMsg.includes('facture') || lowerMsg.includes('payer')) {
      const query = userRole === 'Admin' ? { statut: 'En attente' } : { clientId: userId, statut: 'En attente' };
      context.facturesEnAttente = await Facture.find(query)
        .limit(5)
        .select('numeroFacture montantTTC dateFacture');
      context.nbFacturesEnAttente = context.facturesEnAttente.length;
      if (context.nbFacturesEnAttente > 0) {
        context.montantTotalDu = context.facturesEnAttente.reduce((sum, f) => sum + f.montantTTC, 0);
      }
    }
    
    // Récupérer les contrats actifs
    if (lowerMsg.includes('contrat') || lowerMsg.includes('signer')) {
      const query = userRole === 'Admin' ? { statut: { $in: ['En cours', 'Validé'] } } : { clientId: userId, statut: { $in: ['En cours', 'Validé'] } };
      context.contratsActifs = await Contrat.find(query)
        .limit(3)
        .select('numeroContrat statut montantTotal dateFin');
      context.nbContratsActifs = context.contratsActifs.length;
    }
    
    // Récupérer les livraisons en cours
    if (lowerMsg.includes('livraison') || lowerMsg.includes('suivre')) {
      context.livraisonsEnCours = await Commande.find({ 
        clientId: userId, 
        statut: { $in: ['En préparation', 'Expédiée'] }
      }).limit(3);
      context.nbLivraisons = context.livraisonsEnCours.length;
    }
    
    // Récupérer les alertes stock
    if (lowerMsg.includes('stock') || lowerMsg.includes('produit')) {
      context.stockCritique = await Stock.find({
        $expr: { $lte: ['$quantity', '$seuilMin'] }
      }).populate('product').limit(5);
      context.nbStockCritique = context.stockCritique.length;
    }
    
  } catch (err) {
    console.error('Erreur récupération contexte:', err);
  }
  
  return context;
};

// ==================== FONCTIONS PRINCIPALES ====================

// Envoyer un message et obtenir une réponse
exports.sendMessage = async (req, res) => {
  try {
    const { message, conversationId, systemPrompt } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!message || message.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: 'Le message ne peut pas être vide' 
      });
    }

    let conversation;
    let useFallback = false;
    let useAI = false;

    // Récupérer ou créer une conversation
    if (conversationId) {
      conversation = await ChatConversation.findOne({ 
        _id: conversationId, 
        userId, 
        isActive: true 
      });
      
      if (!conversation) {
        return res.status(404).json({ 
          success: false, 
          error: 'Conversation non trouvée' 
        });
      }
    } else {
      // Créer une nouvelle conversation
      const title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
      conversation = new ChatConversation({
        userId,
        title,
        messages: [],
        userRole
      });
    }

    // Ajouter le message utilisateur
    await conversation.addMessage('user', message);

    let assistantResponse = null;
    
    // Tentative d'appel à l'API Claude
    if (process.env.ANTHROPIC_API_KEY && process.env.USE_AI !== 'false') {
      try {
        // Récupérer le contexte métier
        const businessContext = await getBusinessContext(userId, userRole, message);
        
        // Préparer l'historique pour l'API
        const history = conversation.getContextMessages(20);
        
        // Ajouter le contexte métier au prompt système
        let contextualPrompt = systemPrompt || SYSTEM_PROMPT;
        if (Object.keys(businessContext).length > 0) {
          contextualPrompt += `\n\n**Contexte utilisateur (données réelles à utiliser si pertinent) :**\n${JSON.stringify(businessContext, null, 2)}`;
        }
        
        assistantResponse = await callClaudeAPI(history, contextualPrompt);
        
        if (assistantResponse) {
          useAI = true;
        } else {
          useFallback = true;
          assistantResponse = getFallbackResponse(message, userRole);
        }
      } catch (apiError) {
        console.error('API Claude error, using fallback:', apiError.message);
        assistantResponse = getFallbackResponse(message, userRole);
        useFallback = true;
      }
    } else {
      // Mode fallback uniquement
      assistantResponse = getFallbackResponse(message, userRole);
      useFallback = true;
    }

    // Ajouter la réponse de l'assistant
    await conversation.addMessage('assistant', assistantResponse);

    res.json({
      success: true,
      conversationId: conversation._id,
      message: {
        id: conversation.messages[conversation.messages.length - 1]._id,
        role: 'assistant',
        content: assistantResponse,
        timestamp: new Date()
      },
      useFallback,
      useAI,
      messageCount: conversation.messages.length
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors du traitement du message',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Récupérer l'historique des conversations
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, skip = 0 } = req.query;

    const conversations = await ChatConversation.find({ userId, isActive: true })
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .select('_id title createdAt updatedAt messages userRole');

    // Formater la réponse
    const formattedConversations = conversations.map(conv => {
      const lastMessage = conv.messages[conv.messages.length - 1];
      return {
        id: conv._id,
        title: conv.title,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        lastMessage: lastMessage?.content?.substring(0, 100) || 'Nouvelle conversation',
        lastMessageDate: lastMessage?.timestamp,
        messageCount: conv.messages.length,
        userRole: conv.userRole
      };
    });

    res.json({
      success: true,
      conversations: formattedConversations,
      count: formattedConversations.length,
      total: await ChatConversation.countDocuments({ userId, isActive: true })
    });

  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la récupération des conversations' 
    });
  }
};

// Récupérer une conversation spécifique
exports.getConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const conversation = await ChatConversation.findOne({ _id: id, userId, isActive: true });
    
    if (!conversation) {
      return res.status(404).json({ 
        success: false,
        error: 'Conversation non trouvée' 
      });
    }

    res.json({
      success: true,
      conversation: {
        id: conversation._id,
        title: conversation.title,
        messages: conversation.messages,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        userRole: conversation.userRole
      }
    });

  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la récupération de la conversation' 
    });
  }
};

// Supprimer une conversation (soft delete)
exports.deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const conversation = await ChatConversation.findOneAndUpdate(
      { _id: id, userId },
      { isActive: false, deletedAt: new Date() },
      { new: true }
    );

    if (!conversation) {
      return res.status(404).json({ 
        success: false,
        error: 'Conversation non trouvée' 
      });
    }

    res.json({
      success: true,
      message: 'Conversation supprimée avec succès'
    });

  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la suppression de la conversation' 
    });
  }
};

// Supprimer définitivement une conversation (hard delete)
exports.hardDeleteConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const conversation = await ChatConversation.findOneAndDelete({ _id: id, userId });
    
    if (!conversation) {
      return res.status(404).json({ 
        success: false,
        error: 'Conversation non trouvée' 
      });
    }

    res.json({
      success: true,
      message: 'Conversation supprimée définitivement'
    });

  } catch (error) {
    console.error('Hard delete conversation error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la suppression' 
    });
  }
};

// Mettre à jour le titre d'une conversation
exports.updateConversationTitle = async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    const userId = req.user.id;

    if (!title || title.trim() === '') {
      return res.status(400).json({ 
        success: false,
        error: 'Le titre ne peut pas être vide' 
      });
    }

    const conversation = await ChatConversation.findOneAndUpdate(
      { _id: id, userId, isActive: true },
      { title: title.trim() },
      { new: true }
    );

    if (!conversation) {
      return res.status(404).json({ 
        success: false,
        error: 'Conversation non trouvée' 
      });
    }

    res.json({
      success: true,
      title: conversation.title
    });

  } catch (error) {
    console.error('Update title error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la mise à jour du titre' 
    });
  }
};

// Obtenir les questions suggérées
exports.getSuggestedQuestions = async (req, res) => {
  const suggestions = [
    'Comment créer une nouvelle commande ?',
    'Comment consulter mes factures en attente ?',
    'Quelles sont les étapes de validation d\'un contrat ?',
    'Comment calculer une pénalité de retard ?',
    'Comment suivre l\'état d\'une livraison ?',
    'Comment exporter les données en Excel ?',
    'Quels sont les délais de livraison standard ?',
    'Comment annuler une commande en cours ?',
    'Comment vérifier la disponibilité d\'un produit ?',
    'Comment contacter le support ?',
    'Comment signer un contrat électroniquement ?',
    'Comment télécharger une facture en PDF ?'
  ];

  // Filtrer selon le rôle
  let filteredSuggestions = suggestions;
  if (req.user.role === 'Admin') {
    filteredSuggestions = [
      'Comment créer un compte utilisateur ?',
      'Comment gérer les pénalités ?',
      'Comment paramétrer les alertes stock ?',
      ...suggestions
    ];
  } else if (req.user.role === 'Commercial') {
    filteredSuggestions = [
      'Comment créer un devis pour un client ?',
      'Comment valider une commande client ?',
      'Comment suivre mes prospects ?',
      ...suggestions
    ];
  }

  res.json({
    success: true,
    suggestions: filteredSuggestions
  });
};

// Effacer l'historique d'une conversation
exports.clearConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const conversation = await ChatConversation.findOne({ _id: id, userId, isActive: true });
    
    if (!conversation) {
      return res.status(404).json({ 
        success: false,
        error: 'Conversation non trouvée' 
      });
    }

    conversation.messages = [];
    conversation.updatedAt = Date.now();
    await conversation.save();

    res.json({
      success: true,
      message: 'Historique effacé avec succès'
    });

  } catch (error) {
    console.error('Clear conversation error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de l\'effacement de l\'historique' 
    });
  }
};

// Obtenir les statistiques du chatbot
exports.getStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const totalConversations = await ChatConversation.countDocuments({ userId, isActive: true });
    const totalMessages = await ChatConversation.aggregate([
      { $match: { userId, isActive: true } },
      { $project: { messageCount: { $size: '$messages' } } },
      { $group: { _id: null, total: { $sum: '$messageCount' } } }
    ]);
    
    const lastConversation = await ChatConversation.findOne({ userId, isActive: true })
      .sort({ updatedAt: -1 })
      .select('updatedAt');
    
    res.json({
      success: true,
      stats: {
        totalConversations,
        totalMessages: totalMessages[0]?.total || 0,
        lastActivity: lastConversation?.updatedAt || null
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la récupération des statistiques' 
    });
  }
};