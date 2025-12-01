import { useState, useEffect } from "react";
import "./InstallApp.css";

function InstallApp() {
  const [activeTab, setActiveTab] = useState("pc");
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    // Verificar si ya hay un evento guardado
    if (window.deferredPrompt) {
      setCanInstall(true);
    }

    // Escuchar el evento por si ocurre mientras estamos en esta página
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      window.deferredPrompt = e;
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setCanInstall(false);
      window.deferredPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installPWA = async () => {
    if (window.deferredPrompt) {
      window.deferredPrompt.prompt();
      const { outcome } = await window.deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        window.deferredPrompt = null;
        setCanInstall(false);
      }
    }
  };

  const tabs = [
    { id: "pc", label: "Computadora", icon: "💻" },
    { id: "android", label: "Android", icon: "📱" },
    { id: "ios", label: "iOS", icon: "🍎" },
  ];

  const instructions = {
    pc: {
      title: "Instalar en tu Computadora",
      browser: "Chrome / Edge / Brave",
      steps: [
        "Abre la aplicación en tu navegador Chrome, Edge o Brave",
        "Busca el icono de instalación en la barra de direcciones (aparece como un monitor con una flecha hacia abajo)",
        "Haz clic en el icono y selecciona 'Instalar'",
        "La app se instalará y podrás acceder desde tu escritorio o menú de inicio",
      ],
      tip: "Si no ves el icono de instalación, haz clic en los tres puntos del menú y busca la opción 'Instalar reciclAR...'",
      image: "🖥️",
    },
    android: {
      title: "Instalar en Android",
      browser: "Chrome",
      steps: [
        "Abre la aplicación en Chrome desde tu dispositivo Android",
        "Toca el menú de tres puntos en la esquina superior derecha",
        "Selecciona 'Añadir a pantalla de inicio' o 'Instalar aplicación'",
        "Confirma tocando 'Instalar' en el mensaje emergente",
        "La app aparecerá en tu pantalla de inicio como cualquier otra aplicación",
      ],
      tip: "También puede aparecer un banner en la parte inferior de la pantalla invitándote a instalar la app. Solo toca 'Instalar'.",
      image: "📲",
    },
    ios: {
      title: "Instalar en iPhone / iPad",
      browser: "Safari",
      steps: [
        "Abre la aplicación en Safari (es importante que sea Safari, no Chrome)",
        "Toca el botón de compartir (el cuadrado con la flecha hacia arriba) en la barra inferior",
        "Desplázate hacia abajo en el menú y selecciona 'Añadir a pantalla de inicio'",
        "Personaliza el nombre si lo deseas y toca 'Añadir'",
        "La app aparecerá en tu pantalla de inicio con el icono de reciclAR",
      ],
      tip: "En iOS solo se puede instalar desde Safari. Si estás usando otro navegador, copia la URL y ábrela en Safari.",
      image: "📱",
    },
  };

  const currentInstructions = instructions[activeTab];

  return (
    <div className="install-app-container">
      <div className="install-header">
        <h1>Descarga la App</h1>
        <p className="install-subtitle">
          Instala reciclAR en tu dispositivo para acceder más rápido y disfrutar de una experiencia completa, incluso sin conexión.
        </p>
      </div>

      <div className="install-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`install-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="install-content">
        <div className="install-card">
          <div className="install-card-header">
            <span className="install-device-icon">{currentInstructions.image}</span>
            <div className="install-card-titles">
              <h2>{currentInstructions.title}</h2>
              <span className="browser-badge">{currentInstructions.browser}</span>
            </div>
          </div>

          <div className="install-steps">
            {currentInstructions.steps.map((step, index) => (
              <div key={index} className="install-step">
                <div className="step-number">{index + 1}</div>
                <p className="step-text">{step}</p>
              </div>
            ))}
          </div>

          {activeTab === 'pc' && canInstall && (
            <div className="install-action-container">
              <button 
                className="install-app-btn"
                onClick={installPWA}
              >
                <span className="btn-icon">⬇️</span>
                Instalar Aplicación
              </button>
            </div>
          )}

          <div className="install-tip">
            <span className="tip-icon">💡</span>
            <p>{currentInstructions.tip}</p>
          </div>
        </div>

        <div className="install-benefits">
          <h3>Beneficios de instalar la app</h3>
          <div className="benefits-grid">
            <div className="benefit-item">
              <span className="benefit-icon">⚡</span>
              <span className="benefit-text">Acceso rápido desde tu pantalla de inicio</span>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">📴</span>
              <span className="benefit-text">Navega por la app aunque pierdas conexión</span>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">🔔</span>
              <span className="benefit-text">Recibe notificaciones de tus logros</span>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">💾</span>
              <span className="benefit-text">Ocupa muy poco espacio en tu dispositivo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InstallApp;
