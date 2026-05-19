import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTruck, faCheckCircle, faPlay, faSync, faBuilding, faUser, faBox, faCalendar, faMapMarkerAlt, faPhone, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import '../../css/TransporteurLivraisons.css';

// ==================== DONNÉES MOCKÉES ====================
const MOCK_LIVRAISONS = [
  {
    _id: 'liv1',
    numeroLivraison: 'LIV-2024-0001',
    commande: { 
      _id: 'cmd1', 
      numeroCommande: 'CMD-2024-0001',
      client: { 
        nom: 'STEG Tunis', 
        type: 'client',
        adresse: 'Rue des Énergies, Tunis',
        telephone: '71 123 456',
        email: 'contact@steg.tn'
      }
    },
    transporteur: { _id: 't1', nom: 'TransExpress Tunisie' },
    etat: 'Prête',
    dateCreation: '2024-05-10T08:00:00Z',
    dateArriveePrevue: '2024-05-15T18:00:00Z',
    produits: [
      { nom: 'Gasoil Premium', quantite: 5000, unite: 'L' },
      { nom: 'Essence Sans Plomb', quantite: 3000, unite: 'L' }
    ],
    origine: 'Dépôt Rades',
    destination: 'Dépôt STEG Tunis'
  },
  {
    _id: 'liv2',
    numeroLivraison: 'LIV-2024-0002',
    commande: { 
      _id: 'cmd2', 
      numeroCommande: 'CMD-2024-0002',
      fournisseur: { 
        nom: 'STIR Bizerte', 
        type: 'fournisseur',
        adresse: 'Zone Industrielle, Bizerte',
        telephone: '72 987 654',
        email: 'contact@stir.tn'
      }
    },
    transporteur: { _id: 't1', nom: 'TransExpress Tunisie' },
    etat: 'En cours',
    dateCreation: '2024-05-12T10:30:00Z',
    dateArriveePrevue: '2024-05-18T14:00:00Z',
    dateLivraisonReelle: null,
    produits: [
      { nom: 'Fuel Lourd', quantite: 10000, unite: 'L' },
      { nom: 'Gasoil Maritime', quantite: 7500, unite: 'L' }
    ],
    origine: 'Dépôt STIR Bizerte',
    destination: 'Dépôt Rades'
  },
  {
    _id: 'liv3',
    numeroLivraison: 'LIV-2024-0003',
    commande: { 
      _id: 'cmd3', 
      numeroCommande: 'CMD-2024-0003',
      client: { 
        nom: 'STEG Sfax', 
        type: 'client',
        adresse: 'Route de la Pétrolière, Sfax',
        telephone: '74 456 789',
        email: 'sfax@steg.tn'
      }
    },
    transporteur: { _id: 't2', nom: 'LogiTunis Transport' },
    etat: 'Livrée',
    dateCreation: '2024-05-08T09:15:00Z',
    dateArriveePrevue: '2024-05-12T16:00:00Z',
    dateLivraison: '2024-05-12T14:30:00Z',
    produits: [
      { nom: 'Gaz Naturel', quantite: 8000, unite: 'm³' }
    ],
    origine: 'Dépôt Rades',
    destination: 'Dépôt STEG Sfax'
  },
  {
    _id: 'liv4',
    numeroLivraison: 'LIV-2024-0004',
    commande: { 
      _id: 'cmd4', 
      numeroCommande: 'CMD-2024-0004',
      fournisseur: { 
        nom: 'Société Tunisienne de Navigation', 
        type: 'fournisseur',
        adresse: 'Port de la Goulette, Tunis',
        telephone: '71 555 777',
        email: 'contact@stn.tn'
      }
    },
    transporteur: { _id: 't2', nom: 'LogiTunis Transport' },
    etat: 'Prête',
    dateCreation: '2024-05-14T11:00:00Z',
    dateArriveePrevue: '2024-05-20T09:00:00Z',
    produits: [
      { nom: 'Gasoil Maritime', quantite: 15000, unite: 'L' },
      { nom: 'Lubrifiants', quantite: 2000, unite: 'L' }
    ],
    origine: 'Port de la Goulette',
    destination: 'Dépôt Rades'
  },
  {
    _id: 'liv5',
    numeroLivraison: 'LIV-2024-0005',
    commande: { 
      _id: 'cmd5', 
      numeroCommande: 'CMD-2024-0005',
      client: { 
        nom: 'STEG Sousse', 
        type: 'client',
        adresse: 'Zone Industrielle, Sousse',
        telephone: '73 234 567',
        email: 'sousse@steg.tn'
      }
    },
    transporteur: { _id: 't3', nom: 'Rapid Transport' },
    etat: 'En cours',
    dateCreation: '2024-05-13T14:20:00Z',
    dateArriveePrevue: '2024-05-19T11:00:00Z',
    dateLivraisonReelle: null,
    produits: [
      { nom: 'Essence Sans Plomb', quantite: 4500, unite: 'L' }
    ],
    origine: 'Dépôt Rades',
    destination: 'Dépôt STEG Sousse'
  },
  {
    _id: 'liv6',
    numeroLivraison: 'LIV-2024-0006',
    commande: { 
      _id: 'cmd6', 
      numeroCommande: 'CMD-2024-0006',
      fournisseur: { 
        nom: 'STIR Zarzis', 
        type: 'fournisseur',
        adresse: 'Port de Zarzis, Médenine',
        telephone: '75 888 999',
        email: 'zarzis@stir.tn'
      }
    },
    transporteur: { _id: 't3', nom: 'Rapid Transport' },
    etat: 'Livrée',
    dateCreation: '2024-05-09T07:45:00Z',
    dateArriveePrevue: '2024-05-14T20:00:00Z',
    dateLivraison: '2024-05-14T18:15:00Z',
    produits: [
      { nom: 'Gasoil Premium', quantite: 12000, unite: 'L' }
    ],
    origine: 'Port de Zarzis',
    destination: 'Dépôt Rades'
  },
  {
    _id: 'liv7',
    numeroLivraison: 'LIV-2024-0007',
    commande: { 
      _id: 'cmd7', 
      numeroCommande: 'CMD-2024-0007',
      client: { 
        nom: 'STEG Gabès', 
        type: 'client',
        adresse: 'Route de l\'Industrie, Gabès',
        telephone: '75 321 654',
        email: 'gabes@steg.tn'
      }
    },
    transporteur: { _id: 't1', nom: 'TransExpress Tunisie' },
    etat: 'Prête',
    dateCreation: '2024-05-15T09:30:00Z',
    dateArriveePrevue: '2024-05-22T15:00:00Z',
    produits: [
      { nom: 'Gaz Naturel', quantite: 6000, unite: 'm³' },
      { nom: 'Fuel Lourd', quantite: 5000, unite: 'L' }
    ],
    origine: 'Dépôt Rades',
    destination: 'Dépôt STEG Gabès'
  },
  {
    _id: 'liv8',
    numeroLivraison: 'LIV-2024-0008',
    commande: { 
      _id: 'cmd8', 
      numeroCommande: 'CMD-2024-0008',
      fournisseur: { 
        nom: 'Compagnie Tunisienne de Navigation', 
        type: 'fournisseur',
        adresse: 'Port de Sfax',
        telephone: '74 111 222',
        email: 'ctn@navigation.tn'
      }
    },
    transporteur: { _id: 't2', nom: 'LogiTunis Transport' },
    etat: 'En cours',
    dateCreation: '2024-05-14T16:45:00Z',
    dateArriveePrevue: '2024-05-21T10:00:00Z',
    dateLivraisonReelle: null,
    produits: [
      { nom: 'Gasoil Maritime', quantite: 20000, unite: 'L' }
    ],
    origine: 'Port de Sfax',
    destination: 'Dépôt Rades'
  }
];

