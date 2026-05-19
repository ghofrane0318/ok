import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Animated,
  Dimensions,
  Alert,
  ScrollView,

  StatusBar
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { getPenalties, payPenalty } from '../services/api';

const { width, height } = Dimensions.get('window');

// ========== TYPES ==========
interface CommandeInfo {
  _id: string;
  numero: string;
  montantTotal: number;
  dateCommande: string;
  dateLivraisonPrevue: string;
}

interface Penalty {
  _id: string;
  commandeId: CommandeInfo;
  fournisseurId: string;
  dueDate: string;
  actualDeliveryDate?: string;
  delayDays: number;
  penaltyAmount: number;
  status: 'pending' | 'paid' | 'waived';
  calculatedAt: string;
}

interface PenaltyStats {
  totalAmount: number;
  totalPenalties: number;
  pendingCount: number;
  pendingAmount: number;
  paidCount: number;
  paidAmount: number;
  waivedCount: number;
  waivedAmount: number;
  averageDelay: number;
  maxDelay: number;
  recoveryRate: number;
}

interface FilterOptions {
  status: string;
  sortBy: 'recent' | 'amount' | 'delay';
}

// ========== UTILITAIRES ==========
const getStatusInfo = (status: string) => {
  const statusMap: Record<string, { icon: string; text: string; color: string; bgColor: string }> = {
    'pending': {
      icon: '⚠️',
      text: 'En souffrance',
      color: '#f44336',
      bgColor: '#ffebee'
    },
    'paid': {
      icon: '✅',
      text: 'Payée',
      color: '#4caf50',
      bgColor: '#e8f5e9'
    },
    'waived': {
      icon: '⏳',
      text: 'En attente',
      color: '#ff9800',
      bgColor: '#fff3e0'
    }
  };
  return statusMap[status] || statusMap['pending'];
};

const getSeverity = (days: number) => {
  if (days <= 7) return { level: 'Léger', icon: '🟡', color: '#ff9800' };
  if (days <= 30) return { level: 'Modéré', icon: '🔴', color: '#f44336' };
  return { level: 'Critique', icon: '💀', color: '#9c27b0' };
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  });
};

const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' TND';
};

const calculateStats = (penalties: Penalty[]): PenaltyStats => {
  const pending = penalties.filter(p => p.status === 'pending');
  const paid = penalties.filter(p => p.status === 'paid');
  const waived = penalties.filter(p => p.status === 'waived');

  const totalAmount = penalties.reduce((sum, p) => sum + p.penaltyAmount, 0);
  const pendingAmount = pending.reduce((sum, p) => sum + p.penaltyAmount, 0);
  const paidAmount = paid.reduce((sum, p) => sum + p.penaltyAmount, 0);
  const waivedAmount = waived.reduce((sum, p) => sum + p.penaltyAmount, 0);

  const delays = penalties.map(p => p.delayDays);
  const averageDelay = delays.length > 0 ? delays.reduce((a, b) => a + b) / delays.length : 0;
  const maxDelay = delays.length > 0 ? Math.max(...delays) : 0;

  const recoveryRate = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

  return {
    totalAmount,
    totalPenalties: penalties.length,
    pendingCount: pending.length,
    pendingAmount,
    paidCount: paid.length,
    paidAmount,
    waivedCount: waived.length,
    waivedAmount,
    averageDelay: Math.round(averageDelay * 10) / 10,
    maxDelay,
    recoveryRate: Math.round(recoveryRate)
  };
};

