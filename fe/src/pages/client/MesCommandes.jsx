import React, { useState } from 'react';
import '../../css/MesCommandes.css';

const mockCommandes = [
  {
    _id: 'CMD001',
    numeroCommande: 'CMD-2026-0001',
    dateCreation: '2026-05-10',
    dateLivraison: '2026-05-12',
    statut: 'Livrée',
    montantTotal: 320,
    fournisseur: 'STEG',
    produits: [
      {
        id: 'P1',
        nom: 'Électricité Basse Tension',
        quantite: 1000,
        uniteMesure: 'kWh',
        prixUnitaire: 0.320
      }
    ]
  },
  {
    _id: 'CMD002',
    numeroCommande: 'CMD-2026-0002',
    dateCreation: '2026-05-11',
    statut: 'En attente',
    montantTotal: 150,
    fournisseur: 'STEG',
    produits: [
      {
        id: 'P2',
        nom: 'Gaz Naturel Domestique',
        quantite: 500,
        uniteMesure: 'm³',
        prixUnitaire: 0.280
      }
    ]
  },
  {
    _id: 'CMD003',
    numeroCommande: 'CMD-2026-0003',
    dateCreation: '2026-05-09',
    dateLivraison: '2026-05-11',
    statut: 'Livrée',
    montantTotal: 875.75,
    fournisseur: 'STEG',
    produits: [
      {
        id: 'P4',
        nom: 'Transformateur Électrique',
        quantite: 1,
        uniteMesure: 'Unité',
        prixUnitaire: 875.75
      }
    ]
  },
  {
    _id: 'CMD004',
    numeroCommande: 'CMD-2026-0004',
    dateCreation: '2026-05-12',
    statut: 'En cours',
    dateLivraisonPrevue: '2026-05-15',
    montantTotal: 425.30,
    fournisseur: 'STIR',
    produits: [
      {
        id: 'STIR_CARB_001',
        nom: 'Essence Sans Plomb 95',
        quantite: 100,
        uniteMesure: 'Litre',
        prixUnitaire: 2.500
      },
      {
        id: 'STIR_LUB_001',
        nom: 'Huile Moteur 10W40',
        quantite: 10,
        uniteMesure: 'Litre',
        prixUnitaire: 15.000
      }
    ]
  }
];

// Produits STEG (Société Tunisienne de l'Électricité et du Gaz)
const produitsSTEG = [
  // Électricité
  { id: 'STEG_ELEC_001', nom: 'Électricité Basse Tension (230V)', prixUnitaire: 0.320, uniteMesure: 'kWh', type: 'électricité', fournisseur: 'STEG', categorie: 'Électricité' },
  { id: 'STEG_ELEC_002', nom: 'Électricité Haute Tension (150kV)', prixUnitaire: 0.450, uniteMesure: 'kWh', type: 'électricité', fournisseur: 'STEG', categorie: 'Électricité' },
  { id: 'STEG_ELEC_003', nom: 'Électricité Très Haute Tension (90kV)', prixUnitaire: 0.380, uniteMesure: 'kWh', type: 'électricité', fournisseur: 'STEG', categorie: 'Électricité' },
  
  // Gaz Naturel
  { id: 'STEG_GAZ_001', nom: 'Gaz Naturel Domestique', prixUnitaire: 0.280, uniteMesure: 'm³', type: 'gaz', fournisseur: 'STEG', categorie: 'Gaz Naturel', source: 'SMART-TRADE 360°' },
  { id: 'STEG_GAZ_002', nom: 'Gaz Naturel Industriel', prixUnitaire: 0.350, uniteMesure: 'm³', type: 'gaz', fournisseur: 'STEG', categorie: 'Gaz Naturel', source: 'SMART-TRADE 360°' },
  
  // GPL
  { id: 'STEG_GPL_001', nom: 'Propane (Bouteille 13kg)', prixUnitaire: 8.500, uniteMesure: 'Bouteille', type: 'gpl', fournisseur: 'STEG', categorie: 'GPL' },
  { id: 'STEG_GPL_002', nom: 'Butane (Bouteille 6kg)', prixUnitaire: 4.200, uniteMesure: 'Bouteille', type: 'gpl', fournisseur: 'STEG', categorie: 'GPL' },
  { id: 'STEG_GPL_003', nom: 'GPL en vrac (Industriel)', prixUnitaire: 1.200, uniteMesure: 'kg', type: 'gpl', fournisseur: 'STEG', categorie: 'GPL' },
  
  // Équipements électriques
  { id: 'STEG_EQ_001', nom: 'Compteur Électrique Intelligent', prixUnitaire: 250, uniteMesure: 'Unité', type: 'équipement', fournisseur: 'STEG', categorie: 'Équipements' },
  { id: 'STEG_EQ_002', nom: 'Transformateur 100kVA', prixUnitaire: 875.750, uniteMesure: 'Unité', type: 'équipement', fournisseur: 'STEG', categorie: 'Équipements' },
  { id: 'STEG_EQ_003', nom: 'Câbles Électriques', prixUnitaire: 0.490, uniteMesure: 'mètres', type: 'équipement', fournisseur: 'STEG', categorie: 'Équipements' },
  { id: 'STEG_EQ_004', nom: 'Disjoncteur 100A', prixUnitaire: 12.500, uniteMesure: 'Unité', type: 'équipement', fournisseur: 'STEG', categorie: 'Équipements' },
  
  // Énergies renouvelables
  { id: 'STEG_REN_001', nom: 'Panneau Solaire 300W', prixUnitaire: 350, uniteMesure: 'Unité', type: 'renouvelable', fournisseur: 'STEG', categorie: 'Énergies Renouvelables' },
  { id: 'STEG_REN_002', nom: 'Kit Solaire Complet 5kW', prixUnitaire: 5500, uniteMesure: 'Kit', type: 'renouvelable', fournisseur: 'STEG', categorie: 'Énergies Renouvelables' },
  { id: 'STEG_REN_003', nom: 'Énergie Éolienne (parc)', prixUnitaire: 0.250, uniteMesure: 'kWh', type: 'renouvelable', fournisseur: 'STEG', categorie: 'Énergies Renouvelables' }
];

