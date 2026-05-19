import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError } from 'axios';
import { STORAGE_KEYS } from '../services/storage';

// ========== TYPES ==========
interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  suggestions?: string[];
}

interface User {
  id: string;
  _id?: string;
  nom: string;
  email: string;
  role: 'Admin' | 'Commercial' | 'Client' | 'Transporteur' | 'Fournisseur';
  token?: string;
}

interface ChatResponse {
  success: boolean;
  response: string;
  suggestions?: string[];
  error?: string;
}

// ========== CONFIGURATION ==========
// 🔧 À MODIFIER: Remplacez localhost par votre IP locale ou domaine
// - Development: 'http://192.168.1.100:5001/api' (votre IP locale)
// - Production: 'https://api.votredomaine.com/api'
const API_BASE_URL = 'http://192.168.1.115:5001/api';
const STORAGE_KEY_PREFIX = STORAGE_KEYS.CHAT_HISTORY + '_';
const MAX_STORED_MESSAGES = 100;

// ========== API CLIENT ==========
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Intercepteur pour le token
apiClient.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.warn('Erreur lecture token:', error);
  }
  return config;
});

// Intercepteur d'erreur
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Token expiré, reconnexion requise');
    }
    return Promise.reject(error);
  }
);

// ========== SERVICES ==========
const chatService = {
  // Envoyer un message au chatbot
  sendMessage: async (message: string, userRole: string): Promise<ChatResponse> => {
    try {
      const response = await apiClient.post('/chatbot', {
        message,
        userRole
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Erreur du serveur');
      }

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      const errorMessage = (axiosError.response?.data as any)?.message ||
                          axiosError.message ||
                          'Erreur de connexion au serveur';
      throw new Error(errorMessage);
    }
  },

  // Récupérer l'historique
  getHistory: async (userId: string): Promise<Message[]> => {
    try {
      const stored = await AsyncStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
      if (!stored) return [];

      const data = JSON.parse(stored);
      // Convertir les timestamps en objets Date
      return data.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
    } catch (error) {
      console.error('Erreur lecture historique:', error);
      return [];
    }
  },

  // Sauvegarder l'historique
  saveHistory: async (userId: string, messages: Message[]): Promise<void> => {
    try {
      // Garder seulement les N derniers messages
      const recentMessages = messages.slice(-MAX_STORED_MESSAGES);

      await AsyncStorage.setItem(
        `${STORAGE_KEY_PREFIX}${userId}`,
        JSON.stringify(recentMessages)
      );
    } catch (error) {
      console.error('Erreur sauvegarde historique:', error);
    }
  },

  // Effacer l'historique
  clearHistory: async (userId: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(`${STORAGE_KEY_PREFIX}${userId}`);
    } catch (error) {
      console.error('Erreur suppression historique:', error);
    }
  }
};

// ========== COMPOSANT ==========
interface ChatbotScreenProps {
  user?: User;
  onClose?: () => void;
}

