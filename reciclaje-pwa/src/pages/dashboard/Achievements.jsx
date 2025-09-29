import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import API_URL from "../../config/api.js";
import "./Achievements.css";

function Achievements({ userDetails }) {
  if (!userDetails) {
    return (
      <div className="achievements-container">
        <div className="error-state">
          <h2>❌ Error de autenticación</h2>
          <p>No se pudieron cargar los detalles del usuario. Por favor, intenta recargar la página o cerrar sesión y volver a entrar.</p>
        </div>
      </div>
    );
  }

  const location = useLocation();
  const initialTab = location.state?.initialTab || "resumen";

  const [historial, setHistorial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [vistaActual, setVistaActual] = useState(initialTab);
  const [highlightTab, setHighlightTab] = useState(false);

  useEffect(() => {
    cargarHistorial();
  }, []);

  // Actualizar la vista cuando cambien los parámetros de navegación
  useEffect(() => {
    if (location.state?.initialTab) {
      setVistaActual(location.state.initialTab);
      setHighlightTab(true);
      
      // Remover el highlight después de 2 segundos
      const timer = setTimeout(() => {
        setHighlightTab(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  const cargarHistorial = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const isComercio = userDetails?.tipo === 'comercio';
      
      const endpoint = isComercio
        ? `${API_URL}/reciclajes/comercio/estadisticas`
        : `${API_URL}/reciclajes/historial`;

      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setHistorial(data);
    } catch (err) {
      setError("Error al cargar el historial: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatearFecha = (fechaISO) => {
    if (!fechaISO) return 'Fecha no disponible';

    if (typeof fechaISO === 'object') {
      return 'Fecha no disponible';
    }

    const fecha = new Date(fechaISO);

    if (isNaN(fecha.getTime())) {
      return 'Fecha inválida';
    }

    return fecha.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatearMes = (mesString) => {
    if (!mesString || typeof mesString !== 'string') return 'Mes no disponible';
    try {
      const [year, month] = mesString.split('-');
      if (!year || !month) return 'Mes no disponible';
      const fecha = new Date(parseInt(year), parseInt(month) - 1);
      if (isNaN(fecha.getTime())) return 'Mes inválido';
      return fecha.toLocaleDateString('es-AR', {
        year: 'numeric',
        month: 'long'
      });
    } catch (error) {
      return 'Error en formato de mes';
    }
  };

  const obtenerEmojiTipo = (tipo) => {
    const emojis = {
      'Plástico': '🥤',
      'Vidrio': '🫙',
      'Cartón': '📦',
      'Papel': '📄',
      'Metal': '🥫'
    };
    return emojis[tipo] || '♻️';
  };

  const obtenerColorCategoria = (categoria) => {
    const colores = {
      'cantidad': '#4CAF50',
      'peso': '#2196F3',
      'diversidad': '#FF9800',
      'explorador': '#9C27B0',
      'puntos': '#FFD700',
      'especial': '#F44336'
    };
    return colores[categoria] || '#666';
  };

  if (loading) {
    return (
      <div className="achievements-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Cargando tu historial eco... 🌱</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="achievements-container">
        <div className="error-state">
          <h2>❌ Oops!</h2>
          <p>{error}</p>
          <button className="btn-retry" onClick={cargarHistorial}>
            🔄 Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!historial) {
    return (
      <div className="achievements-container">
        <div className="empty-state">
          <h2>🌱 ¡Comienza tu Historia Eco!</h2>
          <p>Aún no tienes reciclajes registrados. ¡Ve al escáner para empezar!</p>
        </div>
      </div>
    );
  }

  const { estadisticas = {}, logros = [], reciclajes = [] } = historial || {};
  const isComercio = userDetails?.tipo === 'comercio';

  return (
    <div className="achievements-container">
      <header className="achievements-header">
        <h1>{isComercio ? '🏪 Estadísticas del Comercio' : '🏆 Mi Historia Eco'}</h1>
        <p className="subtitle">
          {isComercio 
            ? 'Tu contribución al medio ambiente y la comunidad' 
            : 'Tu impacto en el mundo, un reciclaje a la vez'
          }
        </p>
        
        <nav className="achievements-nav">
          <button 
            className={`nav-btn ${vistaActual === 'resumen' ? 'active' : ''} ${highlightTab && vistaActual === 'resumen' ? 'highlight' : ''}`}
            onClick={() => setVistaActual('resumen')}
          >
            📊 Resumen
          </button>
          <button 
            className={`nav-btn ${vistaActual === 'historial' ? 'active' : ''} ${highlightTab && vistaActual === 'historial' ? 'highlight' : ''}`}
            onClick={() => setVistaActual('historial')}
          >
            📝 Historial
          </button>
          <button 
            className={`nav-btn ${vistaActual === 'logros' ? 'active' : ''} ${highlightTab && vistaActual === 'logros' ? 'highlight' : ''}`}
            onClick={() => setVistaActual('logros')}
          >
            🎖️ Logros
          </button>
        </nav>
      </header>

      {/* Vista Resumen */}
      {vistaActual === 'resumen' && (
        <div className="vista-resumen">
          {/* Estadísticas principales */}
          <div className="stats-grid">
            <div className="stat-card primary">
              <div className="stat-icon">{isComercio ? '🏪' : '🎯'}</div>
              <div className="stat-content">
                <h3>{Number(estadisticas.totalReciclajes) || 0}</h3>
                <p>{isComercio ? 'Reciclajes Procesados' : 'Reciclajes Totales'}</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">⚖️</div>
              <div className="stat-content">
                <h3>{(Number(estadisticas.pesoTotal) || 0).toFixed(1)}kg</h3>
                <p>{isComercio ? 'Peso Total Recibido' : 'Peso Total Reciclado'}</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">{isComercio ? '🎁' : '💎'}</div>
              <div className="stat-content">
                <h3>{isComercio ? (Number(estadisticas.puntosOtorgados) || 0) : (Number(estadisticas.puntosTotal) || 0)}</h3>
                <p>{isComercio ? 'Puntos Otorgados' : 'Puntos Ganados'}</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">{isComercio ? '👥' : '🗺️'}</div>
              <div className="stat-content">
                <h3>{isComercio ? (Number(estadisticas.usuariosAtendidos) || 0) : (Number(estadisticas.puntosVisitados) || 0)}</h3>
                <p>{isComercio ? 'Usuarios Atendidos' : 'Puntos Visitados'}</p>
              </div>
            </div>
          </div>

          {/* Tipos de materiales */}
          <div className="section-card">
            <h2>🎨 {isComercio ? 'Materiales Recibidos' : 'Materiales Reciclados'}</h2>
            <div className="materiales-grid">
              {(() => {
                const materiales = isComercio ? (estadisticas?.tiposRecibidos || {}) : (estadisticas?.tiposReciclados || {});

                if (typeof materiales === 'object' && !Array.isArray(materiales) && Object.keys(materiales).length > 0) {
                  return Object.entries(materiales).map(([tipo, cantidad]) => (
                    <div key={tipo} className="material-item">
                      <span className="material-emoji">{obtenerEmojiTipo(tipo)}</span>
                      <div className="material-info">
                        <strong>{tipo}</strong>
                        <span>{isComercio ? `${Number(cantidad).toFixed(1)}kg` : `${Number(cantidad)} veces`}</span>
                      </div>
                    </div>
                  ));
                }
                return null;
              })()}
              {(!estadisticas || Object.keys(isComercio ? (estadisticas?.tiposRecibidos || {}) : (estadisticas?.tiposReciclados || {})).length === 0) && (
                <p className="empty-text">{isComercio ? 'Aún no has recibido materiales' : 'Aún no has reciclado ningún material'}</p>
              )}
            </div>
          </div>

          {/* Sección de impacto ambiental para comercios */}
          {isComercio && estadisticas.impactoAmbiental && (
            <div className="section-card">
              <h2>🌍 Impacto Ambiental</h2>
              <div className="impact-grid">
                <div className="impact-item">
                  <div className="impact-icon">💨</div>
                  <div className="impact-info">
                    <strong>{Number(estadisticas.impactoAmbiental?.co2Ahorrado) || 0}kg</strong>
                    <span>CO2 Ahorrado</span>
                  </div>
                </div>
                <div className="impact-item">
                  <div className="impact-icon">⚡</div>
                  <div className="impact-info">
                    <strong>{Number(estadisticas.impactoAmbiental?.energiaAhorrada) || 0}kWh</strong>
                    <span>Energía Ahorrada</span>
                  </div>
                </div>
                <div className="impact-item">
                  <div className="impact-icon">💧</div>
                  <div className="impact-info">
                    <strong>{Number(estadisticas.impactoAmbiental?.aguaAhorrada) || 0}L</strong>
                    <span>Agua Ahorrada</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Información adicional */}
          <div className="info-grid">
            <div className="info-card">
              <h3>📅 Tu Trayectoria</h3>
              <div className="info-list">
                <div className="info-item">
                  <span className="info-label">Primer reciclaje:</span>
                  <span>{estadisticas?.primerReciclaje ? formatearFecha(estadisticas.primerReciclaje) : 'No disponible'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Último reciclaje:</span>
                  <span>{estadisticas?.ultimoReciclaje ? formatearFecha(estadisticas.ultimoReciclaje) : 'No disponible'}</span>
                </div>
                {estadisticas.mejorMes?.mes && (
                  <div className="info-item">
                    <span className="info-label">Mejor mes:</span>
                    <span>{formatearMes(estadisticas.mejorMes.mes)} ({estadisticas.mejorMes.cantidad || 0} reciclajes)</span>
                  </div>
                )}
              </div>
            </div>

            <div className="info-card">
              <h3>🔥 Rachas</h3>
              <div className="info-list">
                <div className="info-item">
                  <span className="info-label">Racha actual:</span>
                  <span>{Number(estadisticas?.rachaActual) || 0} días</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Mejor racha:</span>
                  <span>{Number(estadisticas?.mejorRacha) || 0} días</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vista Historial */}
      {vistaActual === 'historial' && (
        <div className="vista-historial">
          <div className="section-header">
            <h2>📝 {isComercio ? 'Reciclajes Recibidos en tu Comercio' : 'Historial Completo'}</h2>
            <p>{reciclajes.length} {isComercio ? 'reciclajes procesados' : 'reciclajes registrados'}</p>
          </div>
          
          <div className="historial-list">
            {reciclajes.map((reciclaje, index) => (
              <div key={reciclaje.id} className="historial-item">
                <div className="historial-icon">
                  {obtenerEmojiTipo(reciclaje.tipo)}
                </div>
                <div className="historial-content">
                  <div className="historial-header">
                    <h4>{reciclaje.tipo} - {reciclaje.cantidad}kg</h4>
                    <span className="historial-fecha">
                      {formatearFecha(reciclaje.fechaCreacion)}
                    </span>
                  </div>
                  <div className="historial-details">
                    {isComercio ? (
                      <>
                        <span className="historial-usuario">
                          👤 Usuario: {reciclaje.usuario || 'Usuario anónimo'}
                        </span>
                        {reciclaje.puntosObtenidos && (
                          <span className="historial-puntos">
                            💎 Puntos otorgados: +{reciclaje.puntosObtenidos}
                          </span>
                        )}
                        <span className="historial-comercio">
                          🏪 Procesado en tu comercio
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="historial-punto">
                          📍 {reciclaje.puntoReciclaje?.nombre || 'Punto no especificado'}
                        </span>
                        {reciclaje.puntosObtenidos && (
                          <span className="historial-puntos">
                            💎 +{reciclaje.puntosObtenidos} puntos
                          </span>
                        )}
                        {reciclaje.distancia && (
                          <span className="historial-distancia">
                            📏 {reciclaje.distancia.toFixed(1)}km
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  {reciclaje.codigo && (
                    <div className="historial-codigo">
                      <span>🏷️ Código: {reciclaje.codigo}</span>
                    </div>
                  )}
                </div>
                <div className="historial-number">
                  #{reciclajes.length - index}
                </div>
              </div>
            ))}
            
            {reciclajes.length === 0 && (
              <div className="empty-historial">
                <div className="empty-icon">📦</div>
                <h3>{isComercio ? 'No has recibido reciclajes aún' : 'No hay reciclajes aún'}</h3>
                <p>{isComercio ? '¡Cuando proceses tu primer reciclaje aparecerá aquí!' : '¡Comienza escaneando tu primer producto!'}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vista Logros */}
      {vistaActual === 'logros' && (
        <div className="vista-logros">
          <div className="section-header">
            <h2>🎖️ Logros Desbloqueados</h2>
            <p>{logros.length} logros conseguidos</p>
          </div>
          
          <div className="logros-por-categoria">
            {['cantidad', 'peso', 'diversidad', 'explorador', 'puntos', 'especial'].map(categoria => {
              const logrosCategoria = logros.filter(l => l.categoria === categoria);
              if (logrosCategoria.length === 0) return null;
              
              return (
                <div key={categoria} className="categoria-section">
                  <h3 className="categoria-titulo">
                    <span 
                      className="categoria-color" 
                      style={{ backgroundColor: obtenerColorCategoria(categoria) }}
                    ></span>
                    {categoria.charAt(0).toUpperCase() + categoria.slice(1)}
                  </h3>
                  
                  <div className="logros-grid">
                    {logrosCategoria.map(logro => (
                      <div key={logro.id} className="logro-card">
                        <div className="logro-header">
                          <h4>{logro.titulo}</h4>
                          <span className="logro-badge">✅</span>
                        </div>
                        <p className="logro-descripcion">{logro.descripcion}</p>
                        {logro.fecha && (
                          <span className="logro-fecha">
                            🗓️ {formatearFecha(logro.fecha)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          
          {logros.length === 0 && (
            <div className="empty-logros">
              <div className="empty-icon">🏆</div>
              <h3>Aún no tienes logros</h3>
              <p>¡Comienza a reciclar para desbloquear increíbles logros!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Achievements;
