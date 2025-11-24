import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  InfoWindow
} from "@react-google-maps/api";
import API_URL from "../../config/api.js";
import PuntoForm from "../../components/PuntoForm.jsx";
import { MATERIALES, getMaterialByValue } from "../../constants/materiales.js";
import "./Map.css";
import "../../styles/map-popups-optimization.css";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const CONTAINER_STYLE = { width: "100%", height: "70vh", minHeight: "500px" };
const DEFAULT_CENTER = { lat: -31.4173, lng: -64.1833 }; // Córdoba, Argentina

export default function MapView() {
  const { onLogout } = useOutletContext();

  // Función para manejar errores 401 automáticamente
  const handleUnauthorized = () => {
    if (onLogout) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      onLogout();
    }
  };
  const [puntos, setPuntos] = useState([]);
  const [puntosOriginales, setPuntosOriginales] = useState([]);
  const [selected, setSelected] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [modoRegistro, setModoRegistro] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("activos");
  const [mostrarIntro, setMostrarIntro] = useState(() => {
    const hasSeenIntro = localStorage.getItem('mapIntroSeen');
    return !hasSeenIntro;
  });
  const [mostrarTooltip, setMostrarTooltip] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [puntoTemporal, setPuntoTemporal] = useState(null);
  const [mostrarModalReporte, setMostrarModalReporte] = useState(false);
  const [puntoAReportar, setPuntoAReportar] = useState(null);


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
        `${API_URL}/puntos?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

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

  // Actualización automática cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      if (!mostrarFormulario && !mostrarModalReporte && !loading) {
        loadPuntos();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [mostrarFormulario, mostrarModalReporte, loading]);

  // Obtener color del marcador según tipo y estado
  const getMarkerIcon = (punto) => {
    // Soporte para múltiples materiales
    let color = '#666666'; // color por defecto
    
    if (Array.isArray(punto.tipos) && punto.tipos.length > 0) {
      // Si tiene múltiples tipos, usar el color del primer tipo
      const material = getMaterialByValue(punto.tipos[0]);
      color = material.color;
    } else if (punto.tipo) {
      // Compatibilidad con formato antiguo
      const material = getMaterialByValue(punto.tipo);
      color = material.color;
    }
    
    // Usar icono del material en lugar de simbolos genericos

    let symbol = '♻️'; // icono por defecto

    if (punto.activo === false) {
      symbol = '❌'; // mantener X para puntos inactivos
    } else if (Array.isArray(punto.tipos) && punto.tipos.length > 0) {
      // Usar el icono del primer material
      const material = getMaterialByValue(punto.tipos[0]);
      symbol = material.icon;
    } else if (punto.tipo) {
      // Compatibilidad con formato antiguo
      const material = getMaterialByValue(punto.tipo);
      symbol = material.icon;
    }    
    // Si tiene múltiples tipos, agregar indicador
    const isMultiple = (Array.isArray(punto.tipos) && punto.tipos.length > 1);
    
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
        `<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="15" fill="${color}" stroke="white" stroke-width="3"/>
          ${isMultiple ? '<circle cx="32" cy="8" r="6" fill="#FF9800" stroke="white" stroke-width="2"/>' : ''}
          <text x="20" y="25" text-anchor="middle" font-size="16">${symbol}</text>
          ${isMultiple ? '<text x="32" y="12" text-anchor="middle" font-size="10" fill="white">+</text>' : ''}
        </svg>`
      )}`,
      scaledSize: new window.google.maps.Size(40, 40),
      anchor: new window.google.maps.Point(20, 20)
    };
  };

  // Función para obtener dirección desde coordenadas
  const obtenerDireccion = async (lat, lng) => {
    try {
      const geocoder = new window.google.maps.Geocoder();
      const response = await geocoder.geocode({
        location: { lat, lng }
      });
      
      if (response.results && response.results[0]) {
        return response.results[0].formatted_address;
      }
      return "";
    } catch (error) {
      console.error("Error obteniendo dirección:", error);
      return "";
    }
  };

  // Manejar clics en el mapa para registrar nuevos puntos
  const handleMapClick = async (e) => {
    // Solo registrar si está en modo registro y no hay formulario abierto
    if (!modoRegistro || mostrarFormulario) {
      // Si hay un punto seleccionado y hacemos click fuera, cerrarlo
      if (selected && !modoRegistro) {
        setSelected(null);
      }
      return;
    }

    const lat = e.latLng.lat();
    const lng = e.latLng.lng();

    setLoading(true);
    const direccion = await obtenerDireccion(lat, lng);

    setPuntoTemporal({ lat, lng, direccion });
    setMostrarFormulario(true);
    setLoading(false);
  };

  const handleSubmitPunto = async (formData) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/puntos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || response.statusText);
      }

      window.showToast && window.showToast("Punto registrado exitosamente", "success");
      setMostrarFormulario(false);
      setPuntoTemporal(null);
      setModoRegistro(false);
      loadPuntos();
    } catch (err) {
      window.showToast && window.showToast("Error al registrar punto: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelForm = () => {
    setMostrarFormulario(false);
    setPuntoTemporal(null);
  };

  // Validar punto
  const validarPunto = async (puntoId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_URL}/puntos/${puntoId}/validar`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || response.statusText);
      }


      const result = await response.json();
      window.showToast && window.showToast(result.message, "success");

      // Actualizar el punto seleccionado si es el mismo
      if (selected && selected.id === puntoId) {
        setSelected({
          ...selected,
          validaciones: result.validaciones,
          invalidaciones: result.invalidaciones,
          rating: result.rating
        });
      }

      loadPuntos();
    } catch (err) {
      window.showToast && window.showToast("Error al validar punto: " + err.message, "error");
    }
  };

  // Mostrar modal de reporte
  const mostrarReporte = (punto) => {
    setPuntoAReportar(punto);
    setMostrarModalReporte(true);
  };

  // Invalidar punto con motivo
  const invalidarPunto = async (motivo) => {
    if (!puntoAReportar || !motivo) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_URL}/puntos/${puntoAReportar.id}/invalidar`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ motivo })
        }
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || response.statusText);
      }

      const result = await response.json();
      window.showToast && window.showToast(result.message, "warning");

      // Actualizar el punto seleccionado si es el mismo
      if (selected && selected.id === puntoAReportar.id) {
        setSelected({
          ...selected,
          validaciones: result.validaciones,
          invalidaciones: result.invalidaciones,
          rating: result.rating,
          activo: result.activo,
          motivoReporte: result.activo === false ? motivo : selected.motivoReporte,
          fechaReporte: result.activo === false ? new Date().toISOString() : selected.fechaReporte
        });
      }

      setMostrarModalReporte(false);
      setPuntoAReportar(null);
      loadPuntos();
    } catch (err) {
      window.showToast && window.showToast("Error al reportar punto: " + err.message, "error");
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
              onClick={() => {
                setMostrarIntro(false);
                const hasSeenIntro = localStorage.getItem('mapIntroSeen');
                if (!hasSeenIntro) {
                  localStorage.setItem('mapIntroSeen', 'true');
                  setMostrarTooltip(true);
                  setTimeout(() => setMostrarTooltip(false), 4000);
                }
              }}
            >
              ¡Entendido, empezar!
            </button>
          </div>
        </div>
      )}

      {!mostrarIntro && (
        <>
          {/* Tooltip de ayuda */}
          {mostrarTooltip && (
            <div className="help-tooltip">
              <span>💡 Puedes ver la ayuda nuevamente presionando el botón ❓</span>
            </div>
          )}

          {/* Controles y filtros */}
          <div className="map-header">
            <div className="map-title">
              <h1>🗺️ Mapa de Reciclaje</h1>
              <button
                className={`btn-help ${mostrarTooltip ? 'pulse' : ''}`}
                onClick={() => setMostrarIntro(true)}
                title="Ver instrucciones"
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
                {MATERIALES.map(material => (
                  <option key={material.value} value={material.value}>
                    {material.label}
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
                fullscreenControl: true,
                clickableIcons: false
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
                  title={`${punto.nombre}${Array.isArray(punto.tipos) ? ` (${punto.tipos.length} materiales)` : punto.tipo ? ` (${punto.tipo})` : ''}`}
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
                      {/* Mostrar tipos de materiales */}
                      <div className="materiales-info">
                        <strong>Materiales:</strong>
                        <div className="materiales-list">
                          {Array.isArray(selected.tipos) && selected.tipos.length > 0 ? (
                            selected.tipos.map(tipo => {
                              const material = getMaterialByValue(tipo);
                              return (
                                <span key={tipo} className="material-tag" style={{backgroundColor: material.color}}>
                                  {material.label}
                                </span>
                              );
                            })
                          ) : selected.tipo ? (
                            <span className="material-tag" style={{backgroundColor: getMaterialByValue(selected.tipo).color}}>
                              {getMaterialByValue(selected.tipo).label}
                            </span>
                          ) : (
                            <span className="no-materials">Sin información de materiales</span>
                          )}
                        </div>
                      </div>
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
                      {/* Mostrar motivo del reporte si está inactivo o tiene reportes */}
                      {(selected.activo === false || selected.motivoReporte || selected.ultimoMotivoInvalidacion) && (
                        <div className="reporte-info" style={{
                          backgroundColor: selected.activo === false ? "#ffebee" : "#fff3e0",
                          padding: "0.5rem",
                          borderRadius: "8px",
                          marginTop: "0.5rem",
                          border: selected.activo === false ? "1px solid #ffcdd2" : "1px solid #ffe0b2"
                        }}>
                          <p style={{
                            margin: 0,
                            fontSize: "0.85rem",
                            color: selected.activo === false ? "#c62828" : "#ef6c00"
                          }}>
                            <strong>{selected.activo === false ? "❌ Punto inactivo" : "⚠️ Último reporte"}:</strong>
                            <br />
                            {selected.motivoReporte || selected.ultimoMotivoInvalidacion || "Sin motivo especificado"}
                          </p>
                          {(selected.fechaReporte || selected.fechaUltimaInvalidacion) && (
                            <p style={{
                              margin: "0.25rem 0 0 0",
                              fontSize: "0.75rem",
                              color: "#666"
                            }}>
                              {selected.activo === false ? "Inactivado" : "Reportado"}: {new Date(selected.fechaReporte || selected.fechaUltimaInvalidacion).toLocaleDateString()}
                            </p>
                          )}
                          {selected.reportes && selected.reportes.length > 1 && (
                            <p style={{
                              margin: "0.25rem 0 0 0",
                              fontSize: "0.75rem",
                              color: "#666",
                              fontStyle: "italic"
                            }}>
                              📊 {selected.reportes.length} reportes total
                            </p>
                          )}
                        </div>
                      )}

                      {/* Estadísticas */}
                      <div className="punto-stats">
                        <span className="stat-validaciones">
                          👍 {selected.validaciones || 0}
                        </span>
                        <span className="stat-invalidaciones">
                          👎 {selected.invalidaciones || 0}
                        </span>
                      </div>

                      {/* Acciones - Botones sin emojis */}
                      <div className="punto-actions">
                        {selected.activo !== false && (
                          <>
                            <button
                              className="btn-action btn-validar"
                              onClick={() => validarPunto(selected.id)}
                            >
                              Validar
                            </button>
                            <button
                              className="btn-action btn-invalidar"
                              onClick={() => mostrarReporte(selected)}
                            >
                              Reportar
                            </button>
                          </>
                        )}
                        {selected.activo === false && selected.creadoPor === 'usuario_actual' && (
                          <button
                            className="btn-action btn-reactivar"
                            onClick={() => {/* implementar reactivar */}}
                          >
                            Reactivar
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

      {/* Modal para crear punto */}
      {mostrarFormulario && puntoTemporal && (
        <div className="modal-overlay" onClick={handleCancelForm}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <PuntoForm
              onSubmit={handleSubmitPunto}
              onCancel={handleCancelForm}
              initialData={puntoTemporal}
              isLoading={loading}
              title="Agregar Punto de Reciclaje"
            />
          </div>
        </div>
      )}

      {/* Modal para reportar punto */}
      {mostrarModalReporte && puntoAReportar && (
        <ReportModal
          punto={puntoAReportar}
          onReport={invalidarPunto}
          onCancel={() => {
            setMostrarModalReporte(false);
            setPuntoAReportar(null);
          }}
          isLoading={loading}
        />
      )}
    </div>
  );
}

// Componente Modal de Reporte
function ReportModal({ punto, onReport, onCancel, isLoading }) {
  const [selectedMotivo, setSelectedMotivo] = useState('');
  const [otroMotivo, setOtroMotivo] = useState('');

  const motivosComunes = [
    { id: 'no_existe', label: 'Ya no existe', icon: '🚫' },
    { id: 'ubicacion_incorrecta', label: 'Ubicación incorrecta', icon: '📍' },
    { id: 'no_acepta_material', label: 'No acepta este material', icon: '❌' },
    { id: 'cerrado_permanente', label: 'Cerrado permanentemente', icon: '🔒' },
    { id: 'horarios_incorrectos', label: 'Horarios incorrectos', icon: '⏰' },
    { id: 'otro', label: 'Otro motivo', icon: '💬' }
  ];

  const handleSubmit = () => {
    const motivo = selectedMotivo === 'otro' ? otroMotivo : 
                   motivosComunes.find(m => m.id === selectedMotivo)?.label || '';
    
    if (!motivo.trim()) {
      window.showToast && window.showToast('Por favor seleccioná un motivo', 'warning');
      return;
    }

    onReport(motivo);
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="report-header">
          <h3>🚨 Reportar Punto</h3>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>
        
        <div className="report-content">
          <div className="punto-info">
            <h4>{punto.nombre}</h4>
            <p>{punto.direccion}</p>
          </div>

          <div className="motivos-section">
            <h4>¿Cuál es el problema?</h4>
            <div className="motivos-grid">
              {motivosComunes.map(motivo => (
                <label 
                  key={motivo.id} 
                  className={`motivo-option ${selectedMotivo === motivo.id ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="motivo"
                    value={motivo.id}
                    checked={selectedMotivo === motivo.id}
                    onChange={(e) => setSelectedMotivo(e.target.value)}
                  />
                  <div className="motivo-content">
                    <span className="motivo-icon">{motivo.icon}</span>
                    <span className="motivo-text">{motivo.label}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {selectedMotivo === 'otro' && (
            <div className="otro-motivo">
              <label htmlFor="otro-motivo-text">Describí el problema:</label>
              <textarea
                id="otro-motivo-text"
                value={otroMotivo}
                onChange={(e) => setOtroMotivo(e.target.value)}
                placeholder="Explicanos qué problema tiene este punto..."
                rows={3}
                maxLength={200}
              />
              <div className="char-count">{otroMotivo.length}/200</div>
            </div>
          )}

          <div className="report-actions">
            <button 
              className="btn-cancel" 
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button 
              className="btn-report" 
              onClick={handleSubmit}
              disabled={isLoading || !selectedMotivo}
            >
              {isLoading ? 'Reportando...' : '🚨 Reportar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