// ========== DONNÉES DE DÉMONSTRATION ==========
const _now = Date.now();
const DEMO_PENALTIES: Penalty[] = [
  {
    _id: 'p1',
    commandeId: {
      _id: 'cmd1',
      numero: 'CMD-2024-087',
      montantTotal: 45000,
      dateCommande: new Date(_now - 60 * 86400000).toISOString(),
      dateLivraisonPrevue: new Date(_now - 30 * 86400000).toISOString()
    },
    fournisseurId: 'fourn1',
    dueDate: new Date(_now - 30 * 86400000).toISOString(),
    actualDeliveryDate: new Date(_now - 12 * 86400000).toISOString(),
    delayDays: 18,
    penaltyAmount: 810,
    status: 'pending',
    calculatedAt: new Date(_now - 10 * 86400000).toISOString()
  },
  {
    _id: 'p2',
    commandeId: {
      _id: 'cmd2',
      numero: 'CMD-2024-075',
      montantTotal: 78000,
      dateCommande: new Date(_now - 90 * 86400000).toISOString(),
      dateLivraisonPrevue: new Date(_now - 50 * 86400000).toISOString()
    },
    fournisseurId: 'fourn1',
    dueDate: new Date(_now - 50 * 86400000).toISOString(),
    actualDeliveryDate: new Date(_now - 15 * 86400000).toISOString(),
    delayDays: 35,
    penaltyAmount: 2730,
    status: 'pending',
    calculatedAt: new Date(_now - 14 * 86400000).toISOString()
  },
  {
    _id: 'p3',
    commandeId: {
      _id: 'cmd3',
      numero: 'CMD-2024-063',
      montantTotal: 22500,
      dateCommande: new Date(_now - 45 * 86400000).toISOString(),
      dateLivraisonPrevue: new Date(_now - 20 * 86400000).toISOString()
    },
    fournisseurId: 'fourn1',
    dueDate: new Date(_now - 20 * 86400000).toISOString(),
    delayDays: 5,
    penaltyAmount: 112.5,
    status: 'paid',
    calculatedAt: new Date(_now - 15 * 86400000).toISOString()
  },
  {
    _id: 'p4',
    commandeId: {
      _id: 'cmd4',
      numero: 'CMD-2024-051',
      montantTotal: 33000,
      dateCommande: new Date(_now - 120 * 86400000).toISOString(),
      dateLivraisonPrevue: new Date(_now - 80 * 86400000).toISOString()
    },
    fournisseurId: 'fourn1',
    dueDate: new Date(_now - 80 * 86400000).toISOString(),
    delayDays: 8,
    penaltyAmount: 264,
    status: 'waived',
    calculatedAt: new Date(_now - 70 * 86400000).toISOString()
  }
];

// ========== PENALTY CARD – proper component so hooks are valid ===============

