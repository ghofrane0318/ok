// pages/fournisseur/FournisseurDashboard.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import '../../css/FournisseurDashboard.css';

const API_BASE_URL = 'http://localhost:5001/api';

// ══════════════════════════════════════════════════════════════
// DONNÉES DE DÉMONSTRATION — TotalEnergies Marketing Tunisie
// Fournisseur de carburant à l'ETAP
// ══════════════════════════════════════════════════════════════
const DEMO = {
  fournisseur: {
    nom:              'TotalEnergies Marketing Tunisie',
    matricule:        '1000001F',
    adresse:          'Les Berges du Lac II, 1053 Tunis',
    telephone:        '+216 70 020 020',
    email:            'approvisionnement@total.com.tn',
    banque:           'Arab Tunisian Bank',
    rib:              'TN59 0801 0001 2345 6789 0123',
    siteWeb:          'www.totalenergies.tn',
    typeCarburant:    ['Essence Sans Plomb 95', 'Gas-oil (Diesel)', 'Kérosène Aviation', 'Brut léger'],
  },
  stats: {
    totalContrats:       12,
    contratsActifs:       4,
    totalLivraisons:    186,
    livraisonsEnCours:    7,
    livraisonsRetard:     2,
    livraisonsLivrees:  177,
    totalFactures:       48,
    facturesPayees:      41,
    facturesEnAttente:    5,
    facturesEnRetard:     2,
    montantTotal:   4_850_000,
    montantRecu:    3_920_000,
    montantImpaye:    930_000,
    volumeTotal_L:  2_450_000,
    volumeCeMois_L:   185_000,
  },
  evolution: [
    { mois: 'Jan',  livraisons: 14, montant: 340_000, volume: 180_000 },
    { mois: 'Fév',  livraisons: 18, montant: 425_000, volume: 210_000 },
    { mois: 'Mar',  livraisons: 21, montant: 510_000, volume: 255_000 },
    { mois: 'Avr',  livraisons: 16, montant: 390_000, volume: 195_000 },
    { mois: 'Mai',  livraisons: 24, montant: 580_000, volume: 290_000 },
    { mois: 'Jun',  livraisons: 19, montant: 460_000, volume: 230_000 },
  ],
  contrats: [
    {
      _id: 'C1',
      numeroContrat:  'CT-ETAP-2024-001',
      produit:        'Essence Sans Plomb 95',
      quantite:       500_000,
      uniteMesure:    'L',
      prixUnitaire:   2.850,
      montantTotal:   1_425_000,
      dateDebut:      '2024-01-01',
      dateFin:        '2024-12-31',
      statut:         'Actif',
      livree:         320_000,
      reste:          180_000,
    },
    {
      _id: 'C2',
      numeroContrat:  'CT-ETAP-2024-002',
      produit:        'Gas-oil (Diesel)',
      quantite:       750_000,
      uniteMesure:    'L',
      prixUnitaire:   2.650,
      montantTotal:   1_987_500,
      dateDebut:      '2024-01-01',
      dateFin:        '2024-12-31',
      statut:         'Actif',
      livree:         610_000,
      reste:          140_000,
    },
    {
      _id: 'C3',
      numeroContrat:  'CT-ETAP-2023-015',
      produit:        'Kérosène Aviation',
      quantite:       200_000,
      uniteMesure:    'L',
      prixUnitaire:   3.200,
      montantTotal:   640_000,
      dateDebut:      '2023-07-01',
      dateFin:        '2024-06-30',
      statut:         'Clôturé',
      livree:         200_000,
      reste:          0,
    },
    {
      _id: 'C4',
      numeroContrat:  'CT-ETAP-2024-008',
      produit:        'Brut léger (Sahara Blend)',
      quantite:       300_000,
      uniteMesure:    'bbl',
      prixUnitaire:   75.50,
      montantTotal:   22_650_000,
      dateDebut:      '2024-03-01',
      dateFin:        '2024-08-31',
      statut:         'En retard',
      livree:         180_000,
      reste:          120_000,
    },
  ],
  livraisons: [
    {
      _id: 'L1',
      numeroBon:      'BL-2024-0186',
      produit:        'Essence Sans Plomb 95',
      quantite:       25_000,
      uniteMesure:    'L',
      prixUnitaire:   2.850,
      montant:        71_250,
      dateLivraison:  '2024-06-15',
      statut:         'Livrée',
      destinataire:   'Dépôt ETAP Tunis Nord',
    },
    {
      _id: 'L2',
      numeroBon:      'BL-2024-0187',
      produit:        'Gas-oil (Diesel)',
      quantite:       40_000,
      uniteMesure:    'L',
      prixUnitaire:   2.650,
      montant:        106_000,
      dateLivraison:  '2024-06-17',
      statut:         'En cours',
      destinataire:   'Dépôt ETAP Sfax',
    },
    {
      _id: 'L3',
      numeroBon:      'BL-2024-0188',
      produit:        'Kérosène Aviation',
      quantite:       15_000,
      uniteMesure:    'L',
      prixUnitaire:   3.200,
      montant:        48_000,
      dateLivraison:  '2024-06-18',
      statut:         'En cours',
      destinataire:   'Aéroport Tunis-Carthage',
    },
    {
      _id: 'L4',
      numeroBon:      'BL-2024-0182',
      produit:        'Gas-oil (Diesel)',
      quantite:       35_000,
      uniteMesure:    'L',
      prixUnitaire:   2.650,
      montant:        92_750,
      dateLivraison:  '2024-06-01',
      statut:         'En retard',
      destinataire:   'Dépôt ETAP Gabès',
    },
    {
      _id: 'L5',
      numeroBon:      'BL-2024-0185',
      produit:        'Essence Sans Plomb 95',
      quantite:       20_000,
      uniteMesure:    'L',
      prixUnitaire:   2.850,
      montant:        57_000,
      dateLivraison:  '2024-06-12',
      statut:         'Livrée',
      destinataire:   'Dépôt ETAP Sousse',
    },
  ],
  factures: [
    {
      _id: 'F1',
      numeroFacture:  'FAC-2024-0041',
      contrat:        'CT-ETAP-2024-001',
      montantHT:      185_000,
      tva:            11_100,
      montantTTC:     196_100,
      dateEmission:   '2024-06-01',
      dateEcheance:   '2024-07-01',
      statut:         'Payée',
    },
    {
      _id: 'F2',
      numeroFacture:  'FAC-2024-0042',
      contrat:        'CT-ETAP-2024-002',
      montantHT:      242_500,
      tva:            14_550,
      montantTTC:     257_050,
      dateEmission:   '2024-06-05',
      dateEcheance:   '2024-07-05',
      statut:         'En attente',
    },
    {
      _id: 'F3',
      numeroFacture:  'FAC-2024-0040',
      contrat:        'CT-ETAP-2024-001',
      montantHT:      175_000,
      tva:            10_500,
      montantTTC:     185_500,
      dateEmission:   '2024-05-01',
      dateEcheance:   '2024-06-01',
      statut:         'En retard',
    },
    {
      _id: 'F4',
      numeroFacture:  'FAC-2024-0039',
      contrat:        'CT-ETAP-2024-002',
      montantHT:      318_000,
      tva:            19_080,
      montantTTC:     337_080,
      dateEmission:   '2024-05-15',
      dateEcheance:   '2024-06-15',
      statut:         'Payée',
    },
  ],
  alertes: [
    { id: 1, type: 'retard',   titre: 'Livraison en retard', message: 'BL-2024-0182 — Gas-oil Gabès dépasse l\'échéance de 17 jours', date: new Date().toISOString() },
    { id: 2, type: 'facture',  titre: 'Facture impayée',     message: 'FAC-2024-0040 — Échéance dépassée de 16 jours (185 500 TND)', date: new Date(Date.now() - 86400000).toISOString() },
    { id: 3, type: 'contrat',  titre: 'Contrat expirant',    message: 'CT-ETAP-2024-008 — Expire dans 74 jours, renouvellement recommandé', date: new Date(Date.now() - 172800000).toISOString() },
    { id: 4, type: 'paiement', titre: 'Paiement reçu',       message: 'FAC-2024-0041 — 196 100 TND crédité sur votre compte ATB', date: new Date(Date.now() - 259200000).toISOString(), lu: true },
  ],
};

