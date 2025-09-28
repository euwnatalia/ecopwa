import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import API_URL from "../../config/api.js";
import "./ComercioReceive.css";

function ComercioReceive() {
  const { userDetails } = useOutletContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reciclajes, setReciclajes] = useState([]);
  const [formData, setFormData] = useState({
    codigoUsuario: "",
    tipo: "",
    cantidad: "",
    puntos: ""
  });

  const tiposReciclaje = [
    { value: "Plástico", label: "🥤 Plástico", puntosPorKg: 10 },
    { value: "Vidrio", label: "🫙 Vidrio", puntosPorKg: 15 },
    { value: "Cartón", label: "📦 Cartón", puntosPorKg: 8 },
    { value: "Papel", label: "📄 Papel", puntosPorKg: 5 },
    { value: "Metal", label: "🥫 Metal", puntosPorKg: 20 }
  ];

  useEffect(() => {
    cargarReciclajes();
  }, []);

  // Calcular puntos automáticamente cuando cambian tipo o cantidad
  useEffect(() => {
    if (formData.tipo && formData.cantidad) {
      const tipoInfo = tiposReciclaje.find(t => t.value === formData.tipo);
      if (tipoInfo) {
        const puntos = Math.round(parseFloat(formData.cantidad) * tipoInfo.puntosPorKg);
        setFormData(prev => ({ ...prev, puntos: puntos.toString() }));
      }
    }
  }, [formData.tipo, formData.cantidad]);

  const cargarReciclajes = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/reciclajes/comercio`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setReciclajes(data);
      }
    } catch (error) {
      console.error("Error cargando reciclajes:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Limpiar mensajes cuando el usuario empiece a escribir
    if (error) setError("");
    if (success) setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Validaciones
      if (!formData.codigoUsuario || !formData.tipo || !formData.cantidad) {
        throw new Error("Todos los campos son obligatorios");
      }

      const cantidad = parseFloat(formData.cantidad);
      if (isNaN(cantidad) || cantidad <= 0) {
        throw new Error("La cantidad debe ser un número mayor a 0");
      }

      const puntos = parseInt(formData.puntos);
      if (isNaN(puntos) || puntos <= 0) {
        throw new Error("Los puntos deben ser un número mayor a 0");
      }

      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/reciclajes/recibir`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          codigoUsuario: formData.codigoUsuario.trim(),
          tipo: formData.tipo,
          cantidad: cantidad,
          puntos: puntos
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al procesar el reciclaje");
      }

      setSuccess(`✅ Reciclaje procesado exitosamente! ${data.puntos} puntos otorgados a ${data.usuario}. El reciclaje aparecerá en su historial como procesado en ${userDetails?.nombre || 'tu comercio'}.`);

      // Limpiar formulario
      setFormData({
        codigoUsuario: "",
        tipo: "",
        cantidad: "",
        puntos: ""
      });

      // Recargar lista
      cargarReciclajes();

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatearFecha = (fechaISO) => {
    if (!fechaISO) return 'Fecha no disponible';

    const fecha = new Date(fechaISO);

    // Verificar si la fecha es válida
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

  // Verificar que el usuario sea un comercio
  if (userDetails?.tipo !== 'comercio') {
    return (
      <div className="comercio-receive-container">
        <div className="error-state">
          <h2>🚫 Acceso Restringido</h2>
          <p>Esta página es solo para comercios registrados.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="comercio-receive-container">
      <header className="receive-header">
        <h1>🏪 Recepción de Reciclajes</h1>
        <p>Procesa los reciclajes que recibe tu comercio y otorga puntos a los usuarios</p>
      </header>

      {/* Formulario de recepción */}
      <div className="receive-form-section">
        <div className="form-card">
          <h2>📝 Nuevo Reciclaje</h2>
          
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <form onSubmit={handleSubmit} className="receive-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="codigoUsuario">Código de Usuario</label>
                <input
                  type="text"
                  id="codigoUsuario"
                  name="codigoUsuario"
                  value={formData.codigoUsuario}
                  onChange={handleInputChange}
                  placeholder="Ej: USER123 o email del usuario"
                  disabled={loading}
                />
                <small>El usuario debe proporcionarte su código único</small>
              </div>

              <div className="form-group">
                <label htmlFor="tipo">Tipo de Material</label>
                <select
                  id="tipo"
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleInputChange}
                  disabled={loading}
                >
                  <option value="">Selecciona el material</option>
                  {tiposReciclaje.map(tipo => (
                    <option key={tipo.value} value={tipo.value}>
                      {tipo.label} ({tipo.puntosPorKg} pts/kg)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="cantidad">Cantidad (kg)</label>
                <input
                  type="number"
                  id="cantidad"
                  name="cantidad"
                  value={formData.cantidad}
                  onChange={handleInputChange}
                  placeholder="0.0"
                  step="0.1"
                  min="0.1"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="puntos">Puntos a Otorgar</label>
                <input
                  type="number"
                  id="puntos"
                  name="puntos"
                  value={formData.puntos}
                  onChange={handleInputChange}
                  placeholder="Calculado automáticamente"
                  min="1"
                  disabled={loading}
                />
                <small>Se calcula automáticamente, pero puedes ajustarlo</small>
              </div>
            </div>

            <button 
              type="submit" 
              className="submit-btn"
              disabled={loading || !formData.codigoUsuario || !formData.tipo || !formData.cantidad}
            >
              {loading ? "Procesando..." : "🎯 Procesar Reciclaje"}
            </button>
          </form>
        </div>
      </div>

      {/* Lista de reciclajes recientes */}
      <div className="recent-receives-section">
        <h2>📋 Reciclajes Recientes</h2>
        
        {reciclajes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h3>No hay reciclajes procesados aún</h3>
            <p>Cuando proceses tu primer reciclaje aparecerá aquí</p>
          </div>
        ) : (
          <div className="receives-list">
            {reciclajes.map((reciclaje) => (
              <div key={reciclaje.id} className="receive-item">
                <div className="receive-icon">
                  {tiposReciclaje.find(t => t.value === reciclaje.tipo)?.label?.split(' ')[0] || '♻️'}
                </div>
                
                <div className="receive-content">
                  <div className="receive-header">
                    <h4>{reciclaje.tipo} - {reciclaje.cantidad}kg</h4>
                    <span className="receive-points">+{reciclaje.puntos} pts</span>
                  </div>
                  
                  <div className="receive-details">
                    <span className="receive-user">👤 {reciclaje.usuario}</span>
                    <span className="receive-date">📅 {formatearFecha(reciclaje.fechaCreacion)}</span>
                  </div>

                  <div className="receive-location">
                    <span className="receive-place">🏪 Procesado en: {userDetails?.nombre || 'Tu comercio'}</span>
                    {reciclaje.comercio && reciclaje.comercio !== userDetails?.nombre && (
                      <span className="receive-original">📍 Comercio original: {reciclaje.comercio}</span>
                    )}
                  </div>

                  {reciclaje.codigo && (
                    <div className="receive-code">
                      <span>🏷️ Código: {reciclaje.codigo}</span>
                    </div>
                  )}
                </div>

                <div className="receive-status">
                  <span className="status-badge success">✅ Procesado</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ComercioReceive;
