import { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { auth } from "../../firebase/firebase";
import { onAuthStateChanged, updateProfile } from "firebase/auth";
import { userService } from "../../services/userService";
import API_URL from "../../config/api.js";
import "./Profile.css";

function Profile() {
  const navigate = useNavigate();
  const { userDetails, onLogout } = useOutletContext();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [avatarError, setAvatarError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [commerceStats, setCommerceStats] = useState(null);

  // Función para manejar errores 401 automáticamente
  const handleUnauthorized = () => {
    if (onLogout) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      onLogout();
    }
  };
  
  // Estados para edición de perfil
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: '',
    bio: '',
    location: '',
    interests: [],
    nombreComercio: ''
  });
  const [saving, setSaving] = useState(false);
  
  // Estados para estadísticas detalladas
  const [showDetailedStats, setShowDetailedStats] = useState(false);
  const [weeklyProgress, setWeeklyProgress] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setAvatarError(false);
        setEditForm(prev => ({
          ...prev,
          displayName: currentUser.displayName || '',
          bio: currentUser.bio || '',
          location: currentUser.location || '',
          interests: currentUser.interests || [],
          nombreComercio: userDetails?.nombre || ''
        }));
        loadUserData();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (userDetails?.tipo === 'comercio') {
        // Cargar estadísticas específicas para comercio
        await loadCommerceData();
      } else {
        // Cargar estadísticas, logros y actividad real
        const [userStats, userAchievements, activityData] = await Promise.all([
          userService.getUserStats(),
          userService.getUserAchievements(),
          userService.getRecentActivity()
        ]);

        setStats(userStats);
        setAchievements(userAchievements);

        generateWeeklyProgressFromData(activityData.reciclajes);
      }
    } catch (err) {
      console.error('Error cargando datos del usuario:', err);
      setError('Error al cargar los datos del perfil');
    } finally {
      setLoading(false);
    }
  };

  const loadCommerceData = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/reciclajes/comercio`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (response.ok) {
        const reciclajes = await response.json();

        // Calcular estadísticas del comercio con fechas fijas
        const now = new Date();
        const stats = {
          totalReciclajes: reciclajes.length,
          totalPuntos: reciclajes.reduce((sum, r) => sum + r.puntos, 0),
          pesoTotal: reciclajes.reduce((sum, r) => sum + r.cantidad, 0),
          tiposReciclados: reciclajes.reduce((tipos, r) => {
            tipos[r.tipo] = (tipos[r.tipo] || 0) + r.cantidad;
            return tipos;
          }, {}),
          usuariosAtendidos: new Set(reciclajes.map(r => r.usuario)).size,
          primerReciclaje: reciclajes.length > 0 ?
            new Date(Math.min(...reciclajes.map(r => new Date(r.fechaCreacion)))).toISOString() :
            null,
          ultimoReciclaje: reciclajes.length > 0 ?
            new Date(Math.max(...reciclajes.map(r => new Date(r.fechaCreacion)))).toISOString() :
            null,
          reciclajesToday: reciclajes.filter(r => {
            const today = new Date().toDateString();
            const reciclajeDate = new Date(r.fechaCreacion).toDateString();
            return today === reciclajeDate;
          }).length
        };

        setCommerceStats(stats);
        generateCommerceWeeklyProgress(reciclajes);

      }
    } catch (error) {
      console.error("Error cargando datos del comercio:", error);
    }
  };

  // Generar datos de progreso semanal desde datos reales
  const generateWeeklyProgressFromData = (reciclajes) => {
    const days = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    const now = new Date();

    const progress = days.map((day, index) => {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() - (6 - index));

      // Contar reciclajes reales en ese día
      const dayRecycleCount = reciclajes?.filter(r => {
        const reciclajeDate = new Date(r.fechaCreacion);
        return reciclajeDate.toDateString() === targetDate.toDateString();
      }).length || 0;

      return {
        day,
        activity: dayRecycleCount,
        date: targetDate
      };
    });

    setWeeklyProgress(progress);
  };

  // Generar datos de progreso semanal para comercio
  const generateCommerceWeeklyProgress = (reciclajes) => {
    const days = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    const now = new Date();

    const progress = days.map((day, index) => {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() - (6 - index));

      const dayReceivedCount = reciclajes.filter(r => {
        const reciclajeDate = new Date(r.fechaCreacion);
        return reciclajeDate.toDateString() === targetDate.toDateString();
      }).length;

      return {
        day,
        activity: dayReceivedCount,
        date: targetDate
      };
    });

    setWeeklyProgress(progress);
  };

  // Manejar actualización de perfil
  const handleUpdateProfile = async () => {
    try {
      setSaving(true);
      const isCommerce = userDetails?.tipo === 'comercio';

      if (isCommerce) {
        // Para comercios, actualizar el nombre del comercio en el backend
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/usuarios`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
          },
          body: JSON.stringify({
            nombre: editForm.nombreComercio
          })
        });

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        if (!response.ok) {
          throw new Error('Error al actualizar el nombre del comercio');
        }

        // Actualizar en el estado local
        window.showToast && window.showToast('Nombre del comercio actualizado correctamente', 'success');
      } else {
        // Para usuarios, actualizar displayName en Firebase Auth
        await updateProfile(auth.currentUser, {
          displayName: editForm.displayName
        });

        setUser(prev => ({
          ...prev,
          displayName: editForm.displayName
        }));
      }

      setIsEditing(false);
      // Recargar datos para reflejar cambios
      await loadUserData();
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      setError('Error al actualizar el perfil');
      window.showToast && window.showToast('Error al actualizar el perfil', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Calcular nivel basado en puntos (cada 500 puntos = 1 nivel)
  const calculateLevel = (points) => {
    return Math.floor(points / 500) + 1;
  };

  // Calcular progreso al siguiente nivel
  const calculateProgress = (points) => {
    const currentLevelPoints = points % 500;
    return (currentLevelPoints / 500) * 100;
  };

  // Calcular CO2 ahorrado (estimación: 0.5kg CO2 por kg reciclado)
  const calculateCO2Saved = (weight) => {
    return (weight * 0.5).toFixed(1);
  };

  // Calcular árboles equivalentes (estimación: 1 árbol por cada 10kg)
  const calculateTreesEquivalent = (weight) => {
    return Math.floor(weight / 10);
  };

  // Calcular agua ahorrada (estimación: 15L por kg de papel/cartón)
  const calculateWaterSaved = (stats) => {
    if (!stats || !stats.tiposReciclados) return 0;
    
    const paperCardboard = (stats.tiposReciclados['Papel'] || 0) + (stats.tiposReciclados['Cartón'] || 0);
    return Math.floor(paperCardboard * 15);
  };

  // Calcular energía ahorrada (estimación: 2kWh por kg reciclado)
  const calculateEnergySaved = (weight) => {
    return Math.floor(weight * 2);
  };

  // Generar iniciales del usuario para avatar fallback
  const getUserInitials = (name, email) => {
    if (name) {
      return name.split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  // Manejar error de carga del avatar
  const handleAvatarError = () => {
    setAvatarError(true);
  };

  // Generar color de fondo para avatar basado en el email
  const getAvatarBackgroundColor = (email) => {
    if (!email) return '#2E7D32';
    
    const colors = [
      '#2E7D32', '#1976D2', '#7B1FA2', '#512DA8',
      '#303F9F', '#1976D2', '#0288D1', '#0097A7',
      '#00796B', '#388E3C', '#689F38', '#AFB42B',
      '#F57C00', '#FF5722', '#795548', '#607D8B'
    ];
    
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Obtener el tipo de material más reciclado
  const getMostRecycledType = (stats) => {
    if (!stats || !stats.tiposReciclados) return 'Sin datos';
    
    const types = Object.entries(stats.tiposReciclados);
    if (types.length === 0) return 'Sin datos';
    
    const mostRecycled = types.reduce((max, [type, amount]) => 
      amount > max.amount ? { type, amount } : max, 
      { type: '', amount: 0 }
    );
    
    return mostRecycled.type;
  };

  // Funciones de navegación
  const handleViewStatistics = () => {
    navigate('/dashboard/achievements', { 
      state: { initialTab: 'resumen' } 
    });
  };

  const handleViewAllAchievements = () => {
    navigate('/dashboard/achievements', { 
      state: { initialTab: 'logros' } 
    });
  };

  const handleUpdateData = async () => {
    setRefreshing(true);
    await loadUserData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Cargando tu perfil eco... 🌱</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-container">
        <div className="error-state">
          <h2>❌ Error</h2>
          <p>{error}</p>
          <button className="profile-btn primary" onClick={loadUserData}>
            🔄 Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-container">
        <div className="error-state">
          <h2>🔐 No autenticado</h2>
          <p>Debes iniciar sesión para ver tu perfil</p>
        </div>
      </div>
    );
  }

  const isCommerce = userDetails?.tipo === 'comercio';
  const currentStats = isCommerce ? commerceStats : stats;

  const level = currentStats ? calculateLevel(currentStats.puntosTotal || currentStats.totalPuntos || 0) : 1;
  const progressPercentage = currentStats ? calculateProgress(currentStats.puntosTotal || currentStats.totalPuntos || 0) : 0;
  const co2Saved = currentStats ? calculateCO2Saved(currentStats.pesoTotal) : 0;
  const treesEquivalent = currentStats ? calculateTreesEquivalent(currentStats.pesoTotal) : 0;
  const waterSaved = currentStats ? calculateWaterSaved(currentStats) : 0;
  const energySaved = currentStats ? calculateEnergySaved(currentStats.pesoTotal) : 0;
  const mostRecycledType = currentStats ? getMostRecycledType(currentStats) : 'Sin datos';

  const userInitials = getUserInitials(user.displayName, user.email);
  const avatarBgColor = getAvatarBackgroundColor(user.email);

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>{isCommerce ? 'Perfil del Comercio' : 'Mi Perfil Eco'}</h1>
        <p className="profile-subtitle">
          {isCommerce ? 'Centro de reciclaje registrado' : 'Tu impacto ambiental cuenta'}
        </p>
      </div>

      {/* Tarjeta principal del usuario */}
      <div className="profile-card">
        <div className="profile-avatar-section">
          <div className="profile-avatar-container">
            {!avatarError && user.photoURL ? (
              <img
                className="profile-avatar"
                src={user.photoURL}
                alt="Avatar"
                onError={handleAvatarError}
              />
            ) : (
              <div 
                className="profile-avatar-fallback"
                style={{ backgroundColor: avatarBgColor }}
              >
                {userInitials}
              </div>
            )}
            <div className="profile-level-badge">
              Nivel {level}
            </div>
          </div>
        </div>
        
        <div className="profile-info">
          {!isEditing ? (
            <>
              <div className="profile-header-actions">
                <h2>{user.displayName || 'Usuario Eco'}</h2>
                <button
                  className="edit-profile-btn"
                  onClick={() => setIsEditing(true)}
                  title="Editar perfil"
                >
                  ✏️
                </button>
              </div>
              <p><span className="label">Email:</span> {user.email}</p>
              <p><span className="label">{isCommerce ? 'Comercio desde:' : 'Miembro desde:'}</span> {new Date(user.metadata.creationTime).toLocaleDateString('es-AR', { year: 'numeric', month: 'long' })}</p>
              <p><span className="label">{isCommerce ? 'Material más recibido:' : 'Material favorito:'}</span> {mostRecycledType}</p>
              {isCommerce && userDetails?.nombre && (
                <p><span className="label">Nombre del comercio:</span> {userDetails.nombre}</p>
              )}
              {isCommerce && userDetails?.direccion && (
                <p><span className="label">Dirección:</span> {userDetails.direccion}</p>
              )}
            </>
          ) : (
            <div className="edit-profile-form">
              {!isCommerce && (
                <div className="form-group">
                  <label>Nombre de usuario:</label>
                  <input
                    type="text"
                    value={editForm.displayName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder="Tu nombre de usuario"
                  />
                </div>
              )}

              <div className="form-actions">
                <button
                  className="profile-btn primary small"
                  onClick={handleUpdateProfile}
                  disabled={saving}
                >
                  {saving ? 'Guardando...' : '💾 Guardar'}
                </button>
                <button
                  className="profile-btn secondary small"
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                >
                  ❌ Cancelar
                </button>
              </div>
            </div>
          )}
          
          {!isCommerce && (
            <div className="profile-level-progress">
              <div className="progress-info">
                <span>Progreso al siguiente nivel</span>
                <span>{stats?.puntosTotal || 0}/{level * 500} puntos</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              <div className="progress-percentage">
                {progressPercentage.toFixed(1)}% completado
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actividad semanal */}
      {weeklyProgress.length > 0 && (
        <div className="weekly-activity-card">
          <h3>📅 Actividad de la Semana</h3>
          <div className="weekly-chart">
            {weeklyProgress.map((day, index) => (
              <div key={index} className="day-activity">
                <div
                  className="activity-bar"
                  style={{
                    height: `${Math.max(10, (day.activity / Math.max(...weeklyProgress.map(d => d.activity))) * 60)}px`,
                    backgroundColor: day.activity > 0 ? '#4CAF50' : '#E0E0E0'
                  }}
                  title={`${day.activity} ${isCommerce ? 'reciclajes recibidos' : 'reciclajes'}`}
                ></div>
                <span className="day-label">{day.day}</span>
              </div>
            ))}
          </div>
          <p className="activity-summary">
            Total esta semana: {weeklyProgress.reduce((sum, day) => sum + day.activity, 0)} {isCommerce ? 'reciclajes recibidos' : 'reciclajes'}
          </p>
        </div>
      )}

      {/* Estadísticas principales */}
      <div className="profile-stats">
        {isCommerce ? (
          // Estadísticas para comercio
          <>
            <div className="profile-stat-card featured">
              <div className="profile-stat-number">{commerceStats?.totalReciclajes || 0}</div>
              <div className="profile-stat-label">Reciclajes Recibidos</div>
              <div className="profile-stat-description">Total procesado</div>
            </div>

            <div className="profile-stat-card">
              <div className="profile-stat-number">{commerceStats?.totalPuntos || 0}</div>
              <div className="profile-stat-label">Puntos Otorgados</div>
              <div className="profile-stat-description">Total otorgado a usuarios</div>
            </div>

            <div className="profile-stat-card">
              <div className="profile-stat-number">{(commerceStats?.pesoTotal || 0).toFixed(1)} kg</div>
              <div className="profile-stat-label">Material Recibido</div>
              <div className="profile-stat-description">Peso total procesado</div>
            </div>

            <div className="profile-stat-card">
              <div className="profile-stat-number">{commerceStats?.usuariosAtendidos || 0}</div>
              <div className="profile-stat-label">Usuarios Atendidos</div>
              <div className="profile-stat-description">Diferentes usuarios</div>
            </div>
          </>
        ) : (
          // Estadísticas para usuarios recicladores
          <>
            <div className="profile-stat-card featured">
              <div className="profile-stat-number">{stats?.puntosTotal || 0}</div>
              <div className="profile-stat-label">Puntos Eco</div>
              <div className="profile-stat-description">Total acumulado</div>
            </div>

            <div className="profile-stat-card">
              <div className="profile-stat-number">{stats?.totalReciclajes || 0}</div>
              <div className="profile-stat-label">Reciclajes</div>
              <div className="profile-stat-description">Acciones completadas</div>
            </div>

            <div className="profile-stat-card">
              <div className="profile-stat-number">{(stats?.pesoTotal || 0).toFixed(1)} kg</div>
              <div className="profile-stat-label">Material Reciclado</div>
              <div className="profile-stat-description">Peso total procesado</div>
            </div>

            <div className="profile-stat-card">
              <div className="profile-stat-number">{Object.keys(stats?.tiposReciclados || {}).length}</div>
              <div className="profile-stat-label">Tipos Diferentes</div>
              <div className="profile-stat-description">Materiales reciclados</div>
            </div>
          </>
        )}
      </div>

      {/* Impacto ambiental detallado */}
      <div className="environmental-impact-section">
        <h3>🌍 {isCommerce ? 'Impacto Ambiental del Comercio' : 'Tu Impacto Ambiental'}</h3>
        <div className="impact-grid">
          <div className="impact-card co2">
            <div className="impact-icon">🌬️</div>
            <div className="impact-value">{co2Saved} kg</div>
            <div className="impact-label">CO2 Evitado</div>
            <div className="impact-description">Equivale a {Math.floor(co2Saved / 2.3)} km menos en auto</div>
          </div>
          
          <div className="impact-card trees">
            <div className="impact-icon">🌳</div>
            <div className="impact-value">{treesEquivalent}</div>
            <div className="impact-label">Árboles Salvados</div>
            <div className="impact-description">Beneficio equivalente al bosque</div>
          </div>
          
          <div className="impact-card water">
            <div className="impact-icon">💧</div>
            <div className="impact-value">{waterSaved} L</div>
            <div className="impact-label">Agua Ahorrada</div>
            <div className="impact-description">Suficiente para {Math.floor(waterSaved / 200)} duchas</div>
          </div>
          
          <div className="impact-card energy">
            <div className="impact-icon">⚡</div>
            <div className="impact-value">{energySaved} kWh</div>
            <div className="impact-label">Energía Ahorrada</div>
            <div className="impact-description">Alimenta una casa por {Math.floor(energySaved / 30)} días</div>
          </div>
        </div>
      </div>

      {/* Desglose por tipo de material */}
      {currentStats?.tiposReciclados && Object.keys(currentStats.tiposReciclados).length > 0 && (
        <div className="material-breakdown-section">
          <h3>📊 Desglose por Material {isCommerce ? 'Recibido' : ''}</h3>
          <div className="material-chart">
            {Object.entries(currentStats.tiposReciclados).map(([tipo, cantidad]) => {
              const percentage = (cantidad / currentStats.pesoTotal) * 100;
              const colors = {
                'Plástico': '#FF6B6B',
                'Vidrio': '#4ECDC4',
                'Cartón': '#45B7D1',
                'Papel': '#96CEB4',
                'Metal': '#FFEAA7'
              };
              
              return (
                <div key={tipo} className="material-item">
                  <div className="material-info">
                    <span className="material-name">{tipo}</span>
                    <span className="material-amount">{cantidad.toFixed(1)} kg</span>
                  </div>
                  <div className="material-bar">
                    <div 
                      className="material-progress"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: colors[tipo] || '#4CAF50'
                      }}
                    ></div>
                  </div>
                  <span className="material-percentage">{percentage.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mini sección de logros más recientes - Solo para usuarios recicladores */}
      {!isCommerce && achievements.length > 0 && (
        <div className="achievements-section">
          <h3>🏆 Logros Recientes</h3>
          <div className="achievements-grid">
            {achievements.map((achievement, index) => (
              <div key={achievement.id || index} className="achievement-card completed">
                <div className="achievement-icon">
                  {achievement.titulo.split(' ')[0]}
                </div>
                <div className="achievement-name">{achievement.titulo.substring(2)}</div>
                <div className="achievement-status completed">✓ Completado</div>
              </div>
            ))}
          </div>
          <div className="achievements-footer">
            <p>¿Quieres ver todos tus logros? <button 
              className="link-button" 
              onClick={handleViewAllAchievements}
            >
              <strong>Visita la sección de Logros</strong>
            </button></p>
          </div>
        </div>
      )}

      {/* Estadísticas detalladas expandibles */}
      <div className="detailed-stats-section">
        <button 
          className={`toggle-stats-btn ${showDetailedStats ? 'expanded' : ''}`}
          onClick={() => setShowDetailedStats(!showDetailedStats)}
        >
          {showDetailedStats ? '📈 Ocultar Estadísticas Detalladas' : '📈 Ver Estadísticas Detalladas'}
        </button>
        
        {showDetailedStats && (
          <div className="detailed-stats-content">
            <div className="stats-row">
              <div className="stat-detail">
                <span className="stat-label">{isCommerce ? 'Primer reciclaje recibido:' : 'Primer reciclaje:'}</span>
                <span className="stat-value">
                  {currentStats?.primerReciclaje ?
                    new Date(currentStats.primerReciclaje).toLocaleDateString('es-AR') :
                    'Sin datos'
                  }
                </span>
              </div>

              <div className="stat-detail">
                <span className="stat-label">{isCommerce ? 'Último reciclaje recibido:' : 'Último reciclaje:'}</span>
                <span className="stat-value">
                  {currentStats?.ultimoReciclaje ?
                    new Date(currentStats.ultimoReciclaje).toLocaleDateString('es-AR') :
                    'Sin datos'
                  }
                </span>
              </div>
            </div>

            <div className="stats-row">
              <div className="stat-detail">
                <span className="stat-label">{isCommerce ? 'Promedio por recepción:' : 'Promedio por reciclaje:'}</span>
                <span className="stat-value">
                  {currentStats?.totalReciclajes > 0 ?
                    ((currentStats.pesoTotal / currentStats.totalReciclajes).toFixed(2) + ' kg') :
                    '0 kg'
                  }
                </span>
              </div>

              <div className="stat-detail">
                <span className="stat-label">Puntos por kg:</span>
                <span className="stat-value">
                  {currentStats?.pesoTotal > 0 ?
                    ((currentStats.puntosTotal || currentStats.totalPuntos || 0) / currentStats.pesoTotal).toFixed(1) :
                    '0'
                  } pts/kg
                </span>
              </div>
            </div>

            {!isCommerce && (
              <div className="stats-row">
                <div className="stat-detail">
                  <span className="stat-label">Puntos visitados:</span>
                  <span className="stat-value">{stats?.puntosVisitados?.size || 0} diferentes</span>
                </div>

                <div className="stat-detail">
                  <span className="stat-label">Mejor racha:</span>
                  <span className="stat-value">{stats?.mejorRacha || 0} días seguidos</span>
                </div>
              </div>
            )}

            {isCommerce && (
              <div className="stats-row">
                <div className="stat-detail">
                  <span className="stat-label">Usuarios únicos atendidos:</span>
                  <span className="stat-value">{commerceStats?.usuariosAtendidos || 0} personas</span>
                </div>

                <div className="stat-detail">
                  <span className="stat-label">Tipos de material diferentes:</span>
                  <span className="stat-value">{Object.keys(commerceStats?.tiposReciclados || {}).length} tipos</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

export default Profile;