const fmt = (n) => new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', maximumFractionDigits: 0 }).format(n);
const fmtVol = (n) => new Intl.NumberFormat('fr-FR').format(n);
const fmtDate = (d) => d ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d)) : '—';

const STATUS_MAP = {
  'Actif':        { cls: 'st-actif',    dot: '#16a34a' },
  'En cours':     { cls: 'st-encours',  dot: '#d97706' },
  'Livrée':       { cls: 'st-livree',   dot: '#16a34a' },
  'En retard':    { cls: 'st-retard',   dot: '#dc2626' },
  'Clôturé':      { cls: 'st-cloture',  dot: '#6b7280' },
  'Payée':        { cls: 'st-payee',    dot: '#16a34a' },
  'En attente':   { cls: 'st-attente',  dot: '#d97706' },
};

const ALERTE_ICONS = {
  retard:   '⏰', facture: '💳', contrat: '📋', paiement: '✅',
};

// ══════════════════════════════════════════════════════════════
function FournisseurDashboard() {
// ══════════════════════════════════════════════════════════════

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); }
    catch { return {}; }
  }, []);

  const token     = localStorage.getItem('token');
  const isSupplier = user.role === 'Fournisseur';

  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [isDemoMode,    setIsDemoMode]    = useState(false);
  const [activeTab,     setActiveTab]     = useState('overview');
  const [alertes,       setAlertes]       = useState(DEMO.alertes);
  const [toasts,        setToasts]        = useState([]);
  const [showModal,     setShowModal]     = useState(false);
  const [formData,      setFormData]      = useState({
    produit: '', quantite: '', prixUnitaire: '',
    dateLivraison: '', numeroBon: '', destinataire: '',
  });

  const api = useMemo(() => {
    if (!token) return null;
    return axios.create({ baseURL: API_BASE_URL, headers: { Authorization: `Bearer ${token}` } });
  }, [token]);

  const showToast = useCallback((msg, type = 'success') => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);

  // ── Chargement ───────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    if (!token || !api) { setData(DEMO); setIsDemoMode(true); setLoading(false); return; }
    try {
      const [contratsR, livraisonsR, facturesR] = await Promise.all([
        api.get('/contrats/fournisseur'),
        api.get('/livraisons/fournisseur'),
        api.get('/factures/fournisseur'),
      ]);
      setData({
        ...DEMO,
        fournisseur: { ...DEMO.fournisseur, ...user },
        contrats:    contratsR.data?.data  || contratsR.data  || DEMO.contrats,
        livraisons:  livraisonsR.data?.data|| livraisonsR.data|| DEMO.livraisons,
        factures:    facturesR.data?.data  || facturesR.data  || DEMO.factures,
      });
      setIsDemoMode(false);
    } catch {
      setData(DEMO); setIsDemoMode(true);
    } finally { setLoading(false); }
  }, [api, token, user]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Auto-refresh 60s ─────────────────────────────────────────
  useEffect(() => {
    if (!isDemoMode) {
      const t = setInterval(loadData, 60000);
      return () => clearInterval(t);
    }
  }, [loadData, isDemoMode]);

  // ── Ajout livraison ──────────────────────────────────────────
  const handleAddLivraison = useCallback(async (e) => {
    e.preventDefault();
    if (!formData.produit || !formData.quantite || !formData.prixUnitaire) {
      showToast('Veuillez remplir les champs obligatoires', 'error'); return;
    }
    try {
      if (!isDemoMode && api) {
        await api.post('/stock/ajouter-livraison', {
          ...formData,
          quantite:     parseFloat(formData.quantite),
          prixUnitaire: parseFloat(formData.prixUnitaire),
        });
      }
      showToast('✅ Livraison ajoutée avec succès');
      setShowModal(false);
      setFormData({ produit: '', quantite: '', prixUnitaire: '', dateLivraison: '', numeroBon: '', destinataire: '' });
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de l\'ajout', 'error');
    }
  }, [formData, api, isDemoMode, showToast]);

  // ── Imprimer bon ─────────────────────────────────────────────
  const printBon = useCallback((livraison) => {
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Bon de livraison ${livraison.numeroBon}</title>
    <style>
      body{font-family:Arial,sans-serif;margin:40px;color:#0c1b35}
      .logo{font-size:22px;font-weight:800;color:#1a3460;margin-bottom:4px}
      .sub{font-size:12px;color:#6b7280;margin-bottom:30px}
      h1{font-size:18px;text-transform:uppercase;letter-spacing:2px;color:#0c1b35;margin-bottom:4px}
      .ref{font-size:13px;color:#6b7280;margin-bottom:24px}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:24px}
      .field{background:#f8f9fb;padding:10px 14px;border-radius:6px}
      .field label{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#8b95a8;margin-bottom:3px}
      .field span{font-size:14px;font-weight:600}
      .total{background:#0c1b35;color:#fff;padding:14px 16px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;margin-bottom:40px}
      .sigs{display:flex;justify-content:space-between;margin-top:40px}
      .sig{text-align:center;width:180px}
      .sig-line{border-top:1px solid #0c1b35;margin-bottom:8px;margin-top:50px}
      .sig p{font-size:12px;color:#6b7280}
      .footer{margin-top:30px;text-align:center;font-size:11px;color:#9ca3af}
    </style>
    </head><body>
    <div class="logo">TotalEnergies Marketing Tunisie</div>
    <div class="sub">Fournisseur de carburant · ETAP</div>
    <h1>Bon de Livraison</h1>
    <div class="ref">Réf : ${livraison.numeroBon || 'BL-' + livraison._id?.slice(-6)}</div>
    <div class="grid">
      <div class="field"><label>Produit</label><span>${livraison.produit}</span></div>
      <div class="field"><label>Destinataire</label><span>${livraison.destinataire || 'ETAP'}</span></div>
      <div class="field"><label>Quantité</label><span>${fmtVol(livraison.quantite)} ${livraison.uniteMesure}</span></div>
      <div class="field"><label>Prix unitaire</label><span>${livraison.prixUnitaire?.toFixed(3)} TND/${livraison.uniteMesure}</span></div>
      <div class="field"><label>Date livraison</label><span>${fmtDate(livraison.dateLivraison)}</span></div>
      <div class="field"><label>Statut</label><span>${livraison.statut}</span></div>
    </div>
    <div class="total">
      <span style="font-size:13px;opacity:.7">Montant total TTC</span>
      <span style="font-size:20px;font-weight:700">${fmt(livraison.montant)}</span>
    </div>
    <div class="sigs">
      <div class="sig"><div class="sig-line"></div><p>Signature Fournisseur</p></div>
      <div class="sig"><div class="sig-line"></div><p>Cachet ETAP</p></div>
    </div>
    <div class="footer">Document généré le ${new Date().toLocaleString('fr-FR')} · ETAP © 2024</div>
    </body></html>`);
    win.document.close();
    win.print();
    showToast('📄 Bon prêt à imprimer');
  }, [showToast]);

  // ── Barre de progression ─────────────────────────────────────
  const ProgressBar = ({ value, max, color = '#2563eb' }) => {
    const pct = Math.min(100, Math.round((value / max) * 100));
    return (
      <div className="fd-progress-wrap">
        <div className="fd-progress-bar">
          <div className="fd-progress-fill" style={{ width: `${pct}%`, background: color }} />
        </div>
        <span className="fd-progress-pct">{pct}%</span>
      </div>
    );
  };

  // ── Mini graphique ────────────────────────────────────────────
  const MiniChart = ({ data: evol }) => {
    const maxM = Math.max(...evol.map(e => e.montant));
    return (
      <div className="fd-chart">
        {evol.map((e, i) => (
          <div key={i} className="fd-chart-col">
            <div className="fd-chart-bar-wrap">
              <div
                className="fd-chart-bar"
                style={{ height: `${Math.round((e.montant / maxM) * 100)}%` }}
                title={`${e.mois} : ${fmt(e.montant)}`}
              />
            </div>
            <span className="fd-chart-label">{e.mois}</span>
          </div>
        ))}
      </div>
    );
  };

  // ── Guard ─────────────────────────────────────────────────────
  if (!isSupplier) {
    return (
      <div className="fd-access-denied">
        <span>🔒</span>
        <h2>Accès réservé aux fournisseurs</h2>
        <p>Cette page est uniquement accessible aux fournisseurs partenaires ETAP.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="fd-page">
        <div className="fd-loading"><div className="fd-spinner" /><p>Chargement du dashboard...</p></div>
      </div>
    );
  }

  const s = data.stats;
  const unreadAlertes = alertes.filter(a => !a.lu).length;

  return (
    <div className="fd-page">

      {/* ── Toasts ──────────────────────────────────────────── */}
      <div className="fd-toasts">
        {toasts.map(t => (
          <div key={t.id} className={`fd-toast fd-toast-${t.type}`}>{t.msg}</div>
        ))}
      </div>

      {/* ── Hero header ─────────────────────────────────────── */}
      <div className="fd-hero">
        <div className="fd-hero-bg" />
        <div className="fd-hero-left">
          <div className="fd-hero-logo">⛽</div>
          <div>
            <div className="fd-hero-company">{data.fournisseur.nom}</div>
            <div className="fd-hero-subtitle">
              Fournisseur de carburant · Partenaire officiel ETAP
            </div>
            <div className="fd-hero-badges">
              <span className="fd-badge-green">✅ Partenaire certifié</span>
              <span className="fd-badge-blue">📋 {s.contratsActifs} contrats actifs</span>
              {isDemoMode && <span className="fd-badge-amber">⚡ Mode démo</span>}
            </div>
          </div>
        </div>
        <div className="fd-hero-right">
          <div className="fd-hero-stat">
            <div className="fd-hero-stat-num">{fmt(s.montantTotal)}</div>
            <div className="fd-hero-stat-label">CA total avec ETAP</div>
          </div>
          <button className="fd-btn-primary" onClick={() => setShowModal(true)}>
            + Déclarer une livraison
          </button>
          <button className="fd-btn-ghost" onClick={loadData}>↻ Actualiser</button>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────── */}
      <div className="fd-kpi-grid">
        <div className="fd-kpi fd-kpi-blue">
          <div className="fd-kpi-icon">📋</div>
          <div>
            <div className="fd-kpi-num">{s.totalContrats}</div>
            <div className="fd-kpi-label">Contrats ETAP</div>
            <div className="fd-kpi-sub">{s.contratsActifs} en cours · {s.totalContrats - s.contratsActifs} clôturés</div>
          </div>
        </div>
        <div className="fd-kpi fd-kpi-teal">
          <div className="fd-kpi-icon">🚚</div>
          <div>
            <div className="fd-kpi-num">{s.totalLivraisons}</div>
            <div className="fd-kpi-label">Livraisons totales</div>
            <div className="fd-kpi-sub">{s.livraisonsEnCours} en transit · {s.livraisonsRetard} en retard</div>
          </div>
        </div>
        <div className="fd-kpi fd-kpi-amber">
          <div className="fd-kpi-icon">🛢️</div>
          <div>
            <div className="fd-kpi-num">{fmtVol(s.volumeTotal_L)} L</div>
            <div className="fd-kpi-label">Volume livré total</div>
            <div className="fd-kpi-sub">{fmtVol(s.volumeCeMois_L)} L ce mois</div>
          </div>
        </div>
        <div className="fd-kpi fd-kpi-green">
          <div className="fd-kpi-icon">💳</div>
          <div>
            <div className="fd-kpi-num">{fmt(s.montantRecu)}</div>
            <div className="fd-kpi-label">Montant encaissé</div>
            <div className="fd-kpi-sub">{fmt(s.montantImpaye)} impayé</div>
          </div>
        </div>
        <div className="fd-kpi fd-kpi-navy">
          <div className="fd-kpi-icon">📄</div>
          <div>
            <div className="fd-kpi-num">{s.totalFactures}</div>
            <div className="fd-kpi-label">Factures émises</div>
            <div className="fd-kpi-sub">{s.facturesPayees} payées · {s.facturesEnRetard} en retard</div>
          </div>
        </div>
        <div className={`fd-kpi ${s.livraisonsRetard > 0 ? 'fd-kpi-red' : 'fd-kpi-green'}`}>
          <div className="fd-kpi-icon">⚠️</div>
          <div>
            <div className="fd-kpi-num">{s.livraisonsRetard}</div>
            <div className="fd-kpi-label">Livraisons en retard</div>
            <div className="fd-kpi-sub">{s.livraisonsRetard === 0 ? 'Aucun retard ✓' : 'Action requise'}</div>
          </div>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────── */}
      <div className="fd-tabs">
        {[
          { key: 'overview',    label: '📊 Vue d\'ensemble' },
          { key: 'contrats',    label: '📋 Contrats'        },
          { key: 'livraisons',  label: '🚚 Livraisons'      },
          { key: 'factures',    label: '💳 Factures'        },
          { key: 'alertes',     label: `🔔 Alertes ${unreadAlertes > 0 ? `(${unreadAlertes})` : ''}` },
          { key: 'profil',      label: '🏭 Profil'          },
        ].map(t => (
          <button key={t.key}
            className={`fd-tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="fd-content">

        {/* ── VUE D'ENSEMBLE ────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="fd-overview">

            {/* Graphique évolution */}
            <div className="fd-card fd-card-wide">
              <div className="fd-card-head">
                <h3>📈 Évolution des livraisons (6 derniers mois)</h3>
              </div>
              <div className="fd-card-body">
                <MiniChart data={data.evolution} />
                <div className="fd-chart-legend">
                  {data.evolution.map((e, i) => (
                    <div key={i} className="fd-chart-leg-item">
                      <span className="fd-chart-leg-mois">{e.mois}</span>
                      <span className="fd-chart-leg-val">{fmt(e.montant)}</span>
                      <span className="fd-chart-leg-vol">{fmtVol(e.volume)} L</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Avancement contrats */}
            <div className="fd-card">
              <div className="fd-card-head"><h3>📋 Avancement contrats actifs</h3></div>
              <div className="fd-card-body">
                {data.contrats.filter(c => c.statut === 'Actif' || c.statut === 'En retard').map(c => (
                  <div key={c._id} className="fd-contract-progress">
                    <div className="fd-cp-header">
                      <span className="fd-cp-ref">{c.numeroContrat}</span>
                      <span className={`fd-status-badge ${STATUS_MAP[c.statut]?.cls}`}>
                        {c.statut}
                      </span>
                    </div>
                    <div className="fd-cp-produit">{c.produit}</div>
                    <ProgressBar
                      value={c.livree}
                      max={c.quantite}
                      color={c.statut === 'En retard' ? '#dc2626' : '#2563eb'}
                    />
                    <div className="fd-cp-details">
                      <span>{fmtVol(c.livree)} {c.uniteMesure} livrés</span>
                      <span>{fmtVol(c.reste)} {c.uniteMesure} restants</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Situation financière */}
            <div className="fd-card">
              <div className="fd-card-head"><h3>💰 Situation financière</h3></div>
              <div className="fd-card-body">
                <div className="fd-finance-row">
                  <span>Montant contractualisé</span>
                  <strong>{fmt(s.montantTotal)}</strong>
                </div>
                <div className="fd-finance-bar">
                  <div className="fd-fb-fill fd-fb-green" style={{ width: `${Math.round(s.montantRecu / s.montantTotal * 100)}%` }} />
                  <div className="fd-fb-fill fd-fb-red"   style={{ width: `${Math.round(s.montantImpaye / s.montantTotal * 100)}%` }} />
                </div>
                <div className="fd-finance-legend">
                  <span><span className="fd-dot fd-dot-green" />Encaissé {fmt(s.montantRecu)}</span>
                  <span><span className="fd-dot fd-dot-red" />Impayé {fmt(s.montantImpaye)}</span>
                </div>
                <div className="fd-finance-sep" />
                <div className="fd-finance-row">
                  <span>Factures payées</span>
                  <strong className="fd-green">{s.facturesPayees}/{s.totalFactures}</strong>
                </div>
                <div className="fd-finance-row">
                  <span>Factures en attente</span>
                  <strong className="fd-amber">{s.facturesEnAttente}</strong>
                </div>
                <div className="fd-finance-row fd-finance-row-danger">
                  <span>Factures en retard</span>
                  <strong className="fd-red">{s.facturesEnRetard}</strong>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ── CONTRATS ──────────────────────────────────────── */}
        {activeTab === 'contrats' && (
          <div className="fd-card fd-card-full">
            <div className="fd-card-head">
              <h3>📋 Contrats de fourniture ETAP</h3>
              <span className="fd-count">{data.contrats.length} contrats</span>
            </div>
            <div className="fd-table-wrap">
              <table className="fd-table">
                <thead>
                  <tr>
                    <th>N° Contrat</th>
                    <th>Produit carburant</th>
                    <th>Volume contractuel</th>
                    <th>Prix / unité</th>
                    <th>Montant total</th>
                    <th>Période</th>
                    <th>Avancement</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {data.contrats.map(c => (
                    <tr key={c._id}>
                      <td className="fd-mono">{c.numeroContrat}</td>
                      <td className="fd-bold"><span className="fd-fuel-icon">⛽</span> {c.produit}</td>
                      <td className="fd-mono">{fmtVol(c.quantite)} {c.uniteMesure}</td>
                      <td className="fd-mono">{c.prixUnitaire?.toFixed(3)} TND</td>
                      <td className="fd-mono fd-amber-text">{fmt(c.montantTotal)}</td>
                      <td className="fd-small">{fmtDate(c.dateDebut)} → {fmtDate(c.dateFin)}</td>
                      <td style={{ minWidth: 120 }}>
                        <ProgressBar value={c.livree} max={c.quantite}
                          color={c.statut === 'En retard' ? '#dc2626' : '#16a34a'} />
                      </td>
                      <td>
                        <span className={`fd-status-badge ${STATUS_MAP[c.statut]?.cls}`}>
                          {c.statut}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── LIVRAISONS ────────────────────────────────────── */}
        {activeTab === 'livraisons' && (
          <div className="fd-card fd-card-full">
            <div className="fd-card-head">
              <h3>🚚 Bons de livraison vers ETAP</h3>
              <button className="fd-btn-sm" onClick={() => setShowModal(true)}>+ Déclarer</button>
            </div>
            <div className="fd-table-wrap">
              <table className="fd-table">
                <thead>
                  <tr>
                    <th>N° Bon</th>
                    <th>Produit</th>
                    <th>Volume</th>
                    <th>Prix unit.</th>
                    <th>Montant</th>
                    <th>Destinataire ETAP</th>
                    <th>Date</th>
                    <th>Statut</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.livraisons.map(l => (
                    <tr key={l._id}>
                      <td className="fd-mono">{l.numeroBon}</td>
                      <td><span className="fd-fuel-icon">⛽</span> {l.produit}</td>
                      <td className="fd-mono">{fmtVol(l.quantite)} {l.uniteMesure}</td>
                      <td className="fd-mono">{l.prixUnitaire?.toFixed(3)} TND</td>
                      <td className="fd-mono fd-amber-text">{fmt(l.montant)}</td>
                      <td className="fd-small">{l.destinataire}</td>
                      <td className="fd-small">{fmtDate(l.dateLivraison)}</td>
                      <td>
                        <span className={`fd-status-badge ${STATUS_MAP[l.statut]?.cls}`}>
                          {l.statut}
                        </span>
                      </td>
                      <td>
                        <button className="fd-btn-xs" onClick={() => printBon(l)}>
                          📄 Imprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── FACTURES ──────────────────────────────────────── */}
        {activeTab === 'factures' && (
          <div className="fd-card fd-card-full">
            <div className="fd-card-head">
              <h3>💳 Factures émises à l'ETAP</h3>
              <span className="fd-count">{data.factures.length} factures</span>
            </div>
            <div className="fd-table-wrap">
              <table className="fd-table">
                <thead>
                  <tr>
                    <th>N° Facture</th>
                    <th>Contrat</th>
                    <th>Montant HT</th>
                    <th>TVA (6%)</th>
                    <th>Montant TTC</th>
                    <th>Date émission</th>
                    <th>Échéance</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {data.factures.map(f => (
                    <tr key={f._id} className={f.statut === 'En retard' ? 'fd-row-danger' : ''}>
                      <td className="fd-mono fd-bold">{f.numeroFacture}</td>
                      <td className="fd-mono fd-small">{f.contrat}</td>
                      <td className="fd-mono">{fmt(f.montantHT)}</td>
                      <td className="fd-mono fd-gray">{fmt(f.tva)}</td>
                      <td className="fd-mono fd-bold fd-amber-text">{fmt(f.montantTTC)}</td>
                      <td className="fd-small">{fmtDate(f.dateEmission)}</td>
                      <td className={`fd-small ${f.statut === 'En retard' ? 'fd-red' : ''}`}>
                        {fmtDate(f.dateEcheance)}
                      </td>
                      <td>
                        <span className={`fd-status-badge ${STATUS_MAP[f.statut]?.cls}`}>
                          {f.statut}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="fd-total-row">
                    <td colSpan="4">Total TTC ({data.factures.length} factures)</td>
                    <td className="fd-mono">{fmt(data.factures.reduce((a, f) => a + f.montantTTC, 0))}</td>
                    <td colSpan="3" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ── ALERTES ───────────────────────────────────────── */}
        {activeTab === 'alertes' && (
          <div className="fd-card fd-card-full">
            <div className="fd-card-head">
              <h3>🔔 Alertes & notifications</h3>
              {unreadAlertes > 0 && <span className="fd-badge-red">{unreadAlertes} non lue(s)</span>}
            </div>
            <div className="fd-card-body fd-alertes-list">
              {alertes.map(a => (
                <div key={a.id} className={`fd-alerte ${a.lu ? 'fd-alerte-read' : 'fd-alerte-unread'} fd-alerte-${a.type}`}>
                  <span className="fd-alerte-icon">{ALERTE_ICONS[a.type]}</span>
                  <div className="fd-alerte-body">
                    <div className="fd-alerte-titre">{a.titre}</div>
                    <div className="fd-alerte-msg">{a.message}</div>
                    <div className="fd-alerte-date">{fmtDate(a.date)}</div>
                  </div>
                  {!a.lu && (
                    <button className="fd-btn-mark"
                      onClick={() => setAlertes(p => p.map(x => x.id === a.id ? { ...x, lu: true } : x))}>
                      ✓ Lu
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PROFIL ────────────────────────────────────────── */}
        {activeTab === 'profil' && (
          <div className="fd-overview">
            <div className="fd-card">
              <div className="fd-card-head"><h3>🏭 Informations fournisseur</h3></div>
              <div className="fd-card-body">
                {[
                  ['🏢', 'Raison sociale',      data.fournisseur.nom],
                  ['📋', 'Matricule fiscale',   data.fournisseur.matricule],
                  ['📍', 'Adresse',             data.fournisseur.adresse],
                  ['📞', 'Téléphone',           data.fournisseur.telephone],
                  ['✉️', 'Email',               data.fournisseur.email],
                  ['🏦', 'Banque',              data.fournisseur.banque],
                  ['💳', 'RIB',                data.fournisseur.rib],
                ].map(([icon, label, val]) => (
                  <div key={label} className="fd-profil-row">
                    <span className="fd-profil-icon">{icon}</span>
                    <div>
                      <div className="fd-profil-label">{label}</div>
                      <div className="fd-profil-val">{val}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="fd-card">
              <div className="fd-card-head"><h3>⛽ Produits fournis à ETAP</h3></div>
              <div className="fd-card-body">
                {data.fournisseur.typeCarburant.map((p, i) => (
                  <div key={i} className="fd-produit-item">
                    <span className="fd-produit-icon">🛢️</span>
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── Modal déclarer livraison ─────────────────────────── */}
      {showModal && (
        <div className="fd-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="fd-modal" onClick={e => e.stopPropagation()}>
            <div className="fd-modal-head">
              <div>
                <h2>🚚 Déclarer une livraison</h2>
                <p>Livraison de carburant vers ETAP</p>
              </div>
              <button className="fd-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddLivraison}>
              <div className="fd-modal-body">
                <div className="fd-form-row">
                  <div className="fd-form-group">
                    <label>Produit carburant <span className="req">*</span></label>
                    <select value={formData.produit} onChange={e => setFormData({ ...formData, produit: e.target.value })} required>
                      <option value="">— Sélectionner —</option>
                      {data.fournisseur.typeCarburant.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div className="fd-form-group">
                    <label>Destinataire ETAP</label>
                    <select value={formData.destinataire} onChange={e => setFormData({ ...formData, destinataire: e.target.value })}>
                      <option value="">— Sélectionner —</option>
                      {['Dépôt ETAP Tunis Nord','Dépôt ETAP Sfax','Dépôt ETAP Sousse','Dépôt ETAP Gabès','Aéroport Tunis-Carthage'].map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="fd-form-row">
                  <div className="fd-form-group">
                    <label>Volume livré (L) <span className="req">*</span></label>
                    <input type="number" step="0.01" min="1" placeholder="Ex : 25000"
                      value={formData.quantite} onChange={e => setFormData({ ...formData, quantite: e.target.value })} required />
                  </div>
                  <div className="fd-form-group">
                    <label>Prix unitaire (TND/L) <span className="req">*</span></label>
                    <input type="number" step="0.001" min="0" placeholder="Ex : 2.850"
                      value={formData.prixUnitaire} onChange={e => setFormData({ ...formData, prixUnitaire: e.target.value })} required />
                  </div>
                </div>
                <div className="fd-form-row">
                  <div className="fd-form-group">
                    <label>Date de livraison</label>
                    <input type="date" value={formData.dateLivraison}
                      onChange={e => setFormData({ ...formData, dateLivraison: e.target.value })} />
                  </div>
                  <div className="fd-form-group">
                    <label>N° Bon de livraison</label>
                    <input type="text" placeholder="Ex : BL-2024-0190"
                      value={formData.numeroBon} onChange={e => setFormData({ ...formData, numeroBon: e.target.value })} />
                  </div>
                </div>
                {formData.quantite && formData.prixUnitaire && (
                  <div className="fd-total-preview">
                    <span>Montant estimé :</span>
                    <strong>{fmt(parseFloat(formData.quantite) * parseFloat(formData.prixUnitaire))}</strong>
                  </div>
                )}
              </div>
              <div className="fd-modal-foot">
                <button type="button" className="fd-btn-cancel" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="fd-btn-primary">🚚 Confirmer la livraison</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default FournisseurDashboard;