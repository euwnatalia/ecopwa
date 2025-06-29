import { useState, useEffect } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  InfoWindow
} from "@react-google-maps/api";
import "./Map.css";

const API_KEY = "AIzaSyDogeXjIze7GDPF1IOOkgX3acOgBvPqPv0";
const CONTAINER_STYLE = { width: "100%", height: "70vh", minHeight: "500px" };
const DEFAULT_CENTER = { lat: -31.4173, lng: -64.1833 }; // Córdoba, Argentina

export default function MapView() {
  const [puntos, setPuntos] = useState([]);
  const [puntosOriginales, setPuntosOriginales] = useState([]);
  const [selected, setSelected] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [modoRegistro, setModoRegistro] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("activos");
  const [mostrarIntro, setMostrarIntro] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const tiposDisponibles = [
    { value: "Plástico", label: "🥤 Plástico", color: "#2196F3" },
    { value: "Vidrio", label: "🫙 Vidrio", color: "#4CAF50" },
    { value: "Cartón", label: "📦 Cartón", color: "#FF9800" },
    { value: "Papel", label: "📄 Papel", color: "#9C27B0" },
    { value: "Metal", label: "🥫 Metal", color: "#607D8B" }
  ];

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: API_KEY
  });

  // Obtener ubicación del usuario
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error obteniendo ubicación:", error);
        }
      );
    }
  }, []);

  // Cargar puntos del servidor
  const loadPuntos = async () => {
    setLoading(true);
    setError("");
    
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      
      if (filtroTipo) params.append('tipo', filtroTipo);
      if (userLocation) {
        params.append('lat', userLocation.lat);
        params.append('lng', userLocation.lng);
        params.append('radio', '100');
      }
      if (filtroEstado === 'todos') {
        params.append('incluirInactivos', 'true');
      }

      const response = await fetch(
        `http://localhost:4000/api/puntos?${params}`, 
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setPuntosOriginales(data);
      aplicarFiltros(data);
    } catch (err) {
      console.error("Error cargando puntos:", err);
      setError("Error al cargar puntos: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Aplicar filtros locales
  const aplicarFiltros = (puntosData = puntosOriginales) => {
    let puntosFiltrados = [...puntosData];

    // Filtrar por estado
    if (filtroEstado === 'activos') {
      puntosFiltrados = puntosFiltrados.filter(p => p.activo !== false);
    } else if (filtroEstado === 'inactivos') {
      puntosFiltrados = puntosFiltrados.filter(p => p.activo === false);
    }

    setPuntos(puntosFiltrados);
  };

  // Efectos para recargar cuando cambien filtros
  useEffect(() => {
    loadPuntos();
  }, [filtroTipo, userLocation]);

  useEffect(() => {
    aplicarFiltros();
  }, [filtroEstado, puntosOriginales]);

  // Obtener color del marcador según tipo y estado
  const getMarkerIcon = (punto) => {
    const tipo = tiposDisponibles.find(t => t.value === punto.tipo);
    const color = tipo?.color || '#666666';
    
    // Diferentes iconos según rating y estado
    let symbol = '📍';
    if (punto.activo === false) {
      symbol = '❌';
    } else if (punto.rating === 'excelente') {
      symbol = '⭐';
    } else if (punto.rating === 'bueno') {
      symbol = '👍';
    } else if (punto.rating === 'malo') {
      symbol = '⚠️';
    }
    
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
        `<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="15" fill="${color}" stroke="white" stroke-width="3"/>
          <text x="20" y="25" text-anchor="middle" font-size="16">${symbol}</text>
        </svg>`
      )}`,
      scaledSize: new window.google.maps.Size(40, 40),
      anchor: new window.google.maps.Point(20, 20)
    };
  };

  // Manejar clics en el mapa para registrar nuevos puntos
  const handleMapClick = async (e) => {
    if (!modoRegistro) return;
    
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    
    // Mostrar modal de registro (implementaremos después)
    registrarNuevoPunto(lat, lng);
  };

  const registrarNuevoPunto = async (lat, lng) => {
    const nombre = prompt("Nombre del punto de reciclaje:");
    if (!nombre) return;

    const tipoOptions = tiposDisponibles.map(t => t.value).join(", ");
    const tipo = prompt(`Tipo de material (${tipoOptions}):`);
    if (!tipo || !tiposDisponibles.find(t => t.value === tipo)) {
      alert("Tipo inválido. Debe ser uno de: " + tipoOptions);
      return;
    }

    const direccion = prompt("Dirección (opcional):") || "";

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:4000/api/puntos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ nombre, lat, lng, tipo, direccion })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || response.statusText);
      }

      alert("✅ Punto registrado exitosamente!");
      setModoRegistro(false);
      loadPuntos();
    } catch (err) {
      alert("Error al registrar punto: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Validar punto
  const validarPunto = async (puntoId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:4000/api/puntos/${puntoId}/validar`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || response.statusText);
      }

      const result = await response.json();
      alert(`✅ ${result.message}`);
      loadPuntos();
    } catch (err) {
      alert("Error al validar punto: " + err.message);
    }
  };

  // Invalidar punto
  const invalidarPunto = async (puntoId) => {
    const motivo = prompt(
      "¿Por qué invalidas este punto?\n" +
      "- Ya no existe\n" +
      "- Ubicación incorrecta\n" +
      "- No acepta este material\n" +
      "- Otro motivo:"
    );
    
    if (!motivo) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:4000/api/puntos/${puntoId}/invalidar`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ motivo })
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || response.statusText);
      }

      const result = await response.json();
      alert(`⚠️ ${result.message}`);
      loadPuntos();
    } catch (err) {
      alert("Error al invalidar punto: " + err.message);
    }
  };

  if (loadError) return <div className="map-error">Error al cargar Google Maps</div>;
  if (!isLoaded) return <div className="map-loading">Cargando mapa...</div>;

  return (
    <div className="map-container">
      {/* Intro explicativa */}
      {mostrarIntro && (
        <div className="map-intro">
          <div className="intro-content">
            <h1>🗺️ Mapa Colaborativo de Reciclaje</h1>
            <p>Descubre, registra y valida puntos de reciclaje en tu zona</p>
            
            <div className="intro-features">
              <div className="feature">
                <span className="feature-icon">🔍</span>
                <div>
                  <h3>Explorar Puntos</h3>
                  <p>Encuentra puntos de reciclaje cercanos con filtros por material y estado</p>
                </div>
              </div>
              
              <div className="feature">
                <span className="feature-icon">➕</span>
                <div>
                  <h3>Registrar Nuevos</h3>
                  <p>Haz clic en el mapa para agregar puntos que conozcas</p>
                </div>
              </div>
              
              <div className="feature">
                <span className="feature-icon">✅</span>
                <div>
                  <h3>Validar Puntos</h3>
                  <p>Ayuda a la comunidad validando si los puntos siguen activos</p>
                </div>
              </div>
            </div>
            
            <button 
              className="btn-close-intro"
              onClick={() => setMostrarIntro(false)}
            >
              ¡Entendido, empezar!
            </button>
          </div>
        </div>
      )}

      {!mostrarIntro && (
        <>
          {/* Controles y filtros */}
          <div className="map-header">
            <div className="map-title">
              <h1>🗺️ Mapa de Reciclaje</h1>
              <button 
                className="btn-help"
                onClick={() => setMostrarIntro(true)}
              >
                ❓ Ayuda
              </button>
            </div>

            <div className="map-controls">
              {/* Modo registro */}
              <button
                className={`btn-register ${modoRegistro ? "active" : ""}`}
                onClick={() => setModoRegistro(!modoRegistro)}
                disabled={loading}
              >
                {modoRegistro ? "📍 Haz clic en el mapa" : "➕ Registrar Punto"}
              </button>

              {/* Filtro por tipo */}
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="filter-select"
                disabled={loading}
              >
                <option value="">🔍 Todos los materiales</option>
                {tiposDisponibles.map(t => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>

              {/* Filtro por estado */}
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="filter-select"
                disabled={loading}
              >
                <option value="activos">✅ Solo activos</option>
                <option value="todos">🔍 Todos</option>
                <option value="inactivos">❌ Solo inactivos</option>
              </select>

              {/* Contador de puntos */}
              <div className="points-counter">
                📍 {puntos.length} punto{puntos.length !== 1 ? 's' : ''}
                {loading && " (cargando...)"}
              </div>
            </div>
          </div>

          {/* Errores */}
          {error && (
            <div className="map-error">
              {error}
              <button onClick={loadPuntos}>🔄 Reintentar</button>
            </div>
          )}

          {/* Mapa */}
          <div className="map-frame">
            <GoogleMap
              mapContainerStyle={CONTAINER_STYLE}
              center={userLocation || DEFAULT_CENTER}
              zoom={userLocation ? 13 : 11}
              onClick={handleMapClick}
              options={{
                zoomControl: true,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: true
              }}
            >
              {/* Marcador de usuario */}
              {userLocation && (
                <Marker
                  position={userLocation}
                  icon={{
                    url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
                      '<svg width="30" height="30" xmlns="http://www.w3.org/2000/svg">' +
                      '<circle cx="15" cy="15" r="10" fill="#2196F3" stroke="white" stroke-width="3"/>' +
                      '<circle cx="15" cy="15" r="3" fill="white"/>' +
                      '</svg>'
                    ),
                    scaledSize: new window.google.maps.Size(30, 30),
                    anchor: new window.google.maps.Point(15, 15)
                  }}
                  title="Tu ubicación"
                />
              )}

              {/* Marcadores de puntos */}
              {puntos.map(punto => (
                <Marker
                  key={punto.id}
                  position={{ lat: punto.lat, lng: punto.lng }}
                  icon={isLoaded ? getMarkerIcon(punto) : undefined}
                  onClick={() => setSelected(punto)}
                  title={`${punto.nombre} (${punto.tipo})`}
                />
              ))}

              {/* InfoWindow del punto seleccionado */}
              {selected && (
                <InfoWindow
                  position={{ lat: selected.lat, lng: selected.lng }}
                  onCloseClick={() => setSelected(null)}
                >
                  <div className="info-window">
                    <h4>{selected.nombre}</h4>
                    <div className="info-details">
                      <p><strong>Material:</strong> {selected.tipo}</p>
                      {selected.direccion && (
                        <p><strong>Dirección:</strong> {selected.direccion}</p>
                      )}
                      {selected.distancia && (
                        <p><strong>Distancia:</strong> {selected.distancia.toFixed(1)}km</p>
                      )}
                      
                      {/* Estado y rating */}
                      <div className="punto-status">
                        <span className={`status ${selected.activo !== false ? 'activo' : 'inactivo'}`}>
                          {selected.activo !== false ? '✅ Activo' : '❌ Inactivo'}
                        </span>
                        <span className={`rating rating-${selected.rating}`}>
                          {selected.rating === 'nuevo' && '🆕 Nuevo'}
                          {selected.rating === 'excelente' && '⭐ Excelente'}
                          {selected.rating === 'bueno' && '👍 Bueno'}
                          {selected.rating === 'regular' && '🤔 Regular'}
                          {selected.rating === 'malo' && '⚠️ Malo'}
                        </span>
                      </div>

                      {/* Estadísticas */}
                      <div className="punto-stats">
                        <span className="stat-validaciones">
                          👍 {selected.validaciones || 0}
                        </span>
                        <span className="stat-invalidaciones">
                          👎 {selected.invalidaciones || 0}
                        </span>
                      </div>

                      {/* Acciones */}
                      <div className="punto-actions">
                        {selected.activo !== false && (
                          <>
                            <button 
                              className="btn-action btn-validar"
                              onClick={() => validarPunto(selected.id)}
                            >
                              👍 Validar
                            </button>
                            <button 
                              className="btn-action btn-invalidar"
                              onClick={() => invalidarPunto(selected.id)}
                            >
                              👎 Reportar
                            </button>
                          </>
                        )}
                        {selected.activo === false && selected.creadoPor === 'usuario_actual' && (
                          <button 
                            className="btn-action btn-reactivar"
                            onClick={() => {/* implementar reactivar */}}
                          >
                            🔄 Reactivar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          </div>
        </>
      )}
    </div>
  );
}