function TransporteurLivraisons() {
  const [livraisons, setLivraisons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('prete');
  const [useMockData, setUseMockData] = useState(true);

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isTransporteur = user.role === 'Transporteur';

  const api = axios.create({
    baseURL: 'http://localhost:5001/api',
    headers: { Authorization: `Bearer ${token}` }
  });

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 5000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Charger les livraisons (API ou mock)
  const fetchMesLivraisons = async () => {
    try {
      setLoading(true);
      
      // Utiliser les données mockées
      if (useMockData) {
        setLivraisons(MOCK_LIVRAISONS);
        addToast('Mode démo - Données de test chargées', 'info');
        return;
      }
      
      // Appel API réel
      const res = await api.get('/livraisons');
      const userId = user._id;
      const mesLivraisons = res.data.filter(l => l.transporteur?._id === userId);
      setLivraisons(mesLivraisons);
      
    } catch (error) {
      console.error('Erreur chargement livraisons:', error);
      addToast('Erreur lors du chargement des livraisons', 'error');
      setLivraisons(MOCK_LIVRAISONS);
      setUseMockData(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isTransporteur) {
      addToast('Accès non autorisé', 'error');
      return;
    }
    fetchMesLivraisons();
  }, []);

  // Démarrer transport (Prête -> En cours)
  const demarrerTransport = async (livraisonId) => {
    try {
      setLoading(true);
      
      if (useMockData) {
        setLivraisons(prev => prev.map(l => 
          l._id === livraisonId ? { ...l, etat: 'En cours', dateLivraisonReelle: null } : l
        ));
        addToast('🚚 Transport démarré avec succès (mode démo)', 'success');
        return;
      }
      
      await api.patch(`/livraisons/${livraisonId}/etat`, { etat: 'En cours' });
      addToast('🚚 Transport démarré avec succès', 'success');
      fetchMesLivraisons();
    } catch (error) {
      addToast(error.response?.data?.message || 'Erreur lors du démarrage', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Terminer transport (En cours -> Livrée)
  const terminerTransport = async (livraisonId) => {
    try {
      setLoading(true);
      
      if (useMockData) {
        setLivraisons(prev => prev.map(l => 
          l._id === livraisonId ? { ...l, etat: 'Livrée', dateLivraison: new Date().toISOString(), dateLivraisonReelle: new Date().toISOString() } : l
        ));
        addToast('📦 Transport terminé avec succès (mode démo)', 'success');
        return;
      }
      
      await api.patch(`/livraisons/${livraisonId}/etat`, { etat: 'Livrée' });
      addToast('📦 Transport terminé avec succès', 'success');
      fetchMesLivraisons();
    } catch (error) {
      addToast(error.response?.data?.message || 'Erreur lors de la terminaison', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getPartenaireInfo = (livraison) => {
    const commande = livraison.commande || {};
    if (commande.client) {
      return {
        nom: commande.client.nom,
        type: 'client',
        icon: faUser,
        adresse: commande.client.adresse,
        telephone: commande.client.telephone,
        email: commande.client.email
      };
    }
    if (commande.fournisseur) {
      return {
        nom: commande.fournisseur.nom,
        type: 'fournisseur',
        icon: faBuilding,
        adresse: commande.fournisseur.adresse,
        telephone: commande.fournisseur.telephone,
        email: commande.fournisseur.email
      };
    }
    return {
      nom: 'Partenaire inconnu',
      type: 'inconnu',
      icon: faUser,
      adresse: 'Non spécifiée',
      telephone: 'Non spécifié',
      email: 'Non spécifié'
    };
  };

  const getTransporteurNom = (transporteur) => {
    if (!transporteur) return 'Non assigné';
    return transporteur.raisonSociale || transporteur.nom || transporteur.name || transporteur.email || 'Transporteur';
  };

  const getEtatIcon = (etat) => {
    switch(etat) {
      case 'Prête': return '✅';
      case 'En cours': return '🚚';
      case 'Livrée': return '📦';
      default: return '📄';
    }
  };

  // Filtrer les livraisons par recherche
  const filterBySearch = (livraisonsList) => {
    if (!searchTerm) return livraisonsList;
    return livraisonsList.filter(l => 
      l.numeroLivraison?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.commande?.numeroCommande?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getPartenaireInfo(l).nom.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Séparer les livraisons par état
  const livraisonsPrete = livraisons.filter(l => l.etat === 'Prête');
  const livraisonsEnCours = livraisons.filter(l => l.etat === 'En cours');
  const livraisonsLivree = livraisons.filter(l => l.etat === 'Livrée');

  const filteredPrete = filterBySearch(livraisonsPrete);
  const filteredEnCours = filterBySearch(livraisonsEnCours);
  const filteredLivree = filterBySearch(livraisonsLivree);

  const stats = {
    prete: livraisonsPrete.length,
    enCours: livraisonsEnCours.length,
    livree: livraisonsLivree.length,
    total: livraisons.length
  };

  // Composant pour afficher une livraison
  const LivraisonCard = ({ livraison, type }) => {
    const partenaire = getPartenaireInfo(livraison);
    
    return (
      <div className={`livraison-card ${type}-card`}>
        <div className="card-header">
          <div>
            <span className="livraison-num">{livraison.numeroLivraison}</span>
            <span className="commande-ref">Commande: {livraison.commande?.numeroCommande}</span>
          </div>
          <span className={`etat-badge ${type}`}>
            {getEtatIcon(livraison.etat)} {livraison.etat === 'Prête' ? 'À démarrer' : livraison.etat === 'En cours' ? 'En cours' : 'Terminée'}
          </span>
        </div>

        <div className="card-body">
          {/* Partenaire (Client/Fournisseur) */}
          <div className="info-group">
            <div className="info-group-header">
              <FontAwesomeIcon icon={partenaire.icon} /> {partenaire.type === 'client' ? 'Client' : 'Fournisseur'}
            </div>
            <div className="info-row">
              <span className="label">Nom:</span>
              <span className="value">{partenaire.nom}</span>
            </div>
            <div className="info-row">
              <span className="label">Adresse:</span>
              <span className="value"><FontAwesomeIcon icon={faMapMarkerAlt} /> {partenaire.adresse}</span>
            </div>
            <div className="info-row">
              <span className="label">Téléphone:</span>
              <span className="value"><FontAwesomeIcon icon={faPhone} /> {partenaire.telephone}</span>
            </div>
            <div className="info-row">
              <span className="label">Email:</span>
              <span className="value"><FontAwesomeIcon icon={faEnvelope} /> {partenaire.email}</span>
            </div>
          </div>

          {/* Produits */}
          <div className="info-group">
            <div className="info-group-header">
              <FontAwesomeIcon icon={faBox} /> Produits à livrer
            </div>
            {livraison.produits?.map((p, idx) => (
              <div key={idx} className="produit-row">
                <span className="produit-nom">{p.nom}</span>
                <span className="produit-quantite">{p.quantite.toLocaleString()} {p.unite}</span>
              </div>
            ))}
          </div>

          {/* Origine / Destination */}
          <div className="info-row">
            <span className="label">Origine:</span>
            <span className="value"><FontAwesomeIcon icon={faMapMarkerAlt} /> {livraison.origine || 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="label">Destination:</span>
            <span className="value"><FontAwesomeIcon icon={faMapMarkerAlt} /> {livraison.destination || 'N/A'}</span>
          </div>

          {/* Dates */}
          <div className="info-row">
            <span className="label">Date création:</span>
            <span className="value"><FontAwesomeIcon icon={faCalendar} /> {new Date(livraison.dateCreation).toLocaleDateString()}</span>
          </div>
          {livraison.dateArriveePrevue && (
            <div className="info-row">
              <span className="label">Arrivée prévue:</span>
              <span className="value"><FontAwesomeIcon icon={faCalendar} /> {new Date(livraison.dateArriveePrevue).toLocaleDateString()}</span>
            </div>
          )}
          {livraison.dateLivraison && (
            <div className="info-row">
              <span className="label">Date livraison:</span>
              <span className="value success"><FontAwesomeIcon icon={faCheckCircle} /> {new Date(livraison.dateLivraison).toLocaleDateString()}</span>
            </div>
          )}

          {/* Transporteur */}
          <div className="info-row">
            <span className="label">Transporteur:</span>
            <span className="value"><FontAwesomeIcon icon={faTruck} /> {getTransporteurNom(livraison.transporteur)}</span>
          </div>
        </div>

        <div className="card-actions">
          {livraison.etat === 'Prête' && (
            <button className="btn-start" onClick={() => demarrerTransport(livraison._id)} disabled={loading}>
              <FontAwesomeIcon icon={faPlay} /> Démarrer la livraison
            </button>
          )}
          {livraison.etat === 'En cours' && (
            <button className="btn-end" onClick={() => terminerTransport(livraison._id)} disabled={loading}>
              <FontAwesomeIcon icon={faCheckCircle} /> Terminer la livraison
            </button>
          )}
          {livraison.etat === 'Livrée' && (
            <span className="completed-badge">
              <FontAwesomeIcon icon={faCheckCircle} /> Livraison terminée
            </span>
          )}
        </div>
      </div>
    );
  };

  // Rendu du contenu par onglet
  const renderContent = () => {
    if (activeTab === 'prete') {
      if (filteredPrete.length === 0) {
        return (
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <h4>Aucune livraison à démarrer</h4>
            <p>Toutes vos livraisons sont en cours ou terminées</p>
          </div>
        );
      }
      return (
        <div className="livraisons-grid">
          {filteredPrete.map(livraison => (
            <LivraisonCard key={livraison._id} livraison={livraison} type="prete" />
          ))}
        </div>
      );
    }

    if (activeTab === 'encours') {
      if (filteredEnCours.length === 0) {
        return (
          <div className="empty-state">
            <div className="empty-icon">🚚</div>
            <h4>Aucune livraison en cours</h4>
            <p>Vous n'avez aucune livraison en cours pour le moment</p>
          </div>
        );
      }
      return (
        <div className="livraisons-grid">
          {filteredEnCours.map(livraison => (
            <LivraisonCard key={livraison._id} livraison={livraison} type="encours" />
          ))}
        </div>
      );
    }

    if (activeTab === 'livree') {
      if (filteredLivree.length === 0) {
        return (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h4>Aucune livraison terminée</h4>
            <p>Les livraisons terminées apparaîtront ici</p>
          </div>
        );
      }
      return (
        <div className="livraisons-grid">
          {filteredLivree.map(livraison => (
            <LivraisonCard key={livraison._id} livraison={livraison} type="livree" />
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="transporteur-container">
      {/* Banner mode démo */}
      {useMockData && (
        <div className="demo-banner">
          🔧 Mode démonstration - Données fictives de test (clients STEG / fournisseurs STIR)
        </div>
      )}

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <div className="toast-content">
              {toast.type === 'success' && <span className="toast-icon">✓</span>}
              {toast.type === 'error' && <span className="toast-icon">✗</span>}
              {toast.type === 'info' && <span className="toast-icon">ℹ</span>}
              <span className="toast-message">{toast.message}</span>
            </div>
            <button className="toast-close" onClick={() => removeToast(toast.id)}>×</button>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="transporteur-header">
        <div className="header-left">
          <h2>
            <FontAwesomeIcon icon={faTruck} /> Mes Livraisons
          </h2>
          <p>Gérez vos livraisons pour les clients STEG et fournisseurs STIR</p>
        </div>
        <div className="stats-cards">
          <div className="stat-card prete">
            <div className="stat-number">{stats.prete}</div>
            <div className="stat-label">À démarrer</div>
          </div>
          <div className="stat-card encours">
            <div className="stat-number">{stats.enCours}</div>
            <div className="stat-label">En cours</div>
          </div>
          <div className="stat-card livree">
            <div className="stat-number">{stats.livree}</div>
            <div className="stat-label">Terminées</div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-section">
        <input
          type="text"
          placeholder="🔍 Rechercher par numéro de livraison, commande, client ou fournisseur..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'prete' ? 'active' : ''}`}
          onClick={() => setActiveTab('prete')}
        >
          <FontAwesomeIcon icon={faPlay} /> À démarrer ({filteredPrete.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'encours' ? 'active' : ''}`}
          onClick={() => setActiveTab('encours')}
        >
          <FontAwesomeIcon icon={faSync} /> En cours ({filteredEnCours.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'livree' ? 'active' : ''}`}
          onClick={() => setActiveTab('livree')}
        >
          <FontAwesomeIcon icon={faCheckCircle} /> Terminées ({filteredLivree.length})
        </button>
      </div>

      {/* Loading Spinner */}
      {loading && (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Chargement des livraisons...</p>
        </div>
      )}

      {/* Content */}
      {!loading && renderContent()}
    </div>
  );
}

export default TransporteurLivraisons;