// pages/admin/Commandes.jsx - PRODUCTION PROFESSIONNEL CORRIGÉ
import React, { useState, useMemo, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import '../css/Commandes.css';

function Commandes() {
  // ═══════════════════════════════════════════════════════════
  // 1. MOCK DATA
  // ═══════════════════════════════════════════════════════════

  const tiers = [
    // CLIENTS (type: 0)
    { _id: '1', raisonSociale: 'STEG', type: 0, code: 'STEG001', adresse: 'Tunis, Tunisie', matriculeFiscale: '1234567A', telephone: '71 000 000' },
    { _id: '2', raisonSociale: 'STIR', type: 0, code: 'STIR001', adresse: 'Bizerte, Tunisie', matriculeFiscale: '7654321B', telephone: '72 000 000' },
    { _id: '5', raisonSociale: 'Ooredoo Tunisie', type: 0, code: 'OOR001', adresse: 'Tunis, Tunisie', matriculeFiscale: '3456789F', telephone: '71 333 444' },

    // FOURNISSEURS (type: 1)
    { _id: '3', raisonSociale: 'Total Energies Tunisie', type: 1, code: 'TOTAL001', adresse: 'La Goulette, Tunisie', matriculeFiscale: '4567890D', telephone: '70 111 222' },
    { _id: '4', raisonSociale: 'Shell Tunisie', type: 1, code: 'SHELL001', adresse: 'Sfax, Tunisie', matriculeFiscale: '2345678E', telephone: '74 000 000' },

    // PARTENAIRES INTERNATIONAUX (type: 2)
    { _id: '7', raisonSociale: 'Entreprise Française SARL', type: 2, code: 'FR001', adresse: 'Paris, France', matriculeFiscale: 'FR123456', telephone: '+33 1 23 45 67 89' },
    { _id: '8', raisonSociale: 'Italian Import Srl', type: 2, code: 'IT001', adresse: 'Rome, Italie', matriculeFiscale: 'IT987654', telephone: '+39 06 1234567' },
  ];

  const produits = [
    { _id: '1', nom: 'Gaz Naturel', prixUnitaire: 1.20, uniteMesure: 'm³', codeProduit: 'GN001' },
    { _id: '2', nom: 'Pétrole Brut', prixUnitaire: 350, uniteMesure: 'Bbl', codeProduit: 'PB002' },
    { _id: '3', nom: 'Essence Sans Plomb', prixUnitaire: 2.50, uniteMesure: 'L', codeProduit: 'ESP003' },
    { _id: '4', nom: 'Gasoil', prixUnitaire: 2.20, uniteMesure: 'L', codeProduit: 'GAS004' },
    { _id: '5', nom: 'Kérosène', prixUnitaire: 2.80, uniteMesure: 'L', codeProduit: 'KER005' },
    { _id: '6', nom: 'GPL', prixUnitaire: 0.85, uniteMesure: 'kg', codeProduit: 'GPL006' },
  ];

  const mockCommandes = [
    {
      _id: '1',
      numeroCommande: 'CMD-2024-0001',
      type: 'achat',
      dateCreation: '2024-01-15T10:00:00.000Z',
      partenaire: tiers[2],
      produits: [{ nom: 'Gaz Naturel', quantite: 10000, prixUnitaire: 1.20, codeProduit: 'GN001', uniteMesure: 'm³' }],
      devise: 'TND',
      statut: 'Validée',
      montantTotal: 12000,
    },
    {
      _id: '2',
      numeroCommande: 'CMD-2024-0002',
      type: 'vente',
      dateCreation: '2024-02-01T10:00:00.000Z',
      partenaire: tiers[3],
      produits: [{ nom: 'Pétrole Brut', quantite: 5000, prixUnitaire: 350, codeProduit: 'PB002', uniteMesure: 'Bbl' }],
      devise: 'USD',
      statut: 'En attente',
      montantTotal: 1750000,
    },
    {
      _id: '3',
      numeroCommande: 'CMD-2024-0003',
      type: 'export',
      dateCreation: '2024-03-15T10:00:00.000Z',
      partenaire: tiers[5],
      paysDestination: 'France',
      incoterm: 'CIF',
      produits: [{ nom: 'Essence Sans Plomb', quantite: 50000, prixUnitaire: 2.50, codeProduit: 'ESP003', uniteMesure: 'L' }],
      devise: 'EUR',
      statut: 'En attente',
      montantTotal: 125000,
    },
  ];

  // ═══════════════════════════════════════════════════════════
  // 2. STATE
  // ═══════════════════════════════════════════════════════════

  const [data, setData] = useState(mockCommandes);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(null);
  const [filters, setFilters] = useState({ search: '', type: 'all', statut: '' });

  const [form, setForm] = useState({
    numeroCommande: '',
    type: 'achat',
    dateCreation: new Date().toISOString().split('T')[0],
    partenaire: '',
    paysDestination: '',
    incoterm: 'FOB',
    produits: [{ nom: '', quantite: 1, prixUnitaire: '', codeProduit: '', uniteMesure: '' }],
    devise: 'TND',
    statut: 'En attente',
  });

  // ═══════════════════════════════════════════════════════════
  // 3. USER PERMISSIONS
  // ═══════════════════════════════════════════════════════════

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const userRole = user?.role?.toLowerCase() || '';
  const isAdmin = userRole === 'admin';
  const isCommercial = userRole === 'commercial';

  // ✅ Admin & Commercial gèrent TOUTES les commandes
  const canView = isAdmin || isCommercial;
  const canCreate = isAdmin || isCommercial;
  const canEdit = isAdmin || isCommercial;
  const canDelete = isAdmin || isCommercial;
  const canValidate = isAdmin || isCommercial;
  const canExportPDF = isAdmin || isCommercial;

  // ═══════════════════════════════════════════════════════════
  // 4. HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════

  const calculateTotal = useCallback(() => {
    return form.produits.reduce((sum, p) => sum + (parseFloat(p.quantite) || 0) * (parseFloat(p.prixUnitaire) || 0), 0);
  }, [form.produits]);

  const generateNumeroCommande = useCallback(() => {
    const year = new Date().getFullYear();
    const count = (data || []).length + 1;
    return `CMD-${year}-${String(count).padStart(4, '0')}`;
  }, [data]);

  const resetForm = useCallback(() => {
    setForm({
      numeroCommande: generateNumeroCommande(),
      type: 'achat',
      dateCreation: new Date().toISOString().split('T')[0],
      partenaire: '',
      paysDestination: '',
      incoterm: 'FOB',
      produits: [{ nom: '', quantite: 1, prixUnitaire: '', codeProduit: '', uniteMesure: '' }],
      devise: 'TND',
      statut: 'En attente',
    });
  }, [generateNumeroCommande]);

  const handleProductChange = useCallback((index, field, value) => {
    const newProduits = [...form.produits];
    newProduits[index] = { ...newProduits[index], [field]: value };

    if (field === 'nom' && value) {
      const selectedProduct = produits.find((sp) => sp.nom === value);
      if (selectedProduct) {
        newProduits[index] = {
          ...newProduits[index],
          codeProduit: selectedProduct.codeProduit,
          uniteMesure: selectedProduct.uniteMesure,
          prixUnitaire: selectedProduct.prixUnitaire,
        };
      }
    }

    setForm({ ...form, produits: newProduits });
  }, [form, produits]);

  // ═══════════════════════════════════════════════════════════
  // 5. FILTERING
  // ═══════════════════════════════════════════════════════════

  const filteredData = useMemo(() => {
    return (data || []).filter((cmd) => {
      const matchSearch =
        cmd.numeroCommande.toLowerCase().includes(filters.search.toLowerCase()) ||
        cmd.partenaire?.raisonSociale?.toLowerCase().includes(filters.search.toLowerCase());
      const matchType = filters.type === 'all' || cmd.type === filters.type;
      const matchStatut = !filters.statut || cmd.statut === filters.statut;
      return matchSearch && matchType && matchStatut;
    });
  }, [data, filters]);

  const stats = useMemo(
    () => ({
      total: data.length,
      achats: data.filter((d) => d.type === 'achat').length,
      ventes: data.filter((d) => d.type === 'vente').length,
      exports: data.filter((d) => d.type === 'export').length,
      montantTotal: data.reduce((sum, d) => sum + (d.montantTotal || 0), 0),
    }),
    [data]
  );

  // ═══════════════════════════════════════════════════════════
  // 6. CRUD OPERATIONS
  // ═══════════════════════════════════════════════════════════

  const handleSave = useCallback(() => {
    if (!canCreate) {
      toast.error('❌ Accès refusé');
      return;
    }

    if (!form.numeroCommande || !form.partenaire || !form.produits[0]?.nom) {
      toast.error('⚠️ Remplissez les champs requis');
      return;
    }

    const partenaireInfo = tiers.find((t) => t._id === form.partenaire);
    const newCommande = {
      _id: editingId || Date.now().toString(),
      ...form,
      partenaire: partenaireInfo,
      montantTotal: calculateTotal(),
      dateCreation: new Date().toISOString(),
    };

    if (editingId) {
      setData((d) => d.map((c) => (c._id === editingId ? newCommande : c)));
      toast.success('✅ Commande modifiée');
    } else {
      setData((d) => [newCommande, ...d]);
      toast.success('✅ Commande créée');
    }

    setShowModal(false);
    setEditingId(null);
    resetForm();
  }, [canCreate, form, calculateTotal, editingId, resetForm, tiers]);

  const handleEdit = useCallback(
    (item) => {
      if (!canEdit) {
        toast.error('❌ Accès refusé');
        return;
      }
      setEditingId(item._id);
      setForm({
        numeroCommande: item.numeroCommande,
        type: item.type,
        dateCreation: item.dateCreation?.split('T')[0],
        partenaire: item.partenaire?._id || '',
        paysDestination: item.paysDestination || '',
        incoterm: item.incoterm || 'FOB',
        produits: (item.produits || []).map((p) => ({
          nom: p.nom,
          quantite: p.quantite,
          prixUnitaire: p.prixUnitaire,
          codeProduit: p.codeProduit,
          uniteMesure: p.uniteMesure,
        })),
        devise: item.devise,
        statut: item.statut,
      });
      setShowModal(true);
    },
    [canEdit]
  );

  const handleDelete = useCallback(
    (id, num) => {
      if (!canDelete) {
        toast.error('❌ Accès refusé');
        return;
      }
      // eslint-disable-next-line no-alert
      if (window.confirm(`Supprimer ${num}?`)) {
        setData((d) => d.filter((c) => c._id !== id));
        toast.success('✅ Supprimée');
      }
    },
    [canDelete]
  );

  const handleValidate = useCallback(
    (id, num, newStatus) => {
      if (!canValidate) {
        toast.error('❌ Accès refusé');
        return;
      }
      setData((d) => d.map((c) => (c._id === id ? { ...c, statut: newStatus } : c)));
      toast.success(`✅ ${num} ${newStatus.toLowerCase()}`);
    },
    [canValidate]
  );

  // ═══════════════════════════════════════════════════════════
  // 7. PDF EXPORT
  // ═══════════════════════════════════════════════════════════

  const exportPDF = useCallback(
    (commande) => {
      if (!canExportPDF) {
        toast.error('❌ Accès refusé');
        return;
      }

      setPdfLoading(commande._id);
      try {
        const doc = new jsPDF();
        const marginX = 20;
        let y = 20;

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(26, 60, 94);
        doc.text('COMMANDE', marginX, y);
        y += 10;

        doc.setDrawColor(200, 200, 200);
        doc.line(marginX, y, doc.internal.pageSize.getWidth() - marginX, y);
        y += 10;

        const infoData = [
          ['Numéro', commande.numeroCommande],
          ['Type', commande.type.toUpperCase()],
          ['Partenaire', commande.partenaire?.raisonSociale || 'N/A'],
          ['Montant', `${commande.montantTotal?.toLocaleString()} ${commande.devise}`],
          ['Statut', commande.statut],
          ['Date', new Date(commande.dateCreation).toLocaleDateString('fr-FR')],
        ];

        autoTable(doc, {
          startY: y,
          head: [['Information', 'Valeur']],
          body: infoData,
          theme: 'striped',
          headStyles: { fillColor: [26, 60, 94], textColor: [255, 255, 255], fontSize: 10, fontStyle: 'bold' },
          bodyStyles: { fontSize: 9 },
          margin: { left: marginX, right: marginX },
        });

        y = doc.lastAutoTable.finalY + 10;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(26, 60, 94);
        doc.text('DÉTAIL DES PRODUITS', marginX, y);
        y += 7;

        const produitsData = (commande.produits || []).map((p, i) => [
          i + 1,
          p.nom,
          p.codeProduit,
          `${p.quantite} ${p.uniteMesure}`,
          `${p.prixUnitaire.toLocaleString()} ${commande.devise}`,
          `${(p.quantite * p.prixUnitaire).toLocaleString()} ${commande.devise}`,
        ]);

        autoTable(doc, {
          startY: y,
          head: [['#', 'Produit', 'Code', 'Quantité', 'Prix Unit.', 'Total']],
          body: produitsData,
          foot: [['', '', '', '', 'TOTAL', `${commande.montantTotal?.toLocaleString()} ${commande.devise}`]],
          theme: 'striped',
          headStyles: { fillColor: [26, 60, 94], textColor: [255, 255, 255], fontSize: 10, fontStyle: 'bold' },
          footStyles: { fillColor: [240, 240, 240], textColor: [26, 60, 94], fontSize: 10, fontStyle: 'bold' },
          bodyStyles: { fontSize: 9 },
          margin: { left: marginX, right: marginX },
        });

        const fileName = `Commande_${commande.numeroCommande}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        toast.success(`✅ ${fileName} téléchargé`);
      } catch  {
        toast.error('❌ Erreur PDF');
      } finally {
        setPdfLoading(null);
      }
    },
    [canExportPDF]
  );

  // ═══════════════════════════════════════════════════════════
  // 8. RENDER
  // ═══════════════════════════════════════════════════════════

  if (!canView) {
    return (
      <div className="page-commandes">
        <div className="empty-state" style={{ margin: '100px auto' }}>
          <h3>🔒 Accès refusé</h3>
          <p>Seuls Admin et Commercial peuvent accéder</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-commandes">
      <div className="role-banner">{isAdmin ? '👤 Administrateur - Gestion complète' : isCommercial ? '💼 Commercial - Gestion des commandes' : '❓ Rôle inconnu'}</div>

      <div className="header-commandes">
        <div className="header-left">
          <h2>📋 Gestion des Commandes</h2>
          <p>Gestion complète: Achats, Ventes, Exports</p>
        </div>

        <div className="commandes-stats">
          <div className="stat-card">
            <div className="stat-number">{stats.total}</div>
            <div className="stat-label">Total</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.achats}</div>
            <div className="stat-label">Achats</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.ventes}</div>
            <div className="stat-label">Ventes</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.exports}</div>
            <div className="stat-label">Exports</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{(stats.montantTotal / 1000).toFixed(0)}k</div>
            <div className="stat-label">Montant</div>
          </div>
        </div>

        <div className="header-buttons">
          {canCreate && (
            <button
              className="btn-nouveau"
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
            >
              + Nouvelle
            </button>
          )}
        </div>
      </div>

      <div className="filters-section">
        <input
          type="text"
          placeholder="🔍 Rechercher..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="search-input"
        />
        <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} className="type-filter">
          <option value="all">Tous types</option>
          <option value="achat">Achats</option>
          <option value="vente">Ventes</option>
          <option value="export">Exports</option>
        </select>
        <div className="statut-filter">
          <button className={`filter-btn ${!filters.statut ? 'active' : ''}`} onClick={() => setFilters({ ...filters, statut: '' })}>
            Tous
          </button>
          <button className={`filter-btn ${filters.statut === 'En attente' ? 'active' : ''}`} onClick={() => setFilters({ ...filters, statut: 'En attente' })}>
            En attente
          </button>
          <button className={`filter-btn ${filters.statut === 'Validée' ? 'active' : ''}`} onClick={() => setFilters({ ...filters, statut: 'Validée' })}>
            Validées
          </button>
        </div>
      </div>

      {filteredData.length === 0 ? (
        <div className="empty-state">
          <h3>📋 Aucune commande</h3>
          <p>Créez votre première commande</p>
        </div>
      ) : (
        <div className="commandes-table">
          <table>
            <thead>
              <tr>
                <th>Numéro</th>
                <th>Type</th>
                <th>Partenaire</th>
                <th>Montant</th>
                <th>Statut</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((cmd) => (
                <tr key={cmd._id}>
                  <td>
                    <strong>{cmd.numeroCommande}</strong>
                  </td>
                  <td>
                    <span className={`badge badge-${cmd.type}`}>{cmd.type}</span>
                  </td>
                  <td>{cmd.partenaire?.raisonSociale}</td>
                  <td>
                    <strong>
                      {cmd.montantTotal?.toLocaleString()} {cmd.devise}
                    </strong>
                  </td>
                  <td>
                    <span className={`status status-${cmd.statut.toLowerCase().replace(' ', '-')}`}>{cmd.statut}</span>
                  </td>
                  <td>{new Date(cmd.dateCreation).toLocaleDateString('fr-FR')}</td>
                  <td className="actions">
                    {canExportPDF && (
                      <button onClick={() => exportPDF(cmd)} className="btn-pdf" disabled={pdfLoading === cmd._id} title="Exporter en PDF">
                        {pdfLoading === cmd._id ? '⏳' : '📄'}
                      </button>
                    )}
                    {canValidate && cmd.statut === 'En attente' && (
                      <button onClick={() => handleValidate(cmd._id, cmd.numeroCommande, 'Validée')} className="btn-validate" title="Valider">
                        ✅
                      </button>
                    )}
                    {canEdit && (
                      <button onClick={() => handleEdit(cmd)} className="btn-edit" title="Modifier">
                        ✏️
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => handleDelete(cmd._id, cmd.numeroCommande)} className="btn-delete" title="Supprimer">
                        🗑️
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {canCreate && showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? '✏️ Modifier' : '📝 Nouvelle'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Type *</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="achat">Achat</option>
                    <option value="vente">Vente</option>
                    <option value="export">Export</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Numéro *</label>
                  <input value={form.numeroCommande} onChange={(e) => setForm({ ...form, numeroCommande: e.target.value })} placeholder="Auto-généré" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Partenaire *</label>
                  <select value={form.partenaire} onChange={(e) => setForm({ ...form, partenaire: e.target.value })}>
                    <option value="">Sélectionner</option>
                    {tiers.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.raisonSociale} ({t.type === 0 ? 'Client' : t.type === 1 ? 'Fournisseur' : 'Partner'})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Devise</label>
                  <select value={form.devise} onChange={(e) => setForm({ ...form, devise: e.target.value })}>
                    <option value="TND">TND</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date</label>
                  <input type="date" value={form.dateCreation} onChange={(e) => setForm({ ...form, dateCreation: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Statut</label>
                  <select value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })}>
                    <option value="En attente">En attente</option>
                    <option value="Validée">Validée</option>
                    <option value="Refusée">Refusée</option>
                  </select>
                </div>
              </div>

              {form.type === 'export' && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Pays destination</label>
                    <input value={form.paysDestination} onChange={(e) => setForm({ ...form, paysDestination: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Incoterm</label>
                    <select value={form.incoterm} onChange={(e) => setForm({ ...form, incoterm: e.target.value })}>
                      <option value="FOB">FOB</option>
                      <option value="CIF">CIF</option>
                      <option value="DAP">DAP</option>
                    </select>
                  </div>
                </div>
              )}

              <h4>📦 Produits</h4>
              {form.produits.map((prod, idx) => (
                <div key={`produit-${idx}`} className="produit-ligne">
                  <select value={prod.nom} onChange={(e) => handleProductChange(idx, 'nom', e.target.value)}>
                    <option value="">Sélectionner</option>
                    {produits.map((p) => (
                      <option key={p._id} value={p.nom}>
                        {p.nom}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Qté"
                    value={prod.quantite}
                    onChange={(e) => handleProductChange(idx, 'quantite', e.target.value)}
                    min="1"
                  />
                  <input
                    type="number"
                    placeholder="Prix"
                    value={prod.prixUnitaire}
                    onChange={(e) => handleProductChange(idx, 'prixUnitaire', e.target.value)}
                    min="0"
                    step="0.01"
                  />
                  {form.produits.length > 1 && (
                    <button
                      type="button"
                      className="btn-remove"
                      onClick={() => setForm({ ...form, produits: form.produits.filter((_p, i) => i !== idx) })}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="btn-add-produit"
                onClick={() =>
                  setForm({
                    ...form,
                    produits: [...form.produits, { nom: '', quantite: 1, prixUnitaire: '', codeProduit: '', uniteMesure: '' }],
                  })
                }
              >
                + Ajouter
              </button>
              <div className="total">
                Total : <strong>{calculateTotal().toLocaleString()} {form.devise}</strong>
              </div>
            </div>

            <div className="modal-buttons">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                Annuler
              </button>
              <button className="btn-primary" onClick={handleSave}>
                {editingId ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Commandes;