import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import "./Sidebar.css";

function Sidebar({ userDetails }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const location = useLocation();

  // Cerrar menu mobile al cambiar de ruta
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location]);

  // Detectar si la PWA se puede instalar
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

    // Verificar si ya está instalado
    if (window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches) {
      setCanInstall(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Cerrar menu mobile al hacer click fuera
  const closeMobileMenu = () => {
    setIsMobileOpen(false);
  };

  // Instalar PWA
  const installPWA = async () => {
    if (window.deferredPrompt) {
      window.deferredPrompt.prompt();
      const { outcome } = await window.deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('✅ PWA instalada');
      }
      window.deferredPrompt = null;
      setCanInstall(false);
    }
  };

  const isComercio = userDetails?.tipo === 'comercio';

  return (
    <>
      {/* Botón hamburguesa para mobile */}
      <button 
        className="mobile-menu-toggle"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        aria-label="Abrir menú"
      >
        {isMobileOpen ? '✕' : '☰'}
      </button>

      {/* Overlay para cerrar el sidebar */}
      <div 
        className={`sidebar-overlay ${isMobileOpen ? 'active' : ''}`}
        onClick={closeMobileMenu}
      ></div>

      {/* Sidebar */}
      <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
        <h2>EcoPWA <span className="sidebar-logo">{isComercio ? '🏪' : '♻️'}</span></h2>
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
            
            {/* Opciones específicas para usuarios */}
            {!isComercio && (
              <li>
                <Link 
                  to="/dashboard/scan"
                  className={location.pathname === '/dashboard/scan' ? 'active' : ''}
                >
                  <span className="sidebar-icon">
                    <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4" stroke="#fff" strokeWidth="2"/><path d="M7 7h10v10H7V7z" stroke="#fff" strokeWidth="2"/></svg>
                  </span>
                  Escanear
                </Link>
              </li>
            )}

            {/* Opciones específicas para comercios */}
            {isComercio && (
              <li>
                <Link 
                  to="/dashboard/receive"
                  className={location.pathname === '/dashboard/receive' ? 'active' : ''}
                >
                  <span className="sidebar-icon">
                    <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                  Recibir Reciclajes
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
          </ul>
        </nav>
        {/* Botón de instalación PWA */}
        {canInstall && (
          <div className="pwa-install">
            <button 
              className="install-btn"
              onClick={installPWA}
              title="Instalar aplicación"
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