// Produits STIR (Société Tunisienne des Industries de Raffinage)
const produitsSTIR = [
  // Carburants
  { id: 'STIR_CARB_001', nom: 'Essence Sans Plomb 95', prixUnitaire: 2.500, uniteMesure: 'Litre', type: 'carburant', fournisseur: 'STIR', categorie: 'Carburants' },
  { id: 'STIR_CARB_002', nom: 'Essence Sans Plomb 98', prixUnitaire: 2.800, uniteMesure: 'Litre', type: 'carburant', fournisseur: 'STIR', categorie: 'Carburants' },
  { id: 'STIR_CARB_003', nom: 'Gasoil (Diesel) 50ppm', prixUnitaire: 2.200, uniteMesure: 'Litre', type: 'carburant', fournisseur: 'STIR', categorie: 'Carburants' },
  { id: 'STIR_CARB_004', nom: 'Gasoil (Diesel) 10ppm', prixUnitaire: 2.350, uniteMesure: 'Litre', type: 'carburant', fournisseur: 'STIR', categorie: 'Carburants' },
  { id: 'STIR_CARB_005', nom: 'Kérosène (Jet A1)', prixUnitaire: 1.900, uniteMesure: 'Litre', type: 'carburant', fournisseur: 'STIR', categorie: 'Carburants' },
  { id: 'STIR_CARB_006', nom: 'Fioul Lourd', prixUnitaire: 1.500, uniteMesure: 'Litre', type: 'carburant', fournisseur: 'STIR', categorie: 'Carburants' },
  
  // Lubrifiants
  { id: 'STIR_LUB_001', nom: 'Huile Moteur 10W40', prixUnitaire: 15.000, uniteMesure: 'Litre', type: 'lubrifiant', fournisseur: 'STIR', categorie: 'Lubrifiants' },
  { id: 'STIR_LUB_002', nom: 'Huile Industrielle', prixUnitaire: 12.500, uniteMesure: 'Litre', type: 'lubrifiant', fournisseur: 'STIR', categorie: 'Lubrifiants' },
  { id: 'STIR_LUB_003', nom: 'Graisse Lithium', prixUnitaire: 8.000, uniteMesure: 'kg', type: 'lubrifiant', fournisseur: 'STIR', categorie: 'Lubrifiants' },
  
  // Autres produits
  { id: 'STIR_AUT_001', nom: 'Bitume Routier', prixUnitaire: 0.800, uniteMesure: 'kg', type: 'matériau', fournisseur: 'STIR', categorie: 'Matériaux' },
  { id: 'STIR_AUT_002', nom: 'GPL Automobile', prixUnitaire: 1.100, uniteMesure: 'Litre', type: 'gpl', fournisseur: 'STIR', categorie: 'Carburants' }
];

