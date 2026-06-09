// pages/admin/Livraisons.jsx - VERSION CORRIGÉE (PRODUCTION READY)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import '../css/Livraison.css';

function Livraisons() {
  // ═══════════════════════════════════════════════════════════
  // 1. STATE
  // ═══════════════════════════════════════════════════════════
  const [livraisons, setLivraisons] = useState([]);
  const [commandes, setCommandes] = useState([]);
  const [transporteurs, setTransporteurs] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedCommande, setSelectedCommande] = useState(null);
  const [selectedLivraison, setSelectedLivraison] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEtat, setSelectedEtat] = useState('');

  // ═══════════════════════════════════════════════════════════
  // 2. USER & AUTH
  // ═══════════════════════════════════════════════════════════
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const token = localStorage.getItem('token');
  const userRole = user?.role?.toLowerCase() || '';
  const userId = user?._id || user?.id || '';
  const isAdmin = userRole === 'admin';
  const isCommercial = userRole === 'commercial';
  const isClient = userRole === 'client';
  const isFournisseur = userRole === 'fournisseur';
  const isTransporteur = userRole === 'transporteur';

  // ✅ Permissions par rôle:
  // - Admin/Commercial: créent et voient TOUT
  // - Client/Fournisseur/Transporteur: VOIENT seulement (lecture)
  const canView = isAdmin || isCommercial || isClient || isFournisseur || isTransporteur;
  const canCreate = isAdmin || isCommercial;
  const canEdit = isAdmin || isCommercial;
  const canAssignTransporteur = isAdmin;

  // ═══════════════════════════════════════════════════════════
  // 3. API CLIENT (avec interceptor pour gérer le token)
  // ═══════════════════════════════════════════════════════════
  const api = useMemo(() => {
    const instance = axios.create({
      baseURL: 'http://localhost:5001/api',
      headers: { 'Content-Type': 'application/json' },
    });

    // Ajout automatique du token
    instance.interceptors.request.use((config) => {
      const currentToken = localStorage.getItem('token');
      if (currentToken) {
        config.headers.Authorization = `Bearer ${currentToken}`;
      }
      return config;
    });

    // Gestion globale des erreurs 401 (token expiré)
    instance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          toast.error('Session expirée, veuillez vous reconnecter');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );

    return instance;
  }, []);

  // ═══════════════════════════════════════════════════════════
  // 4. FETCH DATA (avec fallback et gestion d'erreur)
  // ═══════════════════════════════════════════════════════════
  const fetchData = useCallback(async () => {
    if (!token) {
      toast.error('❌ Authentification requise');
      return;
    }

    try {
      setLoading(true);

      // Récupérer les livraisons (toutes pour admin/commercial)
      const livraisonsRes = await api.get('/livraisons');
      setLivraisons(Array.isArray(livraisonsRes.data) ? livraisonsRes.data : livraisonsRes.data?.data || []);

      // Récupérer les commandes validées
      const commandesRes = await api.get('/commandes?statut=Validée');
      setCommandes(Array.isArray(commandesRes.data) ? commandesRes.data : commandesRes.data?.data || []);

      // Récupérer les transporteurs
      const transporteursRes = await api.get('/transporteurs');
      setTransporteurs(Array.isArray(transporteursRes.data) ? transporteursRes.data : transporteursRes.data?.data || []);

      toast.success('✅ Données chargées');
    } catch (error) {
      console.error('Erreur chargement:', error);
      toast.error(error.response?.data?.message || '❌ Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [token, api]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ═══════════════════════════════════════════════════════════
  // 5. CRUD OPERATIONS
  // ═══════════════════════════════════════════════════════════
  const createLivraison = useCallback(async () => {
    if (!canCreate) {
      toast.error('❌ Accès refusé');
      return;
    }
    if (!selectedCommande) {
      toast.error('⚠️ Sélectionnez une commande');
      return;
    }

    const existing = livraisons.find((l) => l.commande?._id === selectedCommande._id);
    if (existing) {
      toast.error(`⚠️ Livraison existe déjà pour ${selectedCommande.numeroCommande}`);
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/livraisons', {
        commande: selectedCommande._id,
        etat: 'À préparer',
        transporteur: null,
        commentaire: '',
      });
      setLivraisons((prev) => [response.data, ...prev]);
      toast.success(`✅ Livraison créée pour ${selectedCommande.numeroCommande}`);
      setShowModal(false);
      setSelectedCommande(null);
    } catch (error) {
      console.error('Erreur création:', error);
      toast.error(error.response?.data?.message || '❌ Erreur création');
    } finally {
      setLoading(false);
    }
  }, [canCreate, selectedCommande, livraisons, api]);

  const updateEtat = useCallback(
    async (livraisonId, nouvelEtat) => {
      if (!canEdit) {
        toast.error('❌ Accès refusé');
        return;
      }

      let commentaireValue = '';
      if (nouvelEtat === 'Annulée') {
        commentaireValue = prompt('Raison de l\'annulation :');
        if (!commentaireValue) return;
      }

      try {
        setLoading(true);
        const response = await api.patch(`/livraisons/${livraisonId}`, {
          etat: nouvelEtat,
          commentaire: commentaireValue,
        });
        setLivraisons((prev) => prev.map((l) => (l._id === livraisonId ? response.data : l)));

        const messages = {
          'Prête': '✅ Livraison prête',
          'En cours': '🚚 Livraison en cours',
          'Livrée': '📦 Livraison livrée',
          'Annulée': '❌ Livraison annulée',
        };
        toast.success(messages[nouvelEtat] || `État: ${nouvelEtat}`);
      } catch (error) {
        console.error('Erreur mise à jour:', error);
        toast.error(error.response?.data?.message || '❌ Erreur mise à jour');
      } finally {
        setLoading(false);
      }
    },
    [canEdit, api]
  );

  const assignTransporteur = useCallback(
    async (livraisonId, transporteurId) => {
      if (!canAssignTransporteur) {
        toast.error('❌ Seul l’admin peut assigner');
        return;
      }
      if (!transporteurId) {
        toast.error('⚠️ Sélectionnez un transporteur');
        return;
      }

      try {
        setLoading(true);
        const response = await api.patch(`/livraisons/${livraisonId}`, {
          transporteur: transporteurId,
        });
        setLivraisons((prev) => prev.map((l) => (l._id === livraisonId ? response.data : l)));
        toast.success('✅ Transporteur assigné');
        setShowAssignModal(false);
        setSelectedLivraison(null);
      } catch (error) {
        console.error('Erreur assignation:', error);
        toast.error(error.response?.data?.message || '❌ Erreur assignation');
      } finally {
        setLoading(false);
      }
    },
    [canAssignTransporteur, api]
  );

  // ═══════════════════════════════════════════════════════════
  // 6. PDF EXPORT (correction ESLint : suppression de _error)
  // ═══════════════════════════════════════════════════════════
  const downloadBonLivraison = useCallback(
    async (livraisonId, numeroLivraison) => {
      if (!canEdit) {
        toast.error('❌ Accès refusé');
        return;
      }

      try {
        setPdfLoading(livraisonId);
        const livraison = livraisons.find((l) => l._id === livraisonId);
        if (!livraison || !livraison.commande) {
          toast.error('❌ Livraison ou commande non trouvée');
          return;
        }

        const doc = new jsPDF();
        const marginX = 20;
        let y = 20;

        // Titre
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(26, 60, 94);
        doc.text('BON DE LIVRAISON', doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });

        y += 10;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(numeroLivraison, doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });

        y += 15;
        doc.setDrawColor(200, 200, 200);
        doc.line(marginX, y, doc.internal.pageSize.getWidth() - marginX, y);
        y += 10;

        // Informations livraison
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(26, 60, 94);
        doc.text('INFORMATIONS LIVRAISON', marginX, y);

        y += 7;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);

        const infoLivraison = [
          ['Numéro livraison', livraison.numeroLivraison || 'N/A'],
          ['Commande', livraison.commande?.numeroCommande || 'N/A'],
          ['Date création', new Date(livraison.dateCreation).toLocaleDateString('fr-FR')],
          ['Statut', livraison.etat || 'En attente'],
          ['Transporteur', livraison.transporteur?.raisonSociale || livraison.transporteur?.nom || 'Non assigné'],
        ];

        autoTable(doc, {
          startY: y,
          head: [['Information', 'Valeur']],
          body: infoLivraison,
          theme: 'striped',
          headStyles: { fillColor: [26, 60, 94], textColor: [255, 255, 255], fontSize: 10, fontStyle: 'bold' },
          bodyStyles: { fontSize: 9 },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 }, 1: { cellWidth: 120 } },
          margin: { left: marginX, right: marginX },
        });

        y = doc.lastAutoTable.finalY + 10;

        // Détails commande
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(26, 60, 94);
        doc.text('DÉTAILS DE LA COMMANDE', marginX, y);

        y += 7;

        const clientNom =
          livraison.commande.client?.raisonSociale ||
          livraison.commande.fournisseur?.raisonSociale ||
          livraison.commande.importateur?.raisonSociale ||
          'N/A';

        const infoCommande = [
          ['Client / Partenaire', clientNom],
          ['Montant', `${(livraison.commande.montantTotal || 0).toLocaleString()} ${livraison.commande.devise || 'TND'}`],
          ['Date commande', new Date(livraison.commande.dateCreation).toLocaleDateString('fr-FR')],
        ];

        autoTable(doc, {
          startY: y,
          head: [['Information', 'Valeur']],
          body: infoCommande,
          theme: 'striped',
          headStyles: { fillColor: [26, 60, 94], textColor: [255, 255, 255], fontSize: 10, fontStyle: 'bold' },
          bodyStyles: { fontSize: 9 },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 }, 1: { cellWidth: 120 } },
          margin: { left: marginX, right: marginX },
        });

        y = doc.lastAutoTable.finalY + 10;

        // Produits
        if (livraison.commande?.produits?.length > 0) {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(26, 60, 94);
          doc.text('PRODUITS LIVRÉS', marginX, y);

          y += 7;

          const produitsData = livraison.commande.produits.map((p, i) => [
            i + 1,
            p.nom || 'Produit',
            `${p.quantite || 0} ${p.uniteMesure || ''}`,
            `${(p.prixUnitaire || 0).toLocaleString()}`,
            `${((p.quantite || 0) * (p.prixUnitaire || 0)).toLocaleString()}`,
          ]);

          autoTable(doc, {
            startY: y,
            head: [['#', 'Produit', 'Quantité', 'Prix unitaire', 'Total']],
            body: produitsData,
            theme: 'striped',
            headStyles: { fillColor: [26, 60, 94], textColor: [255, 255, 255], fontSize: 10, fontStyle: 'bold' },
            bodyStyles: { fontSize: 9 },
            columnStyles: {
              0: { cellWidth: 10, halign: 'center' },
              1: { cellWidth: 60 },
              2: { cellWidth: 30, halign: 'center' },
              3: { cellWidth: 35, halign: 'right' },
              4: { cellWidth: 35, halign: 'right' },
            },
            margin: { left: marginX, right: marginX },
          });
        }

        // Pied de page
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Généré le ${new Date().toLocaleString('fr-FR')}`,
          marginX,
          doc.internal.pageSize.getHeight() - 10
        );
        doc.text(
          `Bon de livraison ${livraison.numeroLivraison}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );

        const fileName = `Bon_Livraison_${livraison.numeroLivraison}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        toast.success('📄 PDF téléchargé');
      } catch (err) {  // ✅ Correction ESLint : 'err' utilisé (remplace '_error')
        console.error('Erreur PDF:', err);
        toast.error('❌ Erreur lors de la génération du PDF');
      } finally {
        setPdfLoading(null);
      }
    },
    [canEdit, livraisons]
  );

  // ═══════════════════════════════════════════════════════════
  // 7. HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════
  const getTransporteurNom = useCallback((transporteur) => {
    if (!transporteur) return 'Non assigné';
    return transporteur.raisonSociale || transporteur.nom || 'Transporteur';
  }, []);

  const getEtatClass = useCallback((etat) => {
    const classes = {
      'À préparer': 'etat-preparer',
      'Prête': 'etat-prete',
      'En cours': 'etat-cours',
      'Livrée': 'etat-livree',
      'Annulée': 'etat-annulee',
    };
    return classes[etat] || '';
  }, []);

  const getEtatIcon = useCallback((etat) => {
    const icons = {
      'À préparer': '⏳',
      'Prête': '✅',
      'En cours': '🚚',
      'Livrée': '📦',
      'Annulée': '❌',
    };
    return icons[etat] || '📄';
  }, []);

  const getEtatsPossibles = useCallback((etatActuel) => {
    const etats = {
      'À préparer': ['Prête', 'Annulée'],
      'Prête': ['En cours', 'Annulée'],
      'En cours': ['Livrée', 'Annulée'],
    };
    return etats[etatActuel] || [];
  }, []);

  // ═══════════════════════════════════════════════════════════
  // 8. FILTERING & STATS
  // ═══════════════════════════════════════════════════════════
  const filteredLivraisons = useMemo(() => {
    return livraisons.filter((l) => {
      // Filtrer par rôle:
      // - Admin/Commercial: voient TOUTES les livraisons
      // - Fournisseur: voit ses livraisons (commandes où il est partenaire/fournisseur)
      // - Client: voit ses livraisons (commandes où il est partenaire/client)
      // - Transporteur: voit les livraisons qui lui sont assignées
      const cmd = l.commande || {};
      const partenaire = cmd.partenaire || cmd.client || {};
      const partenaireId = partenaire?._id || partenaire;
      const partenaireName = (partenaire.raisonSociale || partenaire.nom || '').toUpperCase();
      const transpId = l.transporteur?._id || l.transporteur;

      const roleFilter = isAdmin || isCommercial ||
        (isFournisseur && (
          String(partenaireId) === String(userId) ||
          partenaire.type === 0 ||
          partenaire.role === 'Fournisseur' ||
          partenaireName.includes('STEG') ||
          partenaireName.includes('STIR')
        )) ||
        (isClient && (
          String(partenaireId) === String(userId) ||
          partenaire.type === 1 ||
          partenaire.role === 'Client'
        )) ||
        (isTransporteur && (
          String(transpId) === String(userId) ||
          ['Prête', 'En cours', 'À préparer'].includes(l.etat)
        ));

      if (!roleFilter) return false;

      const transporteurNom = getTransporteurNom(l.transporteur);
      const matchesSearch =
        l.numeroLivraison?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.commande?.numeroCommande?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transporteurNom.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEtat = !selectedEtat || l.etat === selectedEtat;
      return matchesSearch && matchesEtat;
    });
  }, [livraisons, searchTerm, selectedEtat, getTransporteurNom, isAdmin, isCommercial, isClient, isFournisseur, isTransporteur, userId]);

  const stats = useMemo(
    () => ({
      total: livraisons.length,
      aPreparer: livraisons.filter((l) => l.etat === 'À préparer').length,
      prete: livraisons.filter((l) => l.etat === 'Prête').length,
      enCours: livraisons.filter((l) => l.etat === 'En cours').length,
      livrees: livraisons.filter((l) => l.etat === 'Livrée').length,
    }),
    [livraisons]
  );

  // ═══════════════════════════════════════════════════════════
  // 9. EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════
  const handleCloseModal = useCallback(() => {
    if (!loading) {
      setShowModal(false);
      setSelectedCommande(null);
    }
  }, [loading]);

  const handleCloseAssignModal = useCallback(() => {
    if (!loading) {
      setShowAssignModal(false);
      setSelectedLivraison(null);
    }
  }, [loading]);

  // ═══════════════════════════════════════════════════════════
  // 10. ACCESS CONTROL
  // ═══════════════════════════════════════════════════════════
  if (!canView) {
    return (
      <div className="livraisons-page">
        <div className="empty-state" style={{ margin: '100px auto' }}>
          <h3>🔒 Accès refusé</h3>
          <p>Vous devez être connecté pour accéder aux livraisons.</p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 11. RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="livraisons-page">
      {/* Role Banner */}
      <div className="role-banner">
        {isAdmin ? '👤 Administrateur - Gestion complète + Signature livreurs' : 
         isCommercial ? '💼 Commercial - Gestion des livraisons' : '❓ Rôle inconnu'}
      </div>

      {/* Header */}
      <div className="livraisons-header">
        <div className="header-left">
          <h2>🚚 Gestion des Livraisons</h2>
          <p>Suivi complet des livraisons - Admin et Commercial voient TOUTES les livraisons</p>
        </div>

        <div className="livraisons-stats">
          <div className="stat-card">
            <div className="stat-number">{stats.total}</div>
            <div className="stat-label">Total</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.aPreparer}</div>
            <div className="stat-label">À préparer</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.prete}</div>
            <div className="stat-label">Prête</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.enCours}</div>
            <div className="stat-label">En cours</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.livrees}</div>
            <div className="stat-label">Livrées</div>
          </div>
        </div>

        {canCreate && (
          <button className="btn-nouveau" onClick={() => setShowModal(true)} disabled={loading}>
            + Nouvelle Livraison
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="filters-section">
        <input
          type="text"
          placeholder="🔍 Rechercher..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />

        <div className="etat-filter">
          <button className={`filter-btn ${!selectedEtat ? 'active' : ''}`} onClick={() => setSelectedEtat('')}>
            Tous ({stats.total})
          </button>
          <button className={`filter-btn ${selectedEtat === 'À préparer' ? 'active' : ''}`} onClick={() => setSelectedEtat('À préparer')}>
            ⏳ À préparer ({stats.aPreparer})
          </button>
          <button className={`filter-btn ${selectedEtat === 'Prête' ? 'active' : ''}`} onClick={() => setSelectedEtat('Prête')}>
            ✅ Prête ({stats.prete})
          </button>
          <button className={`filter-btn ${selectedEtat === 'En cours' ? 'active' : ''}`} onClick={() => setSelectedEtat('En cours')}>
            🚚 En cours ({stats.enCours})
          </button>
          <button className={`filter-btn ${selectedEtat === 'Livrée' ? 'active' : ''}`} onClick={() => setSelectedEtat('Livrée')}>
            📦 Livrée ({stats.livrees})
          </button>
        </div>
      </div>

      {/* Content */}
      {loading && !filteredLivraisons.length ? (
        <div className="empty-state">
          <div className="loading-spinner">
            <div className="spinner" />
          </div>
          <p>Chargement des livraisons...</p>
        </div>
      ) : filteredLivraisons.length === 0 ? (
        <div className="empty-state">
          <h3>🚚 Aucune livraison</h3>
          <p>{searchTerm || selectedEtat ? 'Aucune livraison ne correspond' : 'Créez votre première livraison'}</p>
          {canCreate && !searchTerm && !selectedEtat && (
            <button className="btn-add-first" onClick={() => setShowModal(true)}>
              + Créer une livraison
            </button>
          )}
        </div>
      ) : (
        <div className="livraisons-grid">
          {filteredLivraisons.map((livraison) => {
            const etatClass = getEtatClass(livraison.etat);
            return (
              <div key={livraison._id} className="livraison-card">
                <div className={`livraison-header ${etatClass}`}>
                  <div className="header-info">
                    <span className="livraison-num">{livraison.numeroLivraison}</span>
                    <span className="commande-ref">Commande: {livraison.commande?.numeroCommande || 'N/A'}</span>
                  </div>
                  <div className={`livraison-etat ${etatClass}`}>
                    {getEtatIcon(livraison.etat)} {livraison.etat}
                  </div>
                </div>

                <div className="livraison-body">
                  <div className="info-row">
                    <span className="info-label">Transporteur:</span>
                    <span className="info-value">{getTransporteurNom(livraison.transporteur)}</span>
                  </div>

                  {canAssignTransporteur && (
                    <div className="info-row">
                      <span className="info-label">Action:</span>
                      <button
                        className="btn-assign"
                        onClick={() => {
                          setSelectedLivraison(livraison);
                          setShowAssignModal(true);
                        }}
                      >
                        {!livraison.transporteur ? '✍️ Signer livreur' : '🔄 Changer'}
                      </button>
                    </div>
                  )}

                  <div className="info-row">
                    <span className="info-label">Date:</span>
                    <span className="info-value">{new Date(livraison.dateCreation).toLocaleDateString('fr-FR')}</span>
                  </div>

                  {livraison.commentaire && (
                    <div className="info-row">
                      <span className="info-label">Commentaire:</span>
                      <span className="info-value commentaire">{livraison.commentaire}</span>
                    </div>
                  )}
                </div>

                <div className="livraison-actions">
                  {canEdit && (
                    <>
                      <button
                        className="btn-pdf"
                        onClick={() => downloadBonLivraison(livraison._id, livraison.numeroLivraison)}
                        disabled={pdfLoading === livraison._id}
                      >
                        {pdfLoading === livraison._id ? '⏳' : '📄'} PDF
                      </button>

                      {getEtatsPossibles(livraison.etat).map((etat) => (
                        <button
                          key={etat}
                          className={`btn-etat ${etat === 'Annulée' ? 'btn-danger' : ''}`}
                          onClick={() => updateEtat(livraison._id, etat)}
                          disabled={loading}
                        >
                          {etat === 'Prête' && '✅ Prête'}
                          {etat === 'En cours' && '🚚 Cours'}
                          {etat === 'Livrée' && '📦 Livrée'}
                          {etat === 'Annulée' && '❌ Annuler'}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Création */}
      {canCreate && showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📝 Nouvelle Livraison</h3>
              <button className="modal-close" onClick={handleCloseModal}>×</button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Commande validée *</label>
                <select
                  value={selectedCommande?._id || ''}
                  onChange={(e) => {
                    const cmd = commandes.find((c) => c._id === e.target.value);
                    setSelectedCommande(cmd);
                  }}
                >
                  <option value="">-- Sélectionner --</option>
                  {commandes.map((cmd) => (
                    <option key={cmd._id} value={cmd._id}>
                      {cmd.numeroCommande} - {(cmd.montantTotal || 0).toLocaleString()} {cmd.devise || 'TND'}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCommande && (
                <div className="selected-commande-info">
                  <h4>Détails</h4>
                  <p>
                    <strong>Partenaire:</strong> {selectedCommande.client?.raisonSociale || selectedCommande.fournisseur?.raisonSociale || selectedCommande.importateur?.raisonSociale || 'N/A'}
                  </p>
                  <p>
                    <strong>Montant:</strong> {(selectedCommande.montantTotal || 0).toLocaleString()} {selectedCommande.devise || 'TND'}
                  </p>
                  <p>
                    <strong>Date:</strong> {new Date(selectedCommande.dateCreation).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              )}
            </div>

            <div className="modal-buttons">
              <button className="btn-secondary" onClick={handleCloseModal} disabled={loading}>
                Annuler
              </button>
              <button className="btn-primary" onClick={createLivraison} disabled={loading}>
                {loading ? '⏳' : '✅'} Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Assignation Transporteur */}
      {canAssignTransporteur && showAssignModal && selectedLivraison && (
        <div className="modal-overlay" onClick={handleCloseAssignModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✍️ Signer un livreur</h3>
              <button className="modal-close" onClick={handleCloseAssignModal}>×</button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Transporteur *</label>
                <select id="transporteurSelect" defaultValue="">
                  <option value="">-- Sélectionner --</option>
                  {transporteurs.map((t) => (
                    <option key={t._id} value={t._id}>
                      {getTransporteurNom(t)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="info-box">
                <p><strong>Livraison:</strong> {selectedLivraison.numeroLivraison}</p>
                <p><strong>Commande:</strong> {selectedLivraison.commande?.numeroCommande || 'N/A'}</p>
                <p><strong>Statut:</strong> {selectedLivraison.etat}</p>
              </div>
            </div>

            <div className="modal-buttons">
              <button className="btn-secondary" onClick={handleCloseAssignModal} disabled={loading}>
                Annuler
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  const select = document.getElementById('transporteurSelect');
                  const transporteurId = select.value;
                  if (transporteurId) {
                    assignTransporteur(selectedLivraison._id, transporteurId);
                  } else {
                    toast.error('⚠️ Sélectionnez un transporteur');
                  }
                }}
                disabled={loading}
              >
                {loading ? '⏳' : '✅'} Signer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Livraisons;