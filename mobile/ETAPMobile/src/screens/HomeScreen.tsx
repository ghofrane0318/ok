import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Animated,
  Dimensions,

  StatusBar
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { getNotifications, getPenalties } from '../services/api';
import { onNewNotification, offNewNotification } from '../services/socket';
import NotificationCard from '../components/NotificationCard';
import LoadingSpinner from '../components/LoadingSpinner';

const { width } = Dimensions.get('window');

// ========== TYPES ==========
interface Notification {
  _id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  isRead: boolean;
  createdAt: string;
}

interface Penalty {
  _id: string;
  status: 'pending' | 'paid' | 'waived';
  penaltyAmount: number;
  delayDays: number;
}

interface Commande {
  _id: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  totalAmount: number;
  createdAt: string;
}

interface Livraison {
  _id: string;
  status: 'pending' | 'in_transit' | 'delivered' | 'failed';
  address: string;
  createdAt: string;
}

interface User {
  id?: string;
  nom?: string;
  email?: string;
  telephone?: string;
  role?: 'Admin' | 'Commercial' | 'Client' | 'Transporteur' | 'Fournisseur';
}

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  screen: string;
  badge?: number;
}

interface DashboardStats {
  notifications: number;
  penalties: number;
  commandes: number;
  livraisons: number;
}

// ========== DONNÉES DE DÉMONSTRATION ==========
const _t = Date.now();
const DEMO_HOME_NOTIFICATIONS: Notification[] = [
  {
    _id: 'd1', title: 'Commande confirmée ✅',
    message: 'Commande #CMD-2024-087 confirmée et en cours de traitement.',
    type: 'success', isRead: false,
    createdAt: new Date(_t - 8 * 60000).toISOString()
  },
  {
    _id: 'd2', title: 'Livraison planifiée',
    message: 'Livraison #LIV-2024-045 prévue demain entre 9h et 12h.',
    type: 'info', isRead: false,
    createdAt: new Date(_t - 2 * 3600000).toISOString()
  },
  {
    _id: 'd3', title: 'Retard de livraison ⚠️',
    message: 'Livraison #LIV-2024-038 reportée de 2 jours.',
    type: 'warning', isRead: true,
    createdAt: new Date(_t - 5 * 3600000).toISOString()
  }
];

const DEMO_HOME_PENALTIES: Penalty[] = [
  { _id: 'p1', status: 'pending', penaltyAmount: 810, delayDays: 18 },
  { _id: 'p2', status: 'pending', penaltyAmount: 2730, delayDays: 35 },
  { _id: 'p3', status: 'paid',    penaltyAmount: 112.5, delayDays: 5 }
];

