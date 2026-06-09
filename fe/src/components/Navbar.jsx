// components/Navbar.jsx - Version finale optimisée
import React, { useState, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTachometerAlt, faUsers, faBoxOpen, faBuilding, faFileContract,
  faShoppingCart, faTruckFast, faFileInvoiceDollar, faCheckCircle,
  faHistory, faBars, faRightFromBracket, faExchangeAlt, faChevronDown,
  faBell, faExclamationTriangle, faRobot
} from '@fortawesome/free-solid-svg-icons';
import '../css/Navbar.css';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  // ── Hooks avant tout return ────────────────────────────────
  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); }
    catch { return {}; }
  }, []);

  const role = user?.role;

  const [sidebarPathname, setSidebarPathname] = useState(null);
  const [dropdownPathname, setDropdownPathname] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);

  const isSidebarOpen = sidebarPathname === location.pathname;
  const activeDropdown = dropdownPathname === location.pathname ? openDropdown : null;

  const dashboardPath = useMemo(() => {
    switch (role) {
      case 'Admin': return '/dashboard';
      case 'Commercial': return '/commercial-dashboard';
      case 'Client': return '/client-dashboard';
      case 'Transporteur': return '/transporteur-dashboard';
      case 'Fournisseur': return '/fournisseur-dashboard';
      default: return '/dashboard';
    }
  }, [role]);

  // ── Initiales pour l'avatar ────────────────────────────────
  const initiales = useMemo(() => {
    const nom = user?.nom || user?.name || user?.pseudo || role || 'U';
    const parts = nom.split(' ').slice(0, 2);
    return parts.map(w => w[0]?.toUpperCase() || '').join('') || 'U';
  }, [user, role]);

  // ── Return anticipé après tous les hooks ───────────────────
  const token = localStorage.getItem('token');
  if (!token || location.pathname === '/' || location.pathname === '/login' || location.pathname === '/forgot-password') {
    return null;
  }

  // ── Handlers ───────────────────────────────────────────────
  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const openSidebar = () => setSidebarPathname(location.pathname);
  const closeSidebar = () => setSidebarPathname(null);
  const toggleSidebar = () => isSidebarOpen ? closeSidebar() : openSidebar();

  const toggleDropdown = (name) => {
    if (activeDropdown === name) {
      setOpenDropdown(null);
      setDropdownPathname(null);
    } else {
      setOpenDropdown(name);
      setDropdownPathname(location.pathname);
    }
  };

  const handleNavigation = () => {
    closeSidebar();
    setOpenDropdown(null);
    setDropdownPathname(null);
  };

  const isActive = (path) => location.pathname === path ? 'active-link' : '';
  const isDropdownActive = (paths) => paths.some(p => location.pathname === p) ? 'active' : '';

  // ── Dashboard link ─────────────────────────────────────────
  const dashboardLink = (
    <Link to={dashboardPath} className={`sidebar-link ${isActive(dashboardPath)}`} onClick={handleNavigation}>
      <FontAwesomeIcon icon={faTachometerAlt} />
      <span>Dashboard</span>
    </Link>
  );

  // ── Dropdown Produits Nationaux ────────────────────────────
  const renderDropdownProduitsNationaux = () => (
    <div className="sidebar-dropdown">
      <button
        className={`sidebar-dropdown-btn ${activeDropdown === 'produitsNationaux' || isDropdownActive(['/ventes', '/cabotage']) ? 'active' : ''}`}
        onClick={() => toggleDropdown('produitsNationaux')}
      >
        <FontAwesomeIcon icon={faBoxOpen} />
        <span>Produits Nationaux</span>
        <FontAwesomeIcon icon={faChevronDown} className={`dropdown-arrow ${activeDropdown === 'produitsNationaux' ? 'rotated' : ''}`} />
      </button>
      <div className={`sidebar-dropdown-menu ${activeDropdown === 'produitsNationaux' ? 'open' : ''}`}>
        <Link to="/ventes" className={`sidebar-dropdown-item ${isActive('/ventes')}`} onClick={handleNavigation}>
          Vente STEG (Gaz Naturel)
        </Link>
        <Link to="/cabotage" className={`sidebar-dropdown-item ${isActive('/cabotage')}`} onClick={handleNavigation}>
          Cabotage STIR (Brut)
        </Link>
      </div>
    </div>
  );

  // ── Routes par rôle ────────────────────────────────────────
  const renderAdminRoutes = () => (
    <>
      <Link to="/users" className={`sidebar-link ${isActive('/users')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faUsers} /><span>Utilisateurs</span></Link>
      <Link to="/referentiels" className={`sidebar-link ${isActive('/referentiels')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faBuilding} /><span>Référentiels</span></Link>
      <Link to="/stock" className={`sidebar-link ${isActive('/stock')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faBoxOpen} /><span>Stock</span></Link>
      <Link to="/contrats" className={`sidebar-link ${isActive('/contrats')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faFileContract} /><span>Contrats</span></Link>
      <Link to="/commandes" className={`sidebar-link ${isActive('/commandes')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faShoppingCart} /><span>Commandes</span></Link>
      <Link to="/livraisons" className={`sidebar-link ${isActive('/livraisons')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faTruckFast} /><span>Livraisons</span></Link>
      <Link to="/factures" className={`sidebar-link ${isActive('/factures')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faFileInvoiceDollar} /><span>Factures</span></Link>
      <Link to="/export-import" className={`sidebar-link ${isActive('/export-import')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faExchangeAlt} /><span>Export</span></Link>
      <Link to="/conformite" className={`sidebar-link ${isActive('/conformite')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faCheckCircle} /><span>Conformité</span></Link>
      <Link to="/tiers" className={`sidebar-link ${isActive('/tiers')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faFileInvoiceDollar} /><span>Tiers</span></Link>
      <Link to="/historique" className={`sidebar-link ${isActive('/historique')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faHistory} /><span>Historique</span></Link>
      <Link to="/notifications" className={`sidebar-link ${isActive('/notifications')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faBell} /><span>Notifications</span></Link>
      <Link to="/penalites-retard" className={`sidebar-link ${isActive('/penalites-retard')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faExclamationTriangle} /><span>Pénalités retard</span></Link>
      <Link to="/chatbot" className={`sidebar-link ${isActive('/chatbot')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faRobot} /><span>Assistant</span></Link>
      {renderDropdownProduitsNationaux()}
    </>
  );

  const renderCommercialRoutes = () => (
    <>
      <Link to="/contrats" className={`sidebar-link ${isActive('/contrats')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faFileContract} /><span>Contrats</span></Link>
      <Link to="/commandes" className={`sidebar-link ${isActive('/commandes')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faShoppingCart} /><span>Commandes</span></Link>
      <Link to="/factures" className={`sidebar-link ${isActive('/factures')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faFileInvoiceDollar} /><span>Factures</span></Link>
      <Link to="/export-import" className={`sidebar-link ${isActive('/export-import')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faExchangeAlt} /><span>Export</span></Link>
      <Link to="/conformite" className={`sidebar-link ${isActive('/conformite')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faCheckCircle} /><span>Conformité</span></Link>
      <Link to="/tiers" className={`sidebar-link ${isActive('/tiers')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faFileInvoiceDollar} /><span>Tiers</span></Link>
      <Link to="/historique" className={`sidebar-link ${isActive('/historique')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faHistory} /><span>Historique</span></Link>
      <Link to="/notifications" className={`sidebar-link ${isActive('/notifications')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faBell} /><span>Notifications</span></Link>
      <Link to="/penalites-retard" className={`sidebar-link ${isActive('/penalites-retard')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faExclamationTriangle} /><span>Pénalités retard</span></Link>
      <Link to="/chatbot" className={`sidebar-link ${isActive('/chatbot')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faRobot} /><span>Assistant</span></Link>
      {renderDropdownProduitsNationaux()}
    </>
  );

  const renderFournisseurRoutes = () => (
    <>
      <Link to="/commandes" className={`sidebar-link ${isActive('/commandes')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faShoppingCart} /><span>Commandes</span></Link>
      <Link to="/livraisons" className={`sidebar-link ${isActive('/livraisons')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faTruckFast} /><span>Livraisons</span></Link>
      <Link to="/tiers" className={`sidebar-link ${isActive('/tiers')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faFileInvoiceDollar} /><span>Tiers</span></Link>
      <Link to="/mes-factures" className={`sidebar-link ${isActive('/mes-factures')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faFileInvoiceDollar} /><span>Mes Factures</span></Link>
      <Link to="/historique" className={`sidebar-link ${isActive('/historique')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faHistory} /><span>Historique</span></Link>
      <Link to="/notifications" className={`sidebar-link ${isActive('/notifications')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faBell} /><span>Notifications</span></Link>
      <Link to="/penalites-retard" className={`sidebar-link ${isActive('/penalites-retard')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faExclamationTriangle} /><span>Pénalités retard</span></Link>
      <Link to="/chatbot" className={`sidebar-link ${isActive('/chatbot')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faRobot} /><span>Assistant</span></Link>
    </>
  );

  const renderClientRoutes = () => (
    <>
      <Link to="/mes-commandes" className={`sidebar-link ${isActive('/mes-commandes')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faShoppingCart} /><span>Mes Commandes</span></Link>
      <Link to="/mes-livraisons" className={`sidebar-link ${isActive('/mes-livraisons')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faTruckFast} /><span>Mes Livraisons</span></Link>
      <Link to="/mes-factures" className={`sidebar-link ${isActive('/mes-factures')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faFileInvoiceDollar} /><span>Mes Factures</span></Link>
      <Link to="/tiers" className={`sidebar-link ${isActive('/tiers')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faFileInvoiceDollar} /><span>Tiers</span></Link>
      <Link to="/historique" className={`sidebar-link ${isActive('/historique')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faHistory} /><span>Historique</span></Link>
      <Link to="/notifications" className={`sidebar-link ${isActive('/notifications')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faBell} /><span>Notifications</span></Link>
      <Link to="/penalites-retard" className={`sidebar-link ${isActive('/penalites-retard')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faExclamationTriangle} /><span>Pénalités retard</span></Link>
      <Link to="/chatbot" className={`sidebar-link ${isActive('/chatbot')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faRobot} /><span>Assistant</span></Link>
    </>
  );

  const renderTransporteurRoutes = () => (
    <>
      <Link to="/transporteur-livraisons" className={`sidebar-link ${isActive('/transporteur-livraisons')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faTruckFast} /><span>Mes Livraisons</span></Link>
      <Link to="/tiers" className={`sidebar-link ${isActive('/tiers')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faFileInvoiceDollar} /><span>Tiers</span></Link>
      <Link to="/historique" className={`sidebar-link ${isActive('/historique')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faHistory} /><span>Historique</span></Link>
      <Link to="/notifications" className={`sidebar-link ${isActive('/notifications')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faBell} /><span>Notifications</span></Link>
      <Link to="/penalites-retard" className={`sidebar-link ${isActive('/penalites-retard')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faExclamationTriangle} /><span>Pénalités retard</span></Link>
      <Link to="/chatbot" className={`sidebar-link ${isActive('/chatbot')}`} onClick={handleNavigation}><FontAwesomeIcon icon={faRobot} /><span>Assistant</span></Link>
    </>
  );

  // ── JSX final ──────────────────────────────────────────────
  return (
    <>
      <header className="topbar">
        <button className="burger-btn" onClick={toggleSidebar} aria-label="Menu">
          <FontAwesomeIcon icon={faBars} />
        </button>

        <div className="topbar-right">
          {/* Profil dans le topbar - visible pour tous les rôles */}
          <Link to="/profile" className="topbar-profile-link" title={`Profil — ${role || 'Invité'}`}>
            <span className="topbar-avatar">{initiales}</span>
            <span className="topbar-role-label">{role || 'Invité'}</span>
          </Link>

          <button className="topbar-logout" onClick={handleLogout} aria-label="Se déconnecter">
            <FontAwesomeIcon icon={faRightFromBracket} />
          </button>
        </div>
      </header>

      {isSidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} aria-hidden="true" />}

      <aside className={`sidebar ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">SMART-TRADE 360°</div>
          <small>{role || 'Utilisateur'}</small>
        </div>
        <nav className="sidebar-nav" aria-label="Navigation principale">
          {dashboardLink}
          {role === 'Admin' && renderAdminRoutes()}
          {role === 'Commercial' && renderCommercialRoutes()}
          {role === 'Fournisseur' && renderFournisseurRoutes()}
          {role === 'Client' && renderClientRoutes()}
          {role === 'Transporteur' && renderTransporteurRoutes()}
        </nav>
      </aside>
    </>
  );
}

export default Navbar;