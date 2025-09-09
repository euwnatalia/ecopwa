import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { userService } from "../../services/userService";
import "./Home.css";

function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weeklyGoals, setWeeklyGoals] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [ecoTips, setEcoTips] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Consejos ecológicos rotativos
  const ecoTipsDatabase = [
    {
      icon: "🌱",
      tip: "Separar correctamente los residuos puede ahorrar hasta 1.5 toneladas de CO2 al año",
      category: "Reciclaje"
    },
    {
      icon: "💧",
      tip: "Reciclar una botella de plástico ahorra suficiente energía para alimentar una bombilla LED por 6 horas",
      category: "Energía"
    },
    {
      icon: "🌳",
      tip: "Reciclar una tonelada de papel salva 17 árboles maduros",
      category: "Conservación"
    },
    {
      icon: "♻️",
      tip: "El vidrio puede reciclarse infinitas veces sin perder calidad",
      category: "Materiales"
    },
    {
      icon: "🌍",
      tip: "Cada tonelada de material reciclado evita 3.3 toneladas de emisiones de CO2",
      category: "Clima"
    }
  ];

  useEffect(() => {
    // Actualizar hora cada minuto
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    // Autenticación
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        loadUserData();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    // Generar consejos eco aleatorios
    generateEcoTips();

    return () => {
      clearInterval(timeInterval);
      unsubscribe();
    };
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Cargar estadísticas y logros en paralelo
      const [userStats, userAchievements] = await Promise.all([
        userService.getUserStats(),
        userService.getUserAchievements()
      ]);
      
      setStats(userStats);
      setAchievements(userAchievements.slice(0, 3)); // Solo los 3 más recientes
      
      // Generar metas semanales basadas en datos del usuario
      generateWeeklyGoals(userStats);
      
      // Generar actividad reciente simulada
      generateRecentActivity(userStats);
      
    } catch (err) {
      console.error('Error cargando datos del usuario:', err);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  // Generar metas semanales dinámicas
  const generateWeeklyGoals = (userStats) => {
    if (!userStats) return;
    
    const avgWeekly = userStats.totalReciclajes / 4; // Promedio por semana (asumiendo un mes)
    const goals = [
      {
        id: 1,
        title: "Reciclajes esta semana",
        current: Math.floor(avgWeekly * 0.6),
        target: Math.max(3, Math.floor(avgWeekly * 1.2)),
        icon: "♻️",
        type: "reciclajes"
      },
      {
        id: 2,
        title: "Peso reciclado (kg)",
        current: Math.floor((userStats.pesoTotal / 4) * 0.7),
        target: Math.max(5, Math.floor((userStats.pesoTotal / 4) * 1.1)),
        icon: "⚖️",
        type: "peso"
      },
      {
        id: 3,
        title: "Puntos eco obtenidos",
        current: Math.floor((userStats.puntosTotal / 4) * 0.8),
        target: Math.max(100, Math.floor((userStats.puntosTotal / 4) * 1.3)),
        icon: "🏆",
        type: "puntos"
      }
    ];
    
    setWeeklyGoals(goals);
  };

  // Generar actividad reciente simulada
  const generateRecentActivity = (userStats) => {
    if (!userStats) return;
    
    const activities = [
      { 
        icon: "♻️", 
        text: `Reciclaste ${Math.floor(Math.random() * 3) + 1} ${Object.keys(userStats.tiposReciclados || {})[0] || 'objetos'}`,
        time: "Hace 2 horas",
        type: "recycle"
      },
      { 
        icon: "🏆", 
        text: "¡Nuevo logro desbloqueado!",
        time: "Hace 1 día",
        type: "achievement"
      },
      { 
        icon: "📍", 
        text: "Visitaste un nuevo punto de reciclaje",
        time: "Hace 2 días",
        type: "location"
      },
      { 
        icon: "🌱", 
        text: `Alcanzaste el nivel ${Math.floor((userStats.puntosTotal || 0) / 500) + 1}`,
        time: "Hace 3 días",
        type: "level"
      }
    ];
    
    setRecentActivity(activities.slice(0, 3));
  };

  // Generar consejos eco aleatorios
  const generateEcoTips = () => {
    const shuffled = [...ecoTipsDatabase].sort(() => 0.5 - Math.random());
    setEcoTips(shuffled.slice(0, 2));
  };

  // Obtener saludo según la hora
  const getGreeting = () => {
    const hour = currentTime.getHours();
    const name = user?.displayName?.split(' ')[0] || 'Eco-usuario';
    
    if (hour < 12) return `¡Buenos días, ${name}!`;
    if (hour < 18) return `¡Buenas tardes, ${name}!`;
    return `¡Buenas noches, ${name}!`;
  };

  // Calcular nivel del usuario
  const calculateLevel = (points) => {
    return Math.floor((points || 0) / 500) + 1;
  };

  // Calcular progreso al siguiente nivel
  const calculateProgress = (points) => {
    const currentLevelPoints = (points || 0) % 500;
    return (currentLevelPoints / 500) * 100;
  };

  // Funciones de navegación
  const handleScanQR = () => {
    navigate('/dashboard/scan');
  };

  const handleViewMap = () => {
    navigate('/dashboard/map');
  };

  const handleViewProfile = () => {
    navigate('/dashboard/profile');
  };

  const handleViewAchievements = () => {
    navigate('/dashboard/achievements');
  };

  const handleRefreshData = async () => {
    setRefreshing(true);
    await loadUserData();
    generateEcoTips();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="home-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Cargando tu dashboard eco... 🌱</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home-container">
        <div className="error-state">
          <h2>❌ Error</h2>
          <p>{error}</p>
          <button className="refresh-btn" onClick={loadUserData}>
            🔄 Reintentar
          </button>
        </div>
      </div>
    );
  }

  const level = calculateLevel(stats?.puntosTotal);
  const progressPercentage = calculateProgress(stats?.puntosTotal);

  return (
    <div className="home-container">
      {/* Header personalizado */}
      <div className="home-header">
        <div className="greeting-section">
          <h1>{getGreeting()} 🌱</h1>
          <p className="date-info">
            {currentTime.toLocaleDateString('es-AR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <button 
          className={`refresh-btn ${refreshing ? 'spinning' : ''}`}
          onClick={handleRefreshData}
          disabled={refreshing}
          title="Actualizar datos"
        >
          🔄
        </button>
      </div>

      {/* Estadísticas principales */}
      <div className="home-stats-grid">
        <div className="stat-card featured">
          <div className="stat-icon">🏆</div>
          <div className="stat-content">
            <div className="stat-number">{stats?.puntosTotal || 0}</div>
            <div className="stat-label">Puntos Eco</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">♻️</div>
          <div className="stat-content">
            <div className="stat-number">{stats?.totalReciclajes || 0}</div>
            <div className="stat-label">Reciclajes</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-number">Nivel {level}</div>
            <div className="stat-label">Tu Nivel</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🌍</div>
          <div className="stat-content">
            <div className="stat-number">{((stats?.pesoTotal || 0) * 0.5).toFixed(1)} kg</div>
            <div className="stat-label">CO2 Ahorrado</div>
          </div>
        </div>
      </div>

      {/* Progreso del nivel */}
      <div className="level-progress-section">
        <h2>Tu Progreso - Nivel {level}</h2>
        <div className="level-progress">
          <div className="progress-info">
            <span>Progreso al nivel {level + 1}</span>
            <span>{stats?.puntosTotal || 0}/500 puntos</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <div className="progress-percentage">{progressPercentage.toFixed(1)}% completado</div>
        </div>
      </div>

      {/* Metas semanales */}
      <section className="weekly-goals-section">
        <h2>🎯 Metas de esta Semana</h2>
        <div className="goals-grid">
          {weeklyGoals.map(goal => {
            const progressPercent = Math.min((goal.current / goal.target) * 100, 100);
            const isCompleted = goal.current >= goal.target;
            
            return (
              <div key={goal.id} className={`goal-card ${isCompleted ? 'completed' : ''}`}>
                <div className="goal-header">
                  <span className="goal-icon">{goal.icon}</span>
                  <span className="goal-title">{goal.title}</span>
                  {isCompleted && <span className="completed-badge">✓</span>}
                </div>
                <div className="goal-progress">
                  <div className="goal-numbers">
                    <span>{goal.current}</span>
                    <span>/ {goal.target}</span>
                  </div>
                  <div className="goal-progress-bar">
                    <div 
                      className="goal-progress-fill"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Acciones rápidas */}
      <section className="quick-actions-section">
        <h2>🚀 Acciones Rápidas</h2>
        <div className="actions-grid">
          <button className="action-card primary" onClick={handleScanQR}>
            <div className="action-icon">📷</div>
            <div className="action-content">
              <h3>Escanear Código</h3>
              <p>Registra un nuevo reciclaje</p>
            </div>
          </button>
          
          <button className="action-card secondary" onClick={handleViewMap}>
            <div className="action-icon">🗺️</div>
            <div className="action-content">
              <h3>Puntos Cercanos</h3>
              <p>Encuentra lugares para reciclar</p>
            </div>
          </button>
          
          <button className="action-card tertiary" onClick={handleViewProfile}>
            <div className="action-icon">👤</div>
            <div className="action-content">
              <h3>Mi Perfil</h3>
              <p>Ver estadísticas detalladas</p>
            </div>
          </button>
          
          <button className="action-card quaternary" onClick={handleViewAchievements}>
            <div className="action-icon">🏆</div>
            <div className="action-content">
              <h3>Mis Logros</h3>
              <p>Revisa tus achievements</p>
            </div>
          </button>
        </div>
      </section>

      {/* Actividad reciente */}
      {recentActivity.length > 0 && (
        <section className="recent-activity-section">
          <h2>📋 Actividad Reciente</h2>
          <div className="activity-list">
            {recentActivity.map((activity, index) => (
              <div key={index} className={`activity-item ${activity.type}`}>
                <div className="activity-icon">{activity.icon}</div>
                <div className="activity-content">
                  <p className="activity-text">{activity.text}</p>
                  <span className="activity-time">{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Logros recientes */}
      {achievements.length > 0 && (
        <section className="recent-achievements-section">
          <h2>🏆 Logros Recientes</h2>
          <div className="achievements-mini-grid">
            {achievements.map((achievement, index) => (
              <div key={index} className="achievement-mini-card">
                <div className="achievement-mini-icon">
                  {achievement.titulo.split(' ')[0]}
                </div>
                <div className="achievement-mini-content">
                  <h4>{achievement.titulo.substring(2)}</h4>
                  <span className="achievement-mini-status">Completado</span>
                </div>
              </div>
            ))}
          </div>
          <button className="view-all-achievements" onClick={handleViewAchievements}>
            Ver todos los logros →
          </button>
        </section>
      )}

      {/* Consejos ecológicos */}
      <section className="eco-tips-section">
        <h2>💡 Sabías que...</h2>
        <div className="tips-grid">
          {ecoTips.map((tip, index) => (
            <div key={index} className="tip-card">
              <div className="tip-icon">{tip.icon}</div>
              <div className="tip-content">
                <p className="tip-text">{tip.tip}</p>
                <span className="tip-category">{tip.category}</span>
              </div>
            </div>
          ))}
        </div>
        <button className="refresh-tips" onClick={generateEcoTips}>
          🔄 Más consejos
        </button>
      </section>
    </div>
  );
}

export default Home;