const PenaltyCard = React.memo(({
  item,
  index,
  onPress,
}: {
  item: Penalty;
  index: number;
  onPress: (item: Penalty) => void;
}) => {
  const itemFadeAnim = useRef(new Animated.Value(0)).current;
  const statusInfo = getStatusInfo(item.status);
  const severity = getSeverity(item.delayDays);

  useEffect(() => {
    Animated.timing(itemFadeAnim, {
      toValue: 1,
      duration: 300,
      delay: index * 50,
      useNativeDriver: true,
    }).start();
  }, [index]);

  return (
    <Animated.View style={{ opacity: itemFadeAnim }}>
      <TouchableOpacity
        style={[styles.penaltyCard, { borderLeftColor: statusInfo.color }]}
        onPress={() => onPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>
              Commande #{item.commandeId?.numero || 'N/A'}
            </Text>
            <Text style={styles.cardDate}>📅 {formatDate(item.dueDate)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
            <Text style={styles.statusBadgeText}>{statusInfo.icon}</Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>Montant</Text>
            <Text style={styles.amountValue}>{formatCurrency(item.penaltyAmount)}</Text>
          </View>
          <View style={styles.delayBox}>
            <Text style={styles.delayLabel}>Retard</Text>
            <Text style={[styles.delayValue, { color: severity.color }]}>
              {severity.icon} {item.delayDays}j
            </Text>
            <Text style={[styles.severity, { color: severity.color }]}>{severity.level}</Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${Math.min(100, (item.delayDays / 60) * 100)}%` as any,
                  backgroundColor: severity.color,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{item.delayDays}/60j</Text>
        </View>

        {item.status === 'pending' && (
          <TouchableOpacity style={styles.actionButton} onPress={() => onPress(item)}>
            <Text style={styles.actionButtonText}>💳 Payer</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

// ========== COMPOSANT PRINCIPAL ==========
export default function PenaltiesScreen({ navigation }: any) {
  // ========== ÉTATS ==========
  const { user } = useAuth();
  const [penalties, setPenalties] = useState<Penalty[]>(DEMO_PENALTIES);
  const [stats, setStats] = useState<PenaltyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPenalty, setSelectedPenalty] = useState<Penalty | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [statsModalVisible, setStatsModalVisible] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [filter, setFilter] = useState<FilterOptions>({
    status: 'all',
    sortBy: 'recent'
  });

  // ========== ANIMATIONS ==========
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // ========== EFFETS ==========
  useEffect(() => {
    loadPenalties();

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
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7
      })
    ]).start();
  }, []);

  // ========== CHARGEMENT ==========
  const loadPenalties = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await getPenalties(user.id);
      const raw = (response.data.penalties || [])
        .sort((a: Penalty, b: Penalty) =>
          new Date(b.calculatedAt).getTime() - new Date(a.calculatedAt).getTime()
        );
      const penaltiesData = raw.length > 0 ? raw : DEMO_PENALTIES;

      setPenalties(penaltiesData);
      setStats(calculateStats(penaltiesData));
    } catch (error: any) {
      console.error('Erreur chargement pénalités:', error);
      Alert.alert('Erreur', 'Impossible de charger les pénalités');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPenalties();
  }, [loadPenalties]);

  // ========== FILTRAGE & TRI ==========
  const filteredAndSortedPenalties = useMemo(() => {
    let filtered = [...penalties];

    // Filtrer par statut
    if (filter.status !== 'all') {
      filtered = filtered.filter((p: Penalty) => p.status === filter.status);
    }

    // Trier
    switch (filter.sortBy) {
      case 'amount':
        filtered.sort((a, b) => b.penaltyAmount - a.penaltyAmount);
        break;
      case 'delay':
        filtered.sort((a, b) => b.delayDays - a.delayDays);
        break;
      default: // recent
        filtered.sort((a, b) => 
          new Date(b.calculatedAt).getTime() - new Date(a.calculatedAt).getTime()
        );
    }

    return filtered;
  }, [penalties, filter]);

  // ========== PAIEMENT ==========
  const handlePayPenalty = useCallback(async () => {
    if (!selectedPenalty) return;

    Alert.alert(
      '💳 Confirmation du paiement',
      `Voulez-vous payer ${formatCurrency(selectedPenalty.penaltyAmount)} pour la commande #${selectedPenalty.commandeId.numero} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Payer',
          onPress: async () => {
            setPaymentLoading(true);
            try {
              await payPenalty(selectedPenalty._id);
              Alert.alert('✅ Succès', 'Paiement effectué avec succès');
              setDetailModalVisible(false);
              await loadPenalties();
            } catch (error: any) {
              Alert.alert('Erreur', error.response?.data?.message || 'Impossible d\'effectuer le paiement');
            } finally {
              setPaymentLoading(false);
            }
          }
        }
      ]
    );
  }, [selectedPenalty, loadPenalties]);

  // ========== RENDU PENALTY CARD ==========
  const renderPenaltyCard = useCallback(
    ({ item, index }: { item: Penalty; index: number }) => (
      <PenaltyCard
        item={item}
        index={index}
        onPress={(p) => {
          setSelectedPenalty(p);
          setDetailModalVisible(true);
        }}
      />
    ),
    []
  );

  // ========== RENDU MODAL DÉTAIL ==========
  const DetailModal = () => {
    if (!selectedPenalty) return null;

    const statusInfo = getStatusInfo(selectedPenalty.status);
    const severity = getSeverity(selectedPenalty.delayDays);

    return (
      <Modal
        visible={detailModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalContent,
              { transform: [{ scale: scaleAnim }] }
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📋 Détail Pénalité</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Statut */}
              <View style={[
                styles.statusSection,
                { backgroundColor: statusInfo.bgColor }
              ]}>
                <Text style={[styles.statusIcon, { color: statusInfo.color }]}>
                  {statusInfo.icon}
                </Text>
                <Text style={[styles.statusLabel, { color: statusInfo.color }]}>
                  {statusInfo.text}
                </Text>
              </View>

              {/* Montant */}
              <View style={styles.amountSection}>
                <Text style={styles.amountSectionLabel}>Montant à payer</Text>
                <Text style={styles.amountSectionValue}>
                  {formatCurrency(selectedPenalty.penaltyAmount)}
                </Text>
              </View>

              {/* Informations retard */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>⏰ Retard</Text>
                <InfoRow
                  label="Jours de retard"
                  value={`${severity.icon} ${selectedPenalty.delayDays} jours`}
                  color={severity.color}
                />
                <InfoRow
                  label="Sévérité"
                  value={severity.level}
                  color={severity.color}
                />
                <InfoRow
                  label="Date échéance"
                  value={formatDate(selectedPenalty.dueDate)}
                />
                {selectedPenalty.actualDeliveryDate && (
                  <InfoRow
                    label="Livraison réelle"
                    value={formatDate(selectedPenalty.actualDeliveryDate)}
                  />
                )}
              </View>

              {/* Commande */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📦 Commande</Text>
                <InfoRow
                  label="Numéro"
                  value={selectedPenalty.commandeId?.numero || 'N/A'}
                />
                <InfoRow
                  label="Montant"
                  value={formatCurrency(selectedPenalty.commandeId?.montantTotal || 0)}
                />
                <InfoRow
                  label="Date commande"
                  value={formatDate(selectedPenalty.commandeId?.dateCommande || new Date().toISOString())}
                />
                <InfoRow
                  label="Livraison prévue"
                  value={formatDate(selectedPenalty.commandeId?.dateLivraisonPrevue || selectedPenalty.dueDate)}
                />
              </View>

              {/* Calcul */}
              <View style={styles.calculationSection}>
                <Text style={styles.sectionTitle}>🧮 Calcul</Text>
                <Text style={styles.calculationText}>
                  Taux: 0.1% × Montant commande / jour
                </Text>
                <Text style={styles.calculationText}>
                  = 0.1% × {formatCurrency(selectedPenalty.commandeId?.montantTotal || 0)} × {selectedPenalty.delayDays}j
                </Text>
                <Text style={styles.calculationResult}>
                  = {formatCurrency(selectedPenalty.penaltyAmount)}
                </Text>
              </View>

              {/* Bouton paiement */}
              {selectedPenalty.status === 'pending' && (
                <TouchableOpacity
                  style={styles.payButton}
                  onPress={handlePayPenalty}
                  disabled={paymentLoading}
                >
                  {paymentLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.payButtonText}>💳 Payer maintenant</Text>
                  )}
                </TouchableOpacity>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setDetailModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  };

  // ========== RENDU LOADING ==========
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1a3c5e" />
        <Text style={styles.loadingText}>Chargement des pénalités...</Text>
      </View>
    );
  }

  // ========== RENDU PRINCIPAL ==========
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <DetailModal />

      {/* EN-TÊTE */}
      <Animated.View
        style={[
          styles.header,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
        ]}
      >
        <Text style={styles.title}>⚠️ Pénalités</Text>
        <TouchableOpacity
          style={styles.statsButton}
          onPress={() => setStatsModalVisible(true)}
        >
          <Text style={styles.statsButtonText}>📊</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* RÉSUMÉ */}
      {stats && (
        <Animated.View
          style={[
            styles.summarySection,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
          ]}
        >
          <TouchableOpacity
            style={styles.summaryMain}
            onPress={() => setStatsModalVisible(true)}
          >
            <Text style={styles.summaryMainValue}>
              {formatCurrency(stats.totalAmount)}
            </Text>
            <Text style={styles.summaryMainLabel}>Total</Text>
          </TouchableOpacity>

          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: '#ffebee' }]}>
              <Text style={styles.summaryCardValue}>{stats.pendingCount}</Text>
              <Text style={[styles.summaryCardLabel, { color: '#f44336' }]}>
                En attente
              </Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: '#e8f5e9' }]}>
              <Text style={styles.summaryCardValue}>{stats.paidCount}</Text>
              <Text style={[styles.summaryCardLabel, { color: '#4caf50' }]}>
                Payées
              </Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: '#fff3e0' }]}>
              <Text style={styles.summaryCardValue}>{stats.waivedCount}</Text>
              <Text style={[styles.summaryCardLabel, { color: '#ff9800' }]}>
                Annulées
              </Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* FILTRES */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { value: 'all', label: 'Toutes' },
            { value: 'pending', label: '⚠️ En attente' },
            { value: 'paid', label: '✅ Payées' },
            { value: 'waived', label: '⏳ Annulées' }
          ].map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.filterChip,
                filter.status === opt.value && styles.filterChipActive
              ]}
              onPress={() => setFilter({ ...filter, status: opt.value })}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filter.status === opt.value && styles.filterChipTextActive
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* LISTE */}
      <FlatList
        data={filteredAndSortedPenalties}
        keyExtractor={(item) => item._id}
        renderItem={renderPenaltyCard}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1a3c5e']}
          />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyTitle}>Aucune pénalité</Text>
            <Text style={styles.emptyText}>
              {filter.status === 'all'
                ? 'Vous êtes à jour'
                : 'Aucune pénalité avec ce statut'}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