// ========== COMPOSANT PRINCIPAL ==========
export default function HomeScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  
  // ========== ÉTATS ==========
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [livraisons, setLivraisons] = useState<Livraison[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    notifications: 0,
    penalties: 0,
    commandes: 0,
    livraisons: 0
  });
  
  // ========== ANIMATIONS ==========
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // ========== UTILITAIRES ==========
  const getUserId = useCallback(() => {
    return user?.id || '';
  }, [user]);

  const getUserInitial = useCallback(() => {
    const name = user?.nom || '';
    return name.charAt(0)?.toUpperCase() || 'U';
  }, [user?.nom]);

  const getUserName = useCallback(() => {
    return user?.nom || 'Utilisateur';
  }, [user?.nom]);

  const getUserRole = useCallback(() => {
    return user?.role || 'Client';
  }, [user?.role]);

  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  }, []);

  const getRoleIcon = (role: string) => {
    const icons: Record<string, string> = {
      'Admin': '👨‍💼',
      'Commercial': '💼',
      'Client': '👤',
      'Transporteur': '🚚',
      'Fournisseur': '🏭'
    };
    return icons[role] || '👤';
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      'Admin': '#d32f2f',
      'Commercial': '#1976d2',
      'Client': '#388e3c',
      'Transporteur': '#f57c00',
      'Fournisseur': '#7b1fa2'
    };
    return colors[role] || '#1a3c5e';
  };

  // ========== CHARGEMENT DONNÉES ==========
  const loadData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const userId = getUserId();
      if (!userId) {
        console.warn('User ID non disponible');
        return;
      }

      // Charger les données en parallèle
      const [notifRes, penaltyRes] = await Promise.all([
        getNotifications(userId).catch(() => ({ data: { notifications: [], unreadCount: 0 } })),
        getPenalties(userId).catch(() => ({ data: { penalties: [] } }))
      ]);

      const notifs = notifRes.data.notifications || [];
      const penals = penaltyRes.data.penalties || [];

      const finalNotifs = notifs.length > 0 ? notifs : DEMO_HOME_NOTIFICATIONS;
      const finalPenals = penals.length > 0 ? penals : DEMO_HOME_PENALTIES;

      setNotifications(finalNotifs);
      setUnreadCount(notifRes.data.unreadCount || finalNotifs.filter((n: Notification) => !n.isRead).length);
      setPenalties(finalPenals);
      setCommandes([]);
      setLivraisons([]);

      // Mettre à jour les statistiques
      setStats({
        notifications: finalNotifs.filter((n: Notification) => !n.isRead).length,
        penalties: finalPenals.filter((p: Penalty) => p.status === 'pending').length,
        commandes: 3,
        livraisons: 2
      });
    } catch (error) {
      console.error('Erreur chargement données:', error);
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  }, [user, getUserId]);

  // ========== EFFETS ==========
  useEffect(() => {
    loadData();
    
    // Animation d'entrée
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7
      })
    ]).start();
  }, [loadData]);

  // WebSocket pour notifications en temps réel
  useEffect(() => {
    const handleNewNotification = (notification: Notification) => {
      Alert.alert('🔔 Nouvelle notification', notification.message);
      loadData();
    };

    onNewNotification(handleNewNotification);
    return () => {
      offNewNotification(handleNewNotification);
    };
  }, [loadData]);

  // ========== ACTIONS ==========
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // ========== DONNÉES DYNAMIQUES ==========
  const quickActions: QuickAction[] = [
    { id: 'notifications', label: 'Notifications', icon: '🔔', screen: 'Notifications', badge: stats.notifications },
    { id: 'history',       label: 'Historique',    icon: '📜', screen: 'History' },
    { id: 'penalties',     label: 'Pénalités',     icon: '⚠️', screen: 'Penalties', badge: stats.penalties },
    ...(user?.role !== 'Admin'
      ? [{ id: 'chatbot', label: 'Assistant', icon: '🤖', screen: 'Assistant' }]
      : []),
    { id: 'profile', label: 'Profil', icon: '👤', screen: 'Profil' },
  ];

  const pendingPenalties = penalties.filter((p: Penalty) => p.status === 'pending');
  const totalPenalties = pendingPenalties.reduce((sum: number, p: Penalty) => sum + p.penaltyAmount, 0);

  const pendingCommandes = commandes.filter((c: Commande) => c.status !== 'delivered' && c.status !== 'cancelled');
  const totalCommandes = pendingCommandes.reduce((sum: number, c: Commande) => sum + c.totalAmount, 0);

  const inTransitLivraisons = livraisons.filter((l: Livraison) => l.status === 'in_transit');

  // ========== RENDU LOADING ==========
  if (loading) {
    return <LoadingSpinner visible text="Chargement du tableau de bord..." />;
  }

  // ========== RENDU PRINCIPAL ==========
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={getRoleColor(getUserRole())} />
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ========== EN-TÊTE ==========*/}
        <Animated.View
          style={[
            styles.header,
            {
              backgroundColor: getRoleColor(getUserRole()),
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.headerContent}>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{getUserName()}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                {getRoleIcon(getUserRole())} {getUserRole()}
              </Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.avatar}
            onPress={() => navigation.navigate('Profil')}
            activeOpacity={0.7}
          >
            <Text style={styles.avatarText}>{getUserInitial()}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ========== CARTES DE STATISTIQUES ==========*/}
        <Animated.View style={[styles.statsGrid, { opacity: fadeAnim }]}>
          {/* Notifications */}
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.7}
          >
            <View style={styles.statIconBox}>
              <Text style={styles.statIcon}>🔔</Text>
            </View>
            <Text style={styles.statValue}>{stats.notifications}</Text>
            <Text style={styles.statLabel}>Non lues</Text>
          </TouchableOpacity>

          {/* Pénalités - tous les rôles */}
          <TouchableOpacity
            style={[styles.statCard, stats.penalties > 0 && styles.statCardWarning]}
            onPress={() => navigation.navigate('Penalties')}
            activeOpacity={0.7}
          >
            <View style={styles.statIconBox}>
              <Text style={styles.statIcon}>⚠️</Text>
            </View>
            <Text style={[styles.statValue, stats.penalties > 0 && { color: '#ef4444' }]}>
              {stats.penalties}
            </Text>
            <Text style={styles.statLabel}>Pénalités</Text>
          </TouchableOpacity>

          {/* Commandes - Seulement pour Client et Commercial */}
          {(user?.role === 'Client' || user?.role === 'Commercial') && (
            <TouchableOpacity 
              style={styles.statCard}
              onPress={() => navigation.navigate('History')}
              activeOpacity={0.7}
            >
              <View style={styles.statIconBox}>
                <Text style={styles.statIcon}>🛒</Text>
              </View>
              <Text style={styles.statValue}>{stats.commandes}</Text>
              <Text style={styles.statLabel}>En cours</Text>
            </TouchableOpacity>
          )}

          {/* Livraisons - Seulement pour Client et Transporteur */}
          {(user?.role === 'Client' || user?.role === 'Transporteur') && (
            <TouchableOpacity 
              style={styles.statCard}
              onPress={() => navigation.navigate('History')}
              activeOpacity={0.7}
            >
              <View style={styles.statIconBox}>
                <Text style={styles.statIcon}>🚚</Text>
              </View>
              <Text style={styles.statValue}>{inTransitLivraisons.length}</Text>
              <Text style={styles.statLabel}>En transit</Text>
            </TouchableOpacity>
          )}

          {/* Date */}
          <View style={styles.statCard}>
            <View style={styles.statIconBox}>
              <Text style={styles.statIcon}>📅</Text>
            </View>
            <Text style={styles.statValue}>
              {new Date().toLocaleDateString('fr-FR', { day: '2-digit', timeZone: 'Africa/Tunis' })}
            </Text>
            <Text style={styles.statLabel}>
              {new Date().toLocaleDateString('fr-FR', { month: 'short', year: 'numeric', timeZone: 'Africa/Tunis' })}
            </Text>
          </View>
        </Animated.View>

        {/* ========== ACTIONS RAPIDES ==========*/}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Actions rapides</Text>
          <View style={styles.quickActions}>
            {quickActions.map((action, index) => (
              <Animated.View
                key={action.id}
                style={{
                  opacity: fadeAnim,
                  transform: [{ 
                    translateX: slideAnim.interpolate({
                      inputRange: [0, 30],
                      outputRange: [0, 30 + index * 5]
                    }) 
                  }]
                }}
              >
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigation.navigate(action.screen)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.actionIcon}>{action.icon}</Text>
                  <Text style={styles.actionLabel}>{action.label}</Text>
                  {action.badge !== undefined && action.badge > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {action.badge > 9 ? '9+' : action.badge}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* ========== ALERTE PÉNALITÉS ==========*/}
        {totalPenalties > 0 && (
          <View style={styles.alertCard}>
            <Text style={styles.alertIcon}>⚠️</Text>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Pénalités en attente</Text>
              <Text style={styles.alertText}>
                {totalPenalties.toFixed(2)} TND — {pendingPenalties.length} pénalité(s)
              </Text>
            </View>
          </View>
        )}

        {/* ========== DERNIÈRES NOTIFICATIONS ==========*/}
        <View style={styles.sectionContainer}>
          <View style={styles.notificationsHeader}>
            <Text style={styles.sectionTitle}>Dernières notifications</Text>
            {notifications.length > 0 && (
              <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
                <Text style={styles.seeAllText}>Voir tout</Text>
              </TouchableOpacity>
            )}
          </View>

          {notifications.slice(0, 3).map((notification: Notification) => (
            <NotificationCard
              key={notification._id}
              notification={notification}
              onPress={() => navigation.navigate('Notifications')}
            />
          ))}

          {notifications.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyTitle}>Aucune notification</Text>
              <Text style={styles.emptyText}>
                Vous êtes à jour avec toutes vos notifications
              </Text>
            </View>
          )}
        </View>

        {/* Espaceur bas */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ========== STYLES ==========
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f5fb'
  },
  scrollView: { flex: 1 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 32,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 10,
    shadowColor: '#0a1428',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14
  },
  headerContent: { flex: 1 },
  greeting: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3,
    textTransform: 'uppercase'
  },
  userName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 3,
    letterSpacing: -0.5
  },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)'
  },
  roleBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6
  },
  avatarText: { fontSize: 24, fontWeight: '800', color: '#0d2b3e' },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 10
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#0d2b3e',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#e4edf7',
    overflow: 'hidden'
  },
  statCardWarning: {
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    backgroundColor: '#fff5f5'
  },
  statIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#f0f5fb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10
  },
  statIcon: { fontSize: 26 },
  statValue: { fontSize: 24, fontWeight: '800', color: '#0d2b3e', letterSpacing: -0.5 },
  statLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4
  },

  sectionContainer: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0d2b3e',
    marginBottom: 14,
    letterSpacing: 0.3,
    textTransform: 'uppercase'
  },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  actionButton: {
    width: (width - 52) / 4,
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 6,
    alignItems: 'center',
    position: 'relative',
    elevation: 3,
    shadowColor: '#0d2b3e',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#e4edf7'
  },
  actionIcon: { fontSize: 30, marginBottom: 7 },
  actionLabel: { fontSize: 10, color: '#1a3c5e', textAlign: 'center', fontWeight: '700', letterSpacing: 0.2 },
  badge: {
    position: 'absolute',
    top: 7,
    right: 7,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#fff'
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  alertCard: {
    backgroundColor: '#fffbeb',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    flexDirection: 'row',
    gap: 14,
    elevation: 2,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#fde68a'
  },
  alertIcon: { fontSize: 24 },
  alertContent: { flex: 1, justifyContent: 'center' },
  alertTitle: { fontSize: 14, fontWeight: '800', color: '#92400e', marginBottom: 2 },
  alertText: { fontSize: 12, color: '#a16207', lineHeight: 18 },

  infoCard: {
    backgroundColor: '#eff6ff',
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    flexDirection: 'row',
    gap: 14,
    elevation: 2,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe'
  },
  infoIcon: { fontSize: 24 },
  infoContent: { flex: 1, justifyContent: 'center' },
  infoTitle: { fontSize: 14, fontWeight: '800', color: '#1e3a5f', marginBottom: 2 },
  infoText: { fontSize: 12, color: '#2563eb', lineHeight: 18 },

  notificationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  seeAllText: { color: '#1a3c5e', fontSize: 13, fontWeight: '700' },

  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e4edf7'
  },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1a3c5e', marginBottom: 6 },
  emptyText: { fontSize: 13, color: '#7a90a4', textAlign: 'center', lineHeight: 20 }
});