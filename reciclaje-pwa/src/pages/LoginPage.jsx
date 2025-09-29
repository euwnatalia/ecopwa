import { auth, provider } from "../firebase/firebase";
import { signInWithPopup } from "firebase/auth";
import { useState, useEffect } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import API_URL from "../config/api.js";
import "./LoginPage.css";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const CONTAINER_STYLE = { width: "100%", height: "400px" };
const DEFAULT_CENTER = { lat: -31.4173, lng: -64.1833 };

function LoginPage({ setUser }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showRegistration, setShowRegistration] = useState(false);
  const [userType, setUserType] = useState(null);
  const [puntos, setPuntos] = useState([]);
  const [puntosOriginales, setPuntosOriginales] = useState([]);
  const [userData, setUserData] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [selectedPunto, setSelectedPunto] = useState(null);
  const [showGameInfo, setShowGameInfo] = useState(false);
  const [selectedUserType, setSelectedUserType] = useState(null);
  
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: API_KEY
  });

  const tiposDisponibles = [
    { value: "Plástico", label: "🥤 Plástico", color: "#2196F3" },
    { value: "Vidrio", label: "🫙 Vidrio", color: "#4CAF50" },
    { value: "Cartón", label: "📦 Cartón", color: "#FF9800" },
    { value: "Papel", label: "📄 Papel", color: "#9C27B0" },
    { value: "Metal", label: "🥫 Metal", color: "#607D8B" }
  ];

// Seleccionar tipo de usuario y hacer login directamente
const handleSelectUserType = async (tipo) => {
  setSelectedUserType(tipo);
  setLoading(true);
  setError(null);

  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const token = await user.getIdToken();
    localStorage.setItem("token", token);

    // Verificar si el usuario ya existe en la base de datos
    const res = await fetch(`${API_URL}/usuarios`, {
      method: "GET",
      headers: {
        "Authorization": "Bearer " + token
      }
    });

    if (res.status === 404) {
      // Usuario nuevo - usar el tipo seleccionado
      const payload = {
        uid: user.uid,
        nombre: user.displayName,
        email: user.email,
        tipo: tipo
      };

      if (tipo === 'comercio') {
        // Para comercios, mostrar el formulario completo
        setUserData({
          uid: user.uid,
          nombre: user.displayName,
          email: user.email,
          token: token
        });
        setShowRegistration(true);
        setSelectedUserType(tipo); // Mantener la selección para el modal
        setLoading(false);
        return;
      } else {
        // Para usuarios regulares, crear directamente
        const createRes = await fetch(`${API_URL}/usuarios`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
          },
          body: JSON.stringify(payload)
        });

        if (!createRes.ok) {
          const err = await createRes.json();
          throw new Error(err.error || "Error al crear usuario");
        }
      }

      setUser({
        uid: user.uid,
        nombre: user.displayName,
        email: user.email,
        tipo: tipo
      });
      window.location.href = "/dashboard";
    } else if (res.ok) {
      // Usuario existente - usar su tipo guardado en la DB (ignorar selección)
      const data = await res.json();
      setUser({
        uid: user.uid,
        nombre: user.displayName,
        email: user.email,
        tipo: data.tipo
      });
      window.location.href = "/dashboard";
    } else {
      const err = await res.json();
      throw new Error(err.error || "Error de servidor");
    }

  } catch (e) {
    console.error("Error en el login:", e);
    if (e.message.includes("auth/popup")) {
      setError("Error al abrir la ventana de Google. Verificá que tu navegador permita ventanas emergentes.");
    } else if (e.message.includes("Failed to fetch") || e.message.includes("NetworkError")) {
      setError("No se pudo conectar al servidor. Verificá tu conexión a internet.");
    } else {
      setError("Error al iniciar sesión: " + e.message);
    }
  } finally {
    setLoading(false);
    setSelectedUserType(null); // Limpiar selección después del intento
  }
};

const handleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const token = await user.getIdToken();
      localStorage.setItem("token", token);

      // Verificar si el usuario ya existe en la base de datos
      const res = await fetch(`${API_URL}/usuarios`, {
        method: "GET",
        headers: {
          "Authorization": "Bearer " + token
        }
      });

      if (res.status === 404) {
        // Usuario nuevo - mostrar selección de tipo
        setUserData({
          uid: user.uid,
          nombre: user.displayName,
          email: user.email,
          token: token
        });
        setShowRegistration(true);
        return;
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error de servidor");
      }

      // Usuario existente - usar su tipo guardado en la DB
      const data = await res.json();
      setUser({
        uid: user.uid,
        nombre: user.displayName,
        email: user.email,
        tipo: data.tipo
      });
      window.location.href = "/dashboard";

    } catch (e) {
      console.error("Error en el login:", e);
      if (e.message.includes("auth/popup")) {
        setError("Error al abrir la ventana de Google. Verificá que tu navegador permita ventanas emergentes.");
      } else if (e.message.includes("Failed to fetch") || e.message.includes("NetworkError")) {
        setError("No se pudo conectar al servidor. Verificá tu conexión a internet.");
      } else {
        setError("Error al iniciar sesión: " + e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUserRegistration = async (tipo, formData = {}) => {
    setLoading(true);
    try {
      const payload = {
        uid: userData.uid,
        nombre: userData.nombre,
        email: userData.email,
        tipo: tipo,
        ...formData
      };

      const res = await fetch(`${API_URL}/usuarios`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + userData.token
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error de servidor");
      }

      const newUserData = await res.json();
      setUser({
        uid: userData.uid,
        nombre: userData.nombre,
        email: userData.email,
        tipo: newUserData.tipo
      });
      window.location.href = "/dashboard";

    } catch (e) {
      console.error("Error en el registro:", e);
      setError("No pudimos completar el registro. " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPuntos = async () => {
    try {
      const params = new URLSearchParams();
      if (filtroTipo) params.append('tipo', filtroTipo);
      
      const response = await fetch(`${API_URL}/puntos/publicos?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPuntosOriginales(data);
        setPuntos(data.slice(0, 50)); // Mostrar más puntos
      }
    } catch (error) {
      console.error("Error cargando puntos:", error);
    }
  };

  useEffect(() => {
    loadPuntos();
  }, [filtroTipo]);
  
if (showRegistration) {
    return (
      <RegistrationModal 
        userData={userData}
        onRegister={handleUserRegistration}
        onBack={() => setShowRegistration(false)}
        loading={loading}
        error={error}
        isLoaded={isLoaded}
      />
    );
  }

  return (
    <div className="login-container">
      <div className="login-left-panel">
        <div className="login-content">
          <h1 className="login-title">
            Bienvenido a <span>reciclAR ♻️</span>
          </h1>
          <p className="login-subtitle">¿Cómo querés participar en el reciclaje?</p>
          <p className="login-hint">Elegí una opción para continuar</p>

          <div className="user-selection-cards">
            <div
              className={`user-card primary-card ${selectedUserType === 'usuario' ? 'selected' : ''} ${loading ? 'disabled' : ''}`}
              onClick={() => !loading && handleSelectUserType('usuario')}
            >
              <div className="card-icon">♻️</div>
              <h3>Soy Reciclador</h3>
              <p>Registrá tus reciclajes, acumulá puntos y ganá premios</p>
              <div className="card-action">
                {loading && selectedUserType === 'usuario' ? 'Iniciando sesión...' : 'Hacer clic para iniciar sesión'}
              </div>
            </div>

            <div
              className={`user-card primary-card ${selectedUserType === 'comercio' ? 'selected' : ''} ${loading ? 'disabled' : ''}`}
              onClick={() => !loading && handleSelectUserType('comercio')}
            >
              <div className="card-icon">🏪</div>
              <h3>Soy un Comercio</h3>
              <p>Sumá tu local como punto verde y ayudá a la comunidad</p>
              <div className="card-action">
                {loading && selectedUserType === 'comercio' ? 'Iniciando sesión...' : 'Hacer clic para iniciar sesión'}
              </div>
            </div>
          </div>

          <div className="gamification-section">
            <button className="gamification-link" onClick={() => setShowGameInfo(true)}>
              <span className="gamification-icon">🏆</span>
              <span className="gamification-text">
                <strong>Sistema de Gamificación</strong>
                <small>Descubrí cómo funciona nuestro sistema de puntos y recompensas</small>
              </span>
              <span className="gamification-arrow">→</span>
            </button>
          </div>


          {error && <div className="login-error">{error}</div>}

          <p className="login-slogan">Pequeñas acciones, grandes cambios 🌍</p>

          {showGameInfo && (
            <div className="game-info-modal" onClick={() => setShowGameInfo(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={() => setShowGameInfo(false)}>×</button>
                <h3>🏆 ¿Cómo funciona la Gamificación?</h3>
                <div className="game-features">
                  <div className="feature">
                    <div className="feature-icon">📊</div>
                    <div>
                      <strong>Puntos por Reciclaje</strong>
                      <p>Ganá puntos según la cantidad y distancia de tus reciclajes</p>
                    </div>
                  </div>
                  <div className="feature">
                    <div className="feature-icon">🏅</div>
                    <div>
                      <strong>Logros y Niveles</strong>
                      <p>Desbloqueá badges especiales y subí de nivel</p>
                    </div>
                  </div>
                  <div className="feature">
                    <div className="feature-icon">📈</div>
                    <div>
                      <strong>Ranking</strong>
                      <p>Competí con otros usuarios y mirá tu impacto ambiental</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="login-right-panel">
        <div className="map-section">
          <h2>Puntos de Reciclaje Disponibles</h2>
          <p>Explorá los puntos de reciclaje en tu zona</p>
          
          <div className="map-controls">
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="filter-select-login"
            >
              <option value="">🔍 Todos los materiales</option>
              {tiposDisponibles.map(tipo => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </option>
              ))}
            </select>
            <div className="points-counter-login">
              📍 {puntos.length} punto{puntos.length !== 1 ? 's' : ''}
            </div>
          </div>
          
          {isLoaded ? (
            <div className="map-container-login">
              <GoogleMap
                mapContainerStyle={CONTAINER_STYLE}
                center={DEFAULT_CENTER}
                zoom={12}
                options={{
                  zoomControl: true,
                  mapTypeControl: false,
                  streetViewControl: false,
                  fullscreenControl: false,
                  gestureHandling: "cooperative"
                }}
              >
                {puntos.map(punto => {
                  const tipo = tiposDisponibles.find(t => t.value === punto.tipo);
                  return (
                    <Marker
                      key={punto.id}
                      position={{ lat: punto.lat, lng: punto.lng }}
                      title={`${punto.nombre} (${punto.tipo})`}
                      onClick={() => setSelectedPunto(punto)}
                      icon={{
                        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
                          `<svg width="30" height="30" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="15" cy="15" r="12" fill="${tipo?.color || '#666'}" stroke="white" stroke-width="2"/>
                            <text x="15" y="20" text-anchor="middle" font-size="12" fill="white">📍</text>
                          </svg>`
                        )}`,
                        scaledSize: new window.google.maps.Size(30, 30),
                        anchor: new window.google.maps.Point(15, 15)
                      }}
                    />
                  );
                })}
                
                {selectedPunto && (
                  <InfoWindow
                    position={{ lat: selectedPunto.lat, lng: selectedPunto.lng }}
                    onCloseClick={() => setSelectedPunto(null)}
                  >
                    <div className="info-window-login">
                      <h4>{selectedPunto.nombre}</h4>
                      <p><strong>Material:</strong> {selectedPunto.tipo}</p>
                      {selectedPunto.direccion && (
                        <p><strong>Dirección:</strong> {selectedPunto.direccion}</p>
                      )}
                      <p className="login-required">
                        🔒 Inicia sesión para más detalles
                      </p>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            </div>
          ) : (
            <div className="map-loading">Cargando mapa...</div>
          )}
        </div>
      </div>
    </div>
  );
}

function RegistrationModal({ userData, onRegister, onBack, loading, error, isLoaded }) {
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState(null);
  const [formData, setFormData] = useState({
    tiposReciclaje: [],
    ubicacion: null,
    direccion: '',
    telefono: '',
    horarios: ''
  });

  const tiposReciclaje = [
    { value: "Plástico", label: "🥤 Plástico", color: "#2196F3" },
    { value: "Vidrio", label: "🫙 Vidrio", color: "#4CAF50" },
    { value: "Cartón", label: "📦 Cartón", color: "#FF9800" },
    { value: "Papel", label: "📄 Papel", color: "#9C27B0" },
    { value: "Metal", label: "🥫 Metal", color: "#607D8B" }
  ];

  const handleMapClick = (e) => {
    if (selectedType === 'comercio') {
      setFormData({
        ...formData,
        ubicacion: {
          lat: e.latLng.lat(),
          lng: e.latLng.lng()
        }
      });
    }
  };

  const handleTipoReciclaje = (tipo) => {
    const newTipos = formData.tiposReciclaje.includes(tipo)
      ? formData.tiposReciclaje.filter(t => t !== tipo)
      : [...formData.tiposReciclaje, tipo];
    
    setFormData({ ...formData, tiposReciclaje: newTipos });
  };

  const handleSubmit = () => {
    if (selectedType === 'usuario') {
      onRegister('usuario');
    } else {
      if (!formData.ubicacion || formData.tiposReciclaje.length === 0) {
        window.showToast && window.showToast('Por favor completa todos los campos requeridos', 'warning');
        return;
      }
      onRegister('comercio', formData);
    }
  };

  return (
    <div className="registration-modal">
      <div className="registration-content">
        <button className="back-button" onClick={onBack} disabled={loading}>
          ← Volver
        </button>

        {step === 1 && (
          <div className="registration-step">
            <h2>¡Bienvenido {userData.nombre}! 👋</h2>
            <p>Parece que es tu primera vez aquí. ¿Cómo te gustaría registrarte?</p>

            {error && <div className="registration-error">{error}</div>}

            <div className="user-type-selection">
              <div 
                className={`user-type-card ${selectedType === 'usuario' ? 'selected' : ''}`}
                onClick={() => setSelectedType('usuario')}
              >
                <div className="card-icon">♻️</div>
                <h3>Soy Usuario</h3>
                <p>Quiero reciclar, acumular puntos y ganar premios</p>
                <ul>
                  <li>Registra tus reciclajes</li>
                  <li>Acumula puntos</li>
                  <li>Desbloquea logros</li>
                  <li>Encuentra puntos cercanos</li>
                </ul>
              </div>

              <div 
                className={`user-type-card ${selectedType === 'comercio' ? 'selected' : ''}`}
                onClick={() => setSelectedType('comercio')}
              >
                <div className="card-icon">🏪</div>
                <h3>Soy Comercio</h3>
                <p>Quiero ser un punto de reciclaje para la comunidad</p>
                <ul>
                  <li>Aparece en el mapa</li>
                  <li>Recibe materiales reciclables</li>
                  <li>Ayuda a la comunidad</li>
                  <li>Aumenta tu visibilidad</li>
                </ul>
              </div>
            </div>

            <div className="registration-actions">
              <button 
                className="continue-button"
                onClick={() => selectedType === 'usuario' ? handleSubmit() : setStep(2)}
                disabled={!selectedType || loading}
              >
                {loading ? 'Registrando...' : 'Continuar'}
              </button>
            </div>
          </div>
        )}

        {step === 2 && selectedType === 'comercio' && (
          <div className="registration-step">
            <h2>Configuración del Comercio 🏪</h2>
            <p>Completa la información de tu punto de reciclaje</p>

            <div className="form-group">
              <label>¿Qué tipos de materiales recibes?</label>
              <div className="tipos-grid">
                {tiposReciclaje.map(tipo => (
                  <div 
                    key={tipo.value}
                    className={`tipo-card ${formData.tiposReciclaje.includes(tipo.value) ? 'selected' : ''}`}
                    onClick={() => handleTipoReciclaje(tipo.value)}
                  >
                    {tipo.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Información adicional</label>
              <input
                type="text"
                placeholder="Dirección completa"
                value={formData.direccion}
                onChange={(e) => setFormData({...formData, direccion: e.target.value})}
              />
              <input
                type="text"
                placeholder="Teléfono (opcional)"
                value={formData.telefono}
                onChange={(e) => setFormData({...formData, telefono: e.target.value})}
              />
              <input
                type="text"
                placeholder="Horarios de atención (opcional)"
                value={formData.horarios}
                onChange={(e) => setFormData({...formData, horarios: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>Ubicación en el mapa *</label>
              <p className="map-instruction">Haz clic en el mapa para marcar la ubicación de tu comercio</p>
              
              {isLoaded ? (
                <div className="map-container-registration">
                  <GoogleMap
                    mapContainerStyle={{ width: "100%", height: "300px" }}
                    center={formData.ubicacion || { lat: -31.4173, lng: -64.1833 }}
                    zoom={13}
                    onClick={handleMapClick}
                  >
                    {formData.ubicacion && (
                      <Marker position={formData.ubicacion} />
                    )}
                  </GoogleMap>
                </div>
              ) : (
                <div className="map-loading">Cargando mapa...</div>
              )}
              
              {formData.ubicacion && (
                <p className="location-info">
                  📍 Ubicación seleccionada: {formData.ubicacion.lat.toFixed(6)}, {formData.ubicacion.lng.toFixed(6)}
                </p>
              )}
            </div>

            <div className="registration-actions">
              <button 
                className="back-step-button"
                onClick={() => setStep(1)}
                disabled={loading}
              >
                ← Atrás
              </button>
              <button 
                className="continue-button"
                onClick={handleSubmit}
                disabled={loading || !formData.ubicacion || formData.tiposReciclaje.length === 0}
              >
                {loading ? 'Registrando...' : 'Completar Registro'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LoginPage;
