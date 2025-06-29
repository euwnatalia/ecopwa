import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import "./Sidebar.css";

function Sidebar() {
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
        <h2>EcoPWA ♻️</h2>
        <nav>
          <ul>
            <li>
              <Link 
                to="/dashboard/" 
                className={location.pathname === '/dashboard/' ? 'active' : ''}
              >
                🏠 Inicio
              </Link>
            </li>
            <li>
              <Link 
                to="/dashboard/map"
                className={location.pathname === '/dashboard/map' ? 'active' : ''}
              >
                🗺️ Mapa
              </Link>
            </li>
            <li>
              <Link 
                to="/dashboard/scan"
                className={location.pathname === '/dashboard/scan' ? 'active' : ''}
              >
                📷 Escanear
              </Link>
            </li>
            <li>
              <Link 
                to="/dashboard/achievements"
                className={location.pathname === '/dashboard/achievements' ? 'active' : ''}
              >
                🏆 Logros
              </Link>
            </li>
            <li>
              <Link 
                to="/dashboard/profile"
                className={location.pathname === '/dashboard/profile' ? 'active' : ''}
              >
                👤 Perfil
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
              📱 Instalar App
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

export default Sidebar;
