import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import Quagga from "@ericblade/quagga2";
import API_URL from "../../config/api.js";
import "./ComercioReceive.css";

function ComercioReceive() {
  const { userDetails, onLogout } = useOutletContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reciclajes, setReciclajes] = useState([]);
  const [formData, setFormData] = useState({
    codigoUsuario: "",
    codigoProducto: "",
    tipo: "",
    cantidad: "",
    puntos: ""
  });

  // Estados para el scanner
  const [modo, setModo] = useState("manual"); // "scanner" o "manual"
  const [isScanning, setIsScanning] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const [codigoConfirmado, setCodigoConfirmado] = useState(false);
  const [codigoBuffer, setCodigoBuffer] = useState([]);
  const [ultimaDeteccion, setUltimaDeteccion] = useState(null);
  const [producto, setProducto] = useState(null);

  const scannerRef = useRef(null);
  const detectionTimeoutRef = useRef(null);

  // Función para manejar errores 401 automáticamente
  const handleUnauthorized = () => {
    if (onLogout) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      onLogout();
    }
  };

  // Scanner setup
  useEffect(() => {
    if (modo !== "scanner") {
      stopScanner();
      return;
    }
    const startScanner = () => {
      const config = {
        inputStream: { name: "Live", type: "LiveStream", target: scannerRef.current, constraints: { width: { ideal: 1280, min: 640 }, height: { ideal: 720, min: 480 }, facingMode: "environment" } },
        decoder: { readers: ["ean_reader", "ean_8_reader", "code_128_reader", "upc_reader", "upc_e_reader"] },
        locate: true,
        frequency: 25,
        debug: false
      };
      Quagga.init(config, (err) => {
        if (err) { setError("Error al inicializar el scanner"); setIsScanning(false); setScannerReady(false); return; }
        Quagga.start(); setIsScanning(true); setScannerReady(true); setError("");
      });
      Quagga.onDetected((result) => {
        const code = result.codeResult.code;
        const now = Date.now();
        if (codigoConfirmado || (ultimaDeteccion && now - ultimaDeteccion < 100)) return;
        setUltimaDeteccion(now);
        setCodigoBuffer(prev => {
          const filteredBuffer = prev.filter(item => now - item.timestamp < 1500);
          const sameCodeDetections = filteredBuffer.filter(item => item.code === code);
          if (sameCodeDetections.length >= 2) {
            setCodigoConfirmado(true);
            setTimeout(() => { stopScanner(); setFormData(prev => ({ ...prev, codigoProducto: code })); setCodigoBuffer([]); buscarProducto(code); }, 100);
            return [];
          }
          return [...filteredBuffer, { code, timestamp: now }].slice(-3);
        });
      });
    };
    const timer = setTimeout(startScanner, 200);
    return () => { clearTimeout(timer); stopScanner(); };
  }, [modo, codigoConfirmado]);

  const stopScanner = () => {
    if (Quagga && typeof Quagga.stop === 'function') {
      try { Quagga.stop(); Quagga.offDetected(); Quagga.offProcessed(); } catch (err) {}
    }
    setIsScanning(false); setScannerReady(false);
  };

  const reiniciarScanner = () => {
    setCodigoConfirmado(false); setCodigoBuffer([]); setUltimaDeteccion(null);
    setFormData(prev => ({ ...prev, codigoProducto: "", tipo: "", cantidad: "" }));
    setProducto(null); setError(""); setModo("scanner");
  };

  const cambiarModo = (nuevoModo) => {
    if (nuevoModo === "scanner" && codigoConfirmado) { reiniciarScanner(); return; }
    setModo(nuevoModo);
    setFormData({ codigoUsuario: formData.codigoUsuario, codigoProducto: "", tipo: "", cantidad: "", puntos: "" });
    setProducto(null); setError(""); setSuccess("");
  };

  const buscarProducto = async (codigo) => {
    try {
      const response = await fetch(`${API_URL}/productos?codigo=${encodeURIComponent(codigo)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (response.status === 401) { handleUnauthorized(); return; }
      if (response.ok) {
        const prod = await response.json();
        setProducto(prod);
        setFormData(prev => ({ ...prev, codigoProducto: codigo, tipo: prod.tipo || "", cantidad: prod.pesoEstimado ? String(prod.pesoEstimado) : "" }));
        setError("");
      } else if (response.status === 404) {
        setProducto(null); setError("Producto no encontrado");
      }
    } catch (err) { setProducto(null); setError("Error al buscar producto"); }
  };

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

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

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

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al procesar el reciclaje");
      }

      setSuccess(`✅ Reciclaje procesado exitosamente! ${data.puntos} puntos otorgados a ${data.usuario}. El reciclaje aparecerá en su historial como procesado en ${userDetails?.nombre || 'tu comercio'}.`);

      // Limpiar formulario
      setFormData({
        codigoUsuario: "",
        codigoProducto: "",
        tipo: "",
        cantidad: "",
        puntos: ""
      });
      setProducto(null);
      setCodigoConfirmado(false);

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

          {/* Mode Toggle */}
          <div className="mode-toggle-container">
            <button
              type="button"
              className={`mode-toggle-btn ${modo === "manual" ? "active" : ""}`}
              onClick={() => cambiarModo("manual")}
              disabled={loading}
            >
              ⌨️ Manual
            </button>
            <button
              type="button"
              className={`mode-toggle-btn ${modo === "scanner" ? "active" : ""}`}
              onClick={() => cambiarModo("scanner")}
              disabled={loading}
            >
              📷 Escanear
            </button>
          </div>

          {/* Scanner Section */}
          {modo === "scanner" && (
            <div className="scanner-section">
              {!codigoConfirmado ? (
                <div className="scanner-container">
                  <div className="scanner-viewport" ref={scannerRef}></div>
                  {isScanning && (
                    <div className="scanner-overlay">
                      <div className="scanner-line"></div>
                      <p className="scanner-instruction">Apunta al código de barras del producto</p>
                    </div>
                  )}
                  {!scannerReady && (
                    <div className="scanner-loading">
                      <div className="spinner"></div>
                      <p>Iniciando cámara...</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="code-confirmed">
                  <div className="confirmed-badge">
                    <span className="check-icon">✓</span>
                    <div className="confirmed-text">
                      <h4>Código escaneado</h4>
                      <p className="codigo-value">{formData.codigoProducto}</p>
                    </div>
                  </div>
                  {producto && (
                    <div className="producto-info">
                      <h4>Producto encontrado:</h4>
                      <p><strong>{producto.nombre}</strong></p>
                      <p>Tipo: {producto.tipo}</p>
                      {producto.pesoEstimado && <p>Peso estimado: {producto.pesoEstimado}kg</p>}
                    </div>
                  )}
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={reiniciarScanner}
                  >
                    📷 Escanear otro código
                  </button>
                </div>
              )}
            </div>
          )}

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