function MesCommandes({ vue = 'toutes' }) {
  // vue peut être : 'toutes', 'historique', 'encours'
  const [commandes, setCommandes] = useState(mockCommandes);
  const [showModal, setShowModal] = useState(false);
  const [panier, setPanier] = useState([]);
  const [selectedProduits, setSelectedProduits] = useState({});
  const [fournisseurFiltre, setFournisseurFiltre] = useState('all');
  const [categorieFiltre, setCategorieFiltre] = useState('all');

  // Filtrer les commandes selon la vue
  const getCommandesFiltrees = () => {
    switch (vue) {
      case 'historique':
        return commandes.filter(c => c.statut === 'Livrée');
      case 'encours':
        return commandes.filter(c => c.statut === 'En attente' || c.statut === 'En cours');
      default:
        return commandes;
    }
  };

  const commandesFiltrees = getCommandesFiltrees();

  const getProduitsAffiches = () => {
    let produits = [];
    if (fournisseurFiltre === 'all' || fournisseurFiltre === 'STEG') {
      produits = [...produits, ...produitsSTEG];
    }
    if (fournisseurFiltre === 'all' || fournisseurFiltre === 'STIR') {
      produits = [...produits, ...produitsSTIR];
    }
    
    if (categorieFiltre !== 'all') {
      produits = produits.filter(p => p.categorie === categorieFiltre);
    }
    
    return produits;
  };

  const formatPrix = (prix) => {
    return new Intl.NumberFormat('fr-TN', {
      style: 'currency',
      currency: 'TND',
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }).format(prix);
  };

  const getStatusClass = (statut) => {
    switch (statut) {
      case 'Livrée':
        return 'status-livree';
      case 'En attente':
        return 'status-attente';
      case 'Validée':
        return 'status-validee';
      case 'En cours':
        return 'status-encours';
      default:
        return '';
    }
  };

  const getStatusIcon = (statut) => {
    switch (statut) {
      case 'Livrée':
        return '✅';
      case 'En attente':
        return '⏳';
      case 'Validée':
        return '✓';
      case 'En cours':
        return '🚚';
      default:
        return '📦';
    }
  };

  const getFournisseurIcon = (fournisseur) => {
    return fournisseur === 'STEG' ? '⚡' : '⛽';
  };

  const getProduitEmoji = (type) => {
    switch (type) {
      case 'électricité':
        return '⚡';
      case 'gaz':
        return '🔥';
      case 'gpl':
        return '🛢️';
      case 'carburant':
        return '⛽';
      case 'lubrifiant':
        return '🔧';
      case 'équipement':
        return '🔌';
      case 'renouvelable':
        return '☀️';
      case 'matériau':
        return '🧱';
      default:
        return '📦';
    }
  };

  const getCategorieIcon = (categorie) => {
    switch (categorie) {
      case 'Électricité':
        return '⚡';
      case 'Gaz Naturel':
        return '🔥';
      case 'GPL':
        return '🛢️';
      case 'Équipements':
        return '🔌';
      case 'Énergies Renouvelables':
        return '🌱';
      case 'Carburants':
        return '⛽';
      case 'Lubrifiants':
        return '🔧';
      case 'Matériaux':
        return '🏗️';
      default:
        return '📦';
    }
  };

  const handleQuantiteChange = (produitId, quantite) => {
    setSelectedProduits({
      ...selectedProduits,
      [produitId]: Math.max(0, parseFloat(quantite) || 0)
    });
  };

  const ajouterAuPanier = () => {
    const nouveauxProduits = [];
    
    Object.keys(selectedProduits).forEach(produitId => {
      const quantite = selectedProduits[produitId];
      if (quantite > 0) {
        const tousProduits = [...produitsSTEG, ...produitsSTIR];
        const produit = tousProduits.find(p => p.id === produitId);
        if (produit) {
          nouveauxProduits.push({
            id: produit.id,
            nom: produit.nom,
            quantite: quantite,
            uniteMesure: produit.uniteMesure,
            prixUnitaire: produit.prixUnitaire,
            fournisseur: produit.fournisseur,
            type: produit.type,
            categorie: produit.categorie,
            source: produit.source || null
          });
        }
      }
    });

    if (nouveauxProduits.length > 0) {
      setPanier(nouveauxProduits);
      setShowModal(true);
    } else {
      alert('Veuillez sélectionner au moins un produit');
    }
  };

  const validerCommande = () => {
    if (panier.length === 0) {
      alert('Votre panier est vide');
      return;
    }

    const montantTotal = panier.reduce((total, produit) => {
      return total + (produit.quantite * produit.prixUnitaire);
    }, 0);

    const fournisseur = panier[0].fournisseur;
    const tousMemeFournisseur = panier.every(p => p.fournisseur === fournisseur);

    if (!tousMemeFournisseur) {
      alert('Vous ne pouvez pas commander des produits STEG et STIR dans la même commande. Veuillez séparer vos commandes.');
      return;
    }

    const nouvelleCommande = {
      _id: `CMD${String(commandes.length + 1).padStart(3, '0')}`,
      numeroCommande: `CMD-2026-${String(commandes.length + 1).padStart(4, '0')}`,
      dateCreation: new Date().toISOString().split('T')[0],
      dateLivraisonPrevue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      statut: 'En attente',
      montantTotal: montantTotal,
      fournisseur: fournisseur,
      produits: panier
    };

    setCommandes([nouvelleCommande, ...commandes]);
    setShowModal(false);
    setPanier([]);
    setSelectedProduits({});
    
    alert(`Commande ${nouvelleCommande.numeroCommande} créée avec succès chez ${fournisseur} !`);
  };

  const annulerCommande = () => {
    setShowModal(false);
    setPanier([]);
    setSelectedProduits({});
  };

  const produitsAffiches = getProduitsAffiches();

  // Statistiques
  const stats = {
    total: commandes.length,
    livrees: commandes.filter(c => c.statut === 'Livrée').length,
    enAttente: commandes.filter(c => c.statut === 'En attente').length,
    enCours: commandes.filter(c => c.statut === 'En cours').length
  };

  // Catégories uniques pour les filtres
  const categoriesSTEG = [...new Set(produitsSTEG.map(p => p.categorie))];
  const categoriesSTIR = [...new Set(produitsSTIR.map(p => p.categorie))];
  const toutesCategories = [...new Set([...categoriesSTEG, ...categoriesSTIR])];

  // Titre selon la vue
  const getTitre = () => {
    switch (vue) {
      case 'historique':
        return { titre: '📜 Historique des commandes', sousTitre: 'Retrouvez toutes vos commandes déjà livrées' };
      case 'encours':
        return { titre: '🚚 Commandes en cours', sousTitre: 'Suivez l\'état d\'avancement de vos commandes' };
      default:
        return { titre: '📋 Mes Commandes', sousTitre: 'Commandez vos produits énergétiques : STEG et STIR' };
    }
  };

  const titre = getTitre();

  return (
    <div className="mes-commandes-page">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h1>{titre.titre}</h1>
            <p>{titre.sousTitre}</p>
          </div>
          {vue !== 'historique' && (
            <button className="nouvelle-commande-btn" onClick={ajouterAuPanier}>
              ➕ Valider le panier
            </button>
          )}
        </div>
      </div>

      {/* Statistiques (uniquement pour vue toutes) */}
      {vue === 'toutes' && (
        <div className="stats-container">
          <div className="stat-card">
            <div className="stat-number">{stats.total}</div>
            <div className="stat-label">Total commandes</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.livrees}</div>
            <div className="stat-label">Livrées ✅</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.enCours}</div>
            <div className="stat-label">En cours 🚚</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.enAttente}</div>
            <div className="stat-label">En attente ⏳</div>
          </div>
        </div>
      )}

      {/* Avertissement pour historique vide */}
      {commandesFiltrees.length === 0 && vue === 'historique' && (
        <div className="empty-historique">
          <div className="empty-icon">📭</div>
          <h3>Aucune commande dans l'historique</h3>
          <p>Vous n'avez pas encore reçu de commandes livrées</p>
        </div>
      )}

      {commandesFiltrees.length === 0 && vue === 'encours' && (
        <div className="empty-encours">
          <div className="empty-icon">🚀</div>
          <h3>Aucune commande en cours</h3>
          <p>Passez une nouvelle commande pour commencer</p>
        </div>
      )}

      {/* Chaîne énergétique tunisienne (uniquement pour vue toutes) */}
      {vue === 'toutes' && (
        <div className="chaine-energetique">
          <div className="chaine-container">
            <div className="chaine-item SMART-TRADE 360°">
              <span className="chaine-icon">🛢️</span>
              <h4>SMART-TRADE 360°</h4>
              <p>Production pétrole & gaz</p>
            </div>
            <div className="chaine-fleche">→</div>
            <div className="chaine-item stir">
              <span className="chaine-icon">⛽</span>
              <h4>STIR</h4>
              <p>Raffinage carburants</p>
            </div>
            <div className="chaine-fleche">→</div>
            <div className="chaine-item steg">
              <span className="chaine-icon">⚡</span>
              <h4>STEG</h4>
              <p>Électricité & Gaz</p>
            </div>
            <div className="chaine-fleche">→</div>
            <div className="chaine-item consommateur">
              <span className="chaine-icon">🏠</span>
              <h4>Consommateurs</h4>
              <p>Ménages & Industries</p>
            </div>
          </div>
        </div>
      )}

      {/* Section de sélection des produits (uniquement pour vue toutes) */}
      {vue === 'toutes' && (
        <>
          <div className="filtres-section">
            <div className="filtre-group">
              <label>Fournisseur :</label>
              <div className="filtre-buttons">
                <button 
                  className={`filtre-btn ${fournisseurFiltre === 'all' ? 'active' : ''}`}
                  onClick={() => setFournisseurFiltre('all')}
                >
                  Tous
                </button>
                <button 
                  className={`filtre-btn steg-btn ${fournisseurFiltre === 'STEG' ? 'active' : ''}`}
                  onClick={() => setFournisseurFiltre('STEG')}
                >
                  ⚡ STEG
                </button>
                <button 
                  className={`filtre-btn stir-btn ${fournisseurFiltre === 'STIR' ? 'active' : ''}`}
                  onClick={() => setFournisseurFiltre('STIR')}
                >
                  ⛽ STIR
                </button>
              </div>
            </div>

            <div className="filtre-group">
              <label>Catégorie :</label>
              <div className="filtre-buttons scrollable">
                <button 
                  className={`filtre-btn ${categorieFiltre === 'all' ? 'active' : ''}`}
                  onClick={() => setCategorieFiltre('all')}
                >
                  Toutes
                </button>
                {toutesCategories.map(cat => (
                  <button 
                    key={cat}
                    className={`filtre-btn ${categorieFiltre === cat ? 'active' : ''}`}
                    onClick={() => setCategorieFiltre(cat)}
                  >
                    {getCategorieIcon(cat)} {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="catalogue-section">
            <h2>🛒 Produits disponibles</h2>
            <div className="catalogue-grid">
              {produitsAffiches.map(produit => (
                <div key={produit.id} className={`produit-card ${produit.fournisseur === 'STIR' ? 'stir-card' : ''}`}>
                  <div className="produit-card-header">
                    <span className="produit-emoji">
                      {getProduitEmoji(produit.type)}
                    </span>
                    <div>
                      <h4>{produit.nom}</h4>
                      <div className="produit-metadata">
                        <span className="fournisseur-badge">
                          {getFournisseurIcon(produit.fournisseur)} {produit.fournisseur}
                        </span>
                        {produit.source && (
                          <span className="source-badge">
                            Source: {produit.source}
                          </span>
                        )}
                        <span className="categorie-badge">
                          {getCategorieIcon(produit.categorie)} {produit.categorie}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="produit-card-body">
                    <p className="produit-prix">{formatPrix(produit.prixUnitaire)}</p>
                    <p className="produit-unite">par {produit.uniteMesure}</p>
                    <div className="quantite-control">
                      <input
                        type="number"
                        min="0"
                        step={produit.type === 'électricité' || produit.type === 'carburant' ? 10 : 1}
                        value={selectedProduits[produit.id] || ''}
                        onChange={(e) => handleQuantiteChange(produit.id, e.target.value)}
                        placeholder="Quantité"
                        className="quantite-input"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Liste des commandes */}
      <div className="commandes-section">
        <h2>
          {vue === 'historique' ? '📜 Commandes livrées' : 
           vue === 'encours' ? '🚚 Commandes actives' : 
           '📦 Toutes mes commandes'}
        </h2>
        {commandesFiltrees.length === 0 ? (
          <div className={`empty-commandes ${vue === 'historique' ? 'empty-historique-style' : ''}`}>
            <div className="empty-icon">📦</div>
            <h3>Aucune commande à afficher</h3>
            <p>{vue === 'historique' ? 'Aucune commande livrée pour le moment' : 'Commencez par passer une nouvelle commande'}</p>
          </div>
        ) : (
          <div className="commandes-container">
            {commandesFiltrees.map((commande) => (
              <div key={commande._id} className={`commande-card ${commande.fournisseur === 'STIR' ? 'stir-commande' : ''} ${commande.statut === 'Livrée' ? 'commande-livree' : ''}`}>
                <div className="commande-top">
                  <div>
                    <div className="commande-header-info">
                      <h3>{commande.numeroCommande}</h3>
                      <span className={`fournisseur-tag ${commande.fournisseur === 'STIR' ? 'stir-tag' : 'steg-tag'}`}>
                        {getFournisseurIcon(commande.fournisseur)} {commande.fournisseur}
                      </span>
                    </div>
                    <div className="commande-dates">
                      <span className="commande-date">
                        📅 Créée : {new Date(commande.dateCreation).toLocaleDateString('fr-FR')}
                      </span>
                      {commande.dateLivraison && (
                        <span className="commande-date livree">
                          ✅ Livrée : {new Date(commande.dateLivraison).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                      {commande.dateLivraisonPrevue && commande.statut !== 'Livrée' && (
                        <span className="commande-date prevue">
                          🗓️ Prévue : {new Date(commande.dateLivraisonPrevue).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`commande-status ${getStatusClass(commande.statut)}`}>
                    {getStatusIcon(commande.statut)} {commande.statut}
                  </div>
                </div>

                <div className="commande-products">
                  <div className="produit-header">
                    <span>Produit</span>
                    <span>Quantité</span>
                    <span>Prix unitaire</span>
                    <span>Total</span>
                  </div>
                  {commande.produits.map((produit, index) => (
                    <div key={index} className="produit-row">
                      <div className="produit-info">
                        {getProduitEmoji(produit.type)} {produit.nom}
                        {produit.source && (
                          <span className="produit-source"> (Source: {produit.source})</span>
                        )}
                      </div>
                      <div>
                        {produit.quantite} {produit.uniteMesure}
                      </div>
                      <div>
                        {formatPrix(produit.prixUnitaire)}
                      </div>
                      <div className="produit-total">
                        {formatPrix(produit.quantite * produit.prixUnitaire)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="commande-footer">
                  <div className="commande-total">
                    Total :
                    <strong>
                      {formatPrix(commande.montantTotal)}
                    </strong>
                  </div>
                  {commande.statut === 'En attente' && (
                    <button className="annuler-commande-btn" onClick={() => {
                      if (window.confirm('Voulez-vous vraiment annuler cette commande ?')) {
                        setCommandes(commandes.filter(c => c._id !== commande._id));
                      }
                    }}>
                      Annuler la commande
                    </button>
                  )}
                  {commande.statut === 'Livrée' && (
                    <button className="avis-btn" onClick={() => alert(`Laissez un avis sur la commande ${commande.numeroCommande}`)}>
                      ⭐ Donner mon avis
                    </button>
                  )}
                  {commande.statut === 'En cours' && (
                    <button className="suivre-btn" onClick={() => alert(`Suivi de la livraison ${commande.numeroCommande}`)}>
                      📍 Suivre la livraison
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de confirmation de commande */}
      {showModal && (
        <div className="modal-overlay" onClick={annulerCommande}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🛒 Confirmation de commande</h2>
              <button className="modal-close" onClick={annulerCommande}>✕</button>
            </div>
            <div className="modal-body">
              <h3>Récapitulatif de votre commande</h3>
              <div className="panier-fournisseur">
                Fournisseur : <strong>{panier[0]?.fournisseur === 'STEG' ? '⚡ STEG' : '⛽ STIR'}</strong>
              </div>
              <div className="panier-produits">
                {panier.map((produit, index) => (
                  <div key={index} className="panier-item">
                    <div className="panier-item-info">
                      <strong>{getProduitEmoji(produit.type)} {produit.nom}</strong>
                      <span>{produit.quantite} {produit.uniteMesure} × {formatPrix(produit.prixUnitaire)}</span>
                      {produit.source && <small>(Fourni par {produit.source})</small>}
                    </div>
                    <div className="panier-item-prix">
                      {formatPrix(produit.quantite * produit.prixUnitaire)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="panier-total">
                <strong>Total TTC :</strong>
                <strong className="total-montant">
                  {formatPrix(panier.reduce((total, p) => total + (p.quantite * p.prixUnitaire), 0))}
                </strong>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-annuler" onClick={annulerCommande}>
                Annuler
              </button>
              <button className="btn-valider" onClick={validerCommande}>
                Valider la commande
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MesCommandes;