// ========== COMPOSANT UTILITAIRE ==========
const InfoRow = ({
  label,
  value,
  color
}: {
  label: string;
  value: string;
  color?: string;
}) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={[
      styles.infoValue,
      color ? { color } : {}
    ]}>
      {value}
    </Text>
  </View>
);

// ========== STYLES ==========
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f5fb'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f5fb'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b'
  },

  // ========== EN-TÊTE ==========
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e4edf7',
    elevation: 3,
    shadowColor: '#0d2b3e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0d2b3e',
    letterSpacing: 0.2
  },
  statsButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e4edf7'
  },
  statsButtonText: {
    fontSize: 18
  },

  // ========== RÉSUMÉ ==========
  summarySection: {
    padding: 16,
    backgroundColor: '#ffffff',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e4edf7'
  },
  summaryMain: {
    backgroundColor: '#0d2b3e',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginBottom: 12
  },
  summaryMainValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
    letterSpacing: 0.5
  },
  summaryMainLabel: {
    fontSize: 13,
    color: '#ffffff',
    opacity: 0.75,
    fontWeight: '500'
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)'
  },
  summaryCardValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0d2b3e',
    marginBottom: 4
  },
  summaryCardLabel: {
    fontSize: 11,
    fontWeight: '600'
  },

  // ========== FILTRES ==========
  filterSection: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e4edf7'
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#f0f5fb',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#e4edf7'
  },
  filterChipActive: {
    backgroundColor: '#1a3c5e',
    borderColor: '#1a3c5e'
  },
  filterChipText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600'
  },
  filterChipTextActive: {
    color: '#ffffff'
  },

  // ========== LISTE ==========
  listContent: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    paddingBottom: 24
  },
  penaltyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 15,
    marginVertical: 6,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#e4edf7',
    elevation: 2,
    shadowColor: '#0d2b3e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0d2b3e'
  },
  cardDate: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 3,
    fontWeight: '500'
  },
  statusBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  statusBadgeText: {
    fontSize: 20
  },
  cardContent: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10
  },
  amountBox: {
    flex: 1
  },
  amountLabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0d2b3e'
  },
  delayBox: {
    alignItems: 'flex-end'
  },
  delayLabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5
  },
  delayValue: {
    fontSize: 16,
    fontWeight: '700'
  },
  severity: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2
  },
  progressContainer: {
    marginBottom: 10
  },
  progressBackground: {
    height: 4,
    backgroundColor: '#e4edf7',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4
  },
  progressBar: {
    height: '100%',
    borderRadius: 2
  },
  progressText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500'
  },
  actionButton: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center'
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700'
  },

  // ========== MODAL ==========
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(13,43,62,0.55)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    width: '90%',
    maxHeight: '85%',
    overflow: 'hidden'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#e4edf7'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0d2b3e'
  },
  modalClose: {
    fontSize: 20,
    color: '#94a3b8'
  },
  modalBody: {
    padding: 18
  },
  statusSection: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16
  },
  statusIcon: {
    fontSize: 28,
    marginBottom: 6
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '700'
  },
  amountSection: {
    backgroundColor: '#f0f5fb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e4edf7'
  },
  amountSectionLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 6,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  amountSectionValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1a3c5e'
  },
  section: {
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a3c5e',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e4edf7'
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748b'
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0d2b3e'
  },
  calculationSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e4edf7'
  },
  calculationText: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
    fontFamily: 'monospace'
  },
  calculationResult: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a3c5e',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e4edf7'
  },
  payButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12
  },
  payButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700'
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e4edf7'
  },
  closeButton: {
    backgroundColor: '#f0f5fb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e4edf7'
  },
  closeButtonText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600'
  },

  // ========== ÉTAT VIDE ==========
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0d2b3e',
    marginBottom: 8
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center'
  }
});