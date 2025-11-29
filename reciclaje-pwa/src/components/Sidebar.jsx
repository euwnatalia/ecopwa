import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import "./Sidebar.css";

function Sidebar({ userDetails, onLogout }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsMobileOpen(false);
  }, [location]);
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setCanInstall(true);
      window.deferredPrompt = e;
    };

    const handleAppInstalled = () => {
      setCanInstall(false);
      window.deferredPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches) {
      setCanInstall(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const closeMobileMenu = () => {
    setIsMobileOpen(false);
  };
  const installPWA = async () => {
    if (window.deferredPrompt) {
      window.deferredPrompt.prompt();
      const { outcome } = await window.deferredPrompt.userChoice;
      window.deferredPrompt = null;
      setCanInstall(false);
    }
  };

  const isComercio = userDetails?.tipo === 'comercio';

  return (
    <>
      {!isMobileOpen && (
        <button
          className="mobile-menu-toggle"
          onClick={() => setIsMobileOpen(true)}
          aria-label="Abrir menú"
        >
          ☰
        </button>
      )}
      <div
        className={`sidebar-overlay ${isMobileOpen ? 'active' : ''}`}
        onClick={closeMobileMenu}
      ></div>

      <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
        <button
          className="sidebar-close-btn"
          onClick={closeMobileMenu}
          aria-label="Cerrar menú"
        >
          ✕
        </button>
        <h2>reciclAR <span className="sidebar-logo">{isComercio ? '🏪' : '♻️'}</span></h2>
        {isComercio && <div className="user-type-badge">Comercio</div>}
        
        <nav>
          <ul>
            <li>
              <Link 
                to="/dashboard/" 
                className={location.pathname === '/dashboard/' ? 'active' : ''}
              >
                <span className="sidebar-icon">
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M3 10.5L12 4l9 6.5V20a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-4h-4v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10.5z" stroke="#fff" strokeWidth="2" strokeLinejoin="round"/></svg>
                </span>
                Inicio
              </Link>
            </li>
            <li>
              <Link 
                to="/dashboard/map"
                className={location.pathname === '/dashboard/map' ? 'active' : ''}
              >
                <span className="sidebar-icon">
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M3 6l7-2 7 2 4-1v15l-7 2-7-2-4 1V6z" stroke="#fff" strokeWidth="2" strokeLinejoin="round"/></svg>
                </span>
                Mapa
              </Link>
            </li>
            
            {!isComercio && (
              <li>
                <Link
                  to="/dashboard/scan"
                  className={location.pathname === '/dashboard/scan' ? 'active' : ''}
                >
                  <span className="sidebar-icon">
                    <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="17" cy="17" r="3" stroke="#fff" strokeWidth="2"/><path d="M17 15v4M15 17h4" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
                  </span>
                  Reciclar
                </Link>
              </li>
            )}
            {isComercio && (
              <li>
                <Link 
                  to="/dashboard/receive"
                  className={location.pathname === '/dashboard/receive' ? 'active' : ''}
                >
                  <span className="sidebar-icon">
                    <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                  Recibir
                </Link>
              </li>
            )}
            
            <li>
              <Link 
                to="/dashboard/achievements"
                className={location.pathname === '/dashboard/achievements' ? 'active' : ''}
              >
                <span className="sidebar-icon">
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M8 21h8M12 17v4M17 5V3H7v2M17 5a5 5 0 0 1-10 0M17 5h2a2 2 0 0 1 2 2c0 3.87-3.13 7-7 7s-7-3.13-7-7a2 2 0 0 1 2-2h2" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                {isComercio ? 'Estadísticas' : 'Logros'}
              </Link>
            </li>
            <li>
              <Link
                to="/dashboard/profile"
                className={location.pathname === '/dashboard/profile' ? 'active' : ''}
              >
                <span className="sidebar-icon">
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" stroke="#fff" strokeWidth="2"/><path d="M4 20c0-4 4-7 8-7s8 3 8 7" stroke="#fff" strokeWidth="2"/></svg>
                </span>
                Perfil
              </Link>
            </li>
            <li>
              <Link
                to="/dashboard/install"
                className={location.pathname === '/dashboard/install' ? 'active' : ''}
              >
                <span className="sidebar-icon">
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17h16" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                Descarga la app
              </Link>
            </li>
          </ul>
        </nav>

        <div className="sidebar-bottom">
          <button 
            className="logout-btn"
            onClick={onLogout}
            title="Cerrar sesión"
          >
            <span className="sidebar-icon">
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </span>
            Cerrar sesión
          </button>
        </div>
        {canInstall && (
          <div className="pwa-install">
            <button 
              className="install-btn"
              onClick={installPWA}
              title="Instalar app"
            >
              <span className="sidebar-icon">
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17h16" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
              Instalar App
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

export default Sidebar;