export default function ChatbotScreen({ onClose }: ChatbotScreenProps) {
  // ========== ÉTATS ==========
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // ========== EFFETS ==========
  // Charger l'utilisateur et l'historique au montage
  useEffect(() => {
    initializeChatbot();
  }, []);

  // Auto-scroll vers le bas
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // ========== FONCTIONS PRINCIPALES ==========
  const initializeChatbot = useCallback(async () => {
    try {
      setIsInitializing(true);

      // Récupérer l'utilisateur depuis AsyncStorage
      const userStr = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      if (!userStr) {
        setError('Utilisateur non authentifié');
        setIsInitializing(false);
        return;
      }

      const currentUser = JSON.parse(userStr) as User;
      setUser(currentUser);

      // Charger l'historique
      const userId = currentUser.id || currentUser._id || '';
      const history = await chatService.getHistory(userId);

      if (history.length > 0) {
        setMessages(history);
      } else {
        // Message de bienvenue
        const welcomeMessage: Message = {
          id: '0',
          text: `Bonjour 👋 Je suis votre assistant ETAP pour le rôle ${currentUser.role}. Comment puis-je vous aider aujourd'hui ?`,
          isUser: false,
          timestamp: new Date(),
          suggestions: getSuggestionsByRole(currentUser.role)
        };
        setMessages([welcomeMessage]);
      }

      setError(null);
    } catch (err: any) {
      console.error('Erreur initialisation:', err);
      setError('Impossible de charger le chatbot');
    } finally {
      setIsInitializing(false);
    }
  }, []);

  // Obtenir les suggestions par rôle
  const getSuggestionsByRole = useCallback((role: string): string[] => {
    const suggestions: Record<string, string[]> = {
      Admin: [
        'Voir les notifications',
        'Calculer les pénalités',
        'Consulter l\'historique',
        'Gestion des utilisateurs'
      ],
      Commercial: [
        'Mes commandes',
        'Mes clients',
        'Mes factures',
        'Suivi des livraisons'
      ],
      Client: [
        'Suivre ma livraison',
        'Passer commande',
        'Mes factures',
        'Support client'
      ],
      Transporteur: [
        'Mes livraisons',
        'Itinéraire optimisé',
        'Statut de livraison',
        'Contact client'
      ],
      Fournisseur: [
        'Commandes reçues',
        'Mes livraisons',
        'Pénalités appliquées',
        'Factures émises'
      ]
    };

    return suggestions[role] || suggestions.Client;
  }, []);

  // Envoyer un message
  const sendMessage = useCallback(async () => {
    const trimmedInput = inputText.trim();

    // Validations
    if (!trimmedInput) {
      return;
    }

    if (!user) {
      Alert.alert('Erreur', 'Utilisateur non disponible');
      return;
    }

    // Créer le message utilisateur
    const userMessage: Message = {
      id: Date.now().toString(),
      text: trimmedInput,
      isUser: true,
      timestamp: new Date()
    };

    // Ajouter le message à la liste
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');
    setIsLoading(true);
    setError(null);

    try {
      // Envoyer au backend
      const response = await chatService.sendMessage(trimmedInput, user.role);

      // Valider la réponse
      if (!response.response) {
        throw new Error('Réponse vide du serveur');
      }

      // Créer le message du bot
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.response,
        isUser: false,
        timestamp: new Date(),
        suggestions: response.suggestions || getSuggestionsByRole(user.role)
      };

      const finalMessages = [...updatedMessages, botMessage];
      setMessages(finalMessages);

      // Sauvegarder l'historique
      await chatService.saveHistory(user.id || user._id || '', finalMessages);
    } catch (err: any) {
      console.error('Erreur envoi message:', err);

      // Message d'erreur
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `❌ Erreur: ${err.message || 'Une erreur est survenue. Veuillez réessayer.'}`,
        isUser: false,
        timestamp: new Date()
      };

      const finalMessages = [...updatedMessages, errorMessage];
      setMessages(finalMessages);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, messages, user, getSuggestionsByRole]);

  // Gérer les suggestions cliquées - Envoyer automatiquement
  const handleSuggestion = useCallback(async (suggestion: string) => {
    if (!user) {
      Alert.alert('Erreur', 'Utilisateur non disponible');
      return;
    }

    // Créer le message utilisateur
    const userMessage: Message = {
      id: Date.now().toString(),
      text: suggestion,
      isUser: true,
      timestamp: new Date()
    };

    // Ajouter le message à la liste
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);
    setError(null);

    try {
      // Envoyer au backend
      const response = await chatService.sendMessage(suggestion, user.role);

      // Valider la réponse
      if (!response.response) {
        throw new Error('Réponse vide du serveur');
      }

      // Créer le message du bot
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.response,
        isUser: false,
        timestamp: new Date(),
        suggestions: response.suggestions || getSuggestionsByRole(user.role)
      };

      const finalMessages = [...updatedMessages, botMessage];
      setMessages(finalMessages);

      // Sauvegarder l'historique
      await chatService.saveHistory(user.id || user._id || '', finalMessages);
    } catch (err: any) {
      console.error('Erreur envoi suggestion:', err);

      // Message d'erreur
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `❌ Erreur: ${err.message || 'Une erreur est survenue. Veuillez réessayer.'}`,
        isUser: false,
        timestamp: new Date()
      };

      const finalMessages = [...updatedMessages, errorMessage];
      setMessages(finalMessages);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [messages, user, getSuggestionsByRole]);

  // Effacer la conversation
  const handleClearChat = useCallback(async () => {
    if (!user) return;

    Alert.alert(
      'Effacer la conversation',
      'Êtes-vous sûr de vouloir effacer l\'historique ?',
      [
        {
          text: 'Annuler',
          onPress: () => {},
          style: 'cancel'
        },
        {
          text: 'Effacer',
          onPress: async () => {
            try {
              await chatService.clearHistory(user.id || user._id || '');
              setMessages([
                {
                  id: '0',
                  text: `Bonjour 👋 Je suis votre assistant ETAP. Comment puis-je vous aider ?`,
                  isUser: false,
                  timestamp: new Date(),
                  suggestions: getSuggestionsByRole(user.role)
                }
              ]);
            } catch (err) {
              Alert.alert('Erreur', 'Impossible d\'effacer l\'historique');
            }
          },
          style: 'destructive'
        }
      ]
    );
  }, [user, getSuggestionsByRole]);

  // ========== RENDU INITIAL ==========
  if (isInitializing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🤖 Chargement...</Text>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1a3c5e" />
          <Text style={styles.loadingText}>Initialisation du chatbot...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ========== RENDU MESSAGE ==========
  const renderMessage = (message: Message) => (
    <View
      key={message.id}
      style={[styles.messageRow, message.isUser ? styles.userRow : styles.botRow]}
    >
      <View
        style={[
          styles.messageBubble,
          message.isUser ? styles.userBubble : styles.botBubble
        ]}
      >
        <Text
          style={[
            styles.messageText,
            message.isUser ? styles.userText : styles.botText
          ]}
        >
          {message.text}
        </Text>
        <Text style={styles.messageTime}>
          {message.timestamp.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </View>

      {/* SUGGESTIONS */}
      {!message.isUser && message.suggestions && message.suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          {message.suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={`${message.id}_${index}`}
              style={styles.suggestionChip}
              onPress={() => handleSuggestion(suggestion)}
              activeOpacity={0.7}
            >
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  // ========== RENDU PRINCIPAL ==========
  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            🤖 Assistant {user?.role || 'ETAP'}
          </Text>
          {user && (
            <Text style={styles.userSubtitle}>{user.nom}</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClearChat}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.clearButtonText}>🗑️</Text>
        </TouchableOpacity>
        {onClose && (
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* MESSAGES LIST */}
      {messages.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyStateIcon}>💬</Text>
          <Text style={styles.emptyStateText}>Aucun message</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderMessage(item)}
          contentContainerStyle={styles.messagesList}
          scrollEventThrottle={16}
          onEndReachedThreshold={0.3}
        />
      )}

      {/* ERREUR */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {/* LOADING */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#1a3c5e" />
          <Text style={styles.loadingText}>L'assistant réfléchit...</Text>
        </View>
      )}

      {/* INPUT */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Posez votre question..."
          placeholderTextColor="#999"
          multiline
          maxLength={500}
          editable={!isLoading}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputText.trim() || isLoading) && styles.sendButtonDisabled
          ]}
          onPress={sendMessage}
          disabled={!inputText.trim() || isLoading}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.sendButtonText}>
            {isLoading ? '⏳' : '📤'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ========== STYLES ==========
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f5fb'
  },

  // HEADER
  header: {
    backgroundColor: '#1a3c5e',
    paddingHorizontal: 15,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 5
  },
  headerContent: {
    flex: 1
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2
  },
  userSubtitle: {
    color: '#e0e0e0',
    fontSize: 11
  },
  clearButton: {
    padding: 8,
    marginRight: 8
  },
  clearButtonText: {
    fontSize: 18
  },
  closeButton: {
    padding: 8
  },
  closeButtonText: {
    fontSize: 20,
    color: '#fff'
  },

  // MESSAGES
  messagesList: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexGrow: 1
  },
  messageRow: {
    marginBottom: 10,
    flexDirection: 'row'
  },
  userRow: {
    justifyContent: 'flex-end'
  },
  botRow: {
    justifyContent: 'flex-start'
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 18
  },
  userBubble: {
    backgroundColor: '#1a3c5e',
    borderBottomRightRadius: 4
  },
  botBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e4edf7',
    elevation: 1,
    shadowColor: '#1a3c5e',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20
  },
  userText: {
    color: '#fff'
  },
  botText: {
    color: '#333'
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 6,
    textAlign: 'right'
  },

  // SUGGESTIONS
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 6,
    paddingLeft: 0
  },
  suggestionChip: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bfdbfe'
  },
  suggestionText: {
    fontSize: 12,
    color: '#1d4ed8',
    fontWeight: '600'
  },

  // INPUT
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'flex-end',
    gap: 8
  },
  input: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
    color: '#0d1b2a',
    borderWidth: 1.5,
    borderColor: '#e4edf7'
  },
  sendButton: {
    backgroundColor: '#1a3c5e',
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 3
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6
  },
  sendButtonText: {
    fontSize: 20
  },

  // LOADING
  loadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0'
  },
  loadingText: {
    marginLeft: 10,
    color: '#666',
    fontSize: 13,
    fontWeight: '500'
  },

  // ERREUR
  errorBanner: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#fca5a5'
  },
  errorText: {
    color: '#991b1b',
    fontSize: 13,
    fontWeight: '500'
  },

  // CENTER
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 15
  },
  emptyStateText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '500'
  }
});