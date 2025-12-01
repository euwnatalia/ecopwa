// src/pages/dashboard/ComercioReceive.jsx
import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import Quagga from "@ericblade/quagga2";
import API_URL from "../../config/api.js";
import { MATERIALES } from "../../constants/materiales.js";
import "./Scan.css"; // Usamos los mismos estilos de Scan

export default function ComercioReceive() {
  const { userDetails, onLogout } = useOutletContext();
  const [modo, setModo] = useState("codigo"); // "codigo" o "manual"
  const [codigo, setCodigo] = useState("");
  const [nombreProd, setNombreProd] = useState("");
  const [tipo, setTipo] = useState("");
  const [pesoEstimado, setPesoEstimado] = useState("");
  const [error, setError] = useState("");
  const [producto, setProducto] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);

  // Estados para validación múltiple del scanner
  const [codigoBuffer, setCodigoBuffer] = useState([]);
  const [ultimaDeteccion, setUltimaDeteccion] = useState(null);
  const [codigoConfirmado, setCodigoConfirmado] = useState(false);

  // Estado para código de usuario (específico de comercio)
  const [codigoUsuario, setCodigoUsuario] = useState("");

  // Estado para modal de éxito
  const [mostrarModalExito, setMostrarModalExito] = useState(false);
  const [datosExito, setDatosExito] = useState({
    puntos: 0,
    usuario: ""
  });

  const [mostrarModalProducto, setMostrarModalProducto] = useState(false);
  const [productoAgregado, setProductoAgregado] = useState(null);
  const [mostrarAyuda, setMostrarAyuda] = useState(false);
  const [buscandoProducto, setBuscandoProducto] = useState(false);
  const [loading, setLoading] = useState(false);

  const scannerRef = useRef(null);

  const handleUnauthorized = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    onLogout();
  };

  useEffect(() => {
    const ayudaMostrada = localStorage.getItem('ayudaScannerComercioMostrada');
    if (!ayudaMostrada) {
      setMostrarAyuda(true);
      localStorage.setItem('ayudaScannerComercioMostrada', 'true');
    }
  }, []);

  // Calcular puntos automáticamente
  const tiposReciclaje = [
    { value: "Plástico", puntosPorKg: 10 },
    { value: "Vidrio", puntosPorKg: 15 },
    { value: "Cartón", puntosPorKg: 8 },
    { value: "Papel", puntosPorKg: 5 },
    { value: "Metal", puntosPorKg: 20 }
  ];

  const calcularPuntos = () => {
    if (!tipo || !pesoEstimado) return 0;
    const tipoInfo = tiposReciclaje.find(t => t.value === tipo);
    if (!tipoInfo) return 0;
    return Math.round(parseFloat(pesoEstimado) * tipoInfo.puntosPorKg);
  };

  // Inicializar scanner con QuaggaJS2
  useEffect(() => {
    if (modo !== "codigo") {
      stopScanner();
      return;
    }

    const startScanner = () => {
      const config = {
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: scannerRef.current,
          constraints: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            aspectRatio: { ideal: 16 / 9 },
            facingMode: "environment"
          }
        },
        decoder: {
          readers: ["ean_reader", "ean_8_reader"]
        },
        locate: true,
        frequency: 10,
        numOfWorkers: 4,
        debug: false
      };

      Quagga.init(config, (err) => {
        if (err) {
          setError("Error al inicializar el scanner: " + err.message);
          setIsScanning(false);
          setScannerReady(false);
          return;
        }

        Quagga.start();
        setIsScanning(true);
        setScannerReady(true);
        setError("");
      });

      Quagga.onDetected((result) => {
        const code = result.codeResult.code;
        const now = Date.now();
        const errorRate = result.codeResult.error;

        if (codigoConfirmado) return;

        if (!code || (code.length !== 13 && code.length !== 8)) {
          return;
        }

        if (errorRate > 0.15) {
          return;
        }

        if (ultimaDeteccion && now - ultimaDeteccion < 100) {
          return;
        }

        setUltimaDeteccion(now);

        setCodigoBuffer(prev => {
          const filteredBuffer = prev.filter(item =>
            now - item.timestamp < 1500
          );

          const newBuffer = [...filteredBuffer, { code, timestamp: now }];
          const sameCodeDetections = newBuffer.filter(item => item.code === code);

          if (sameCodeDetections.length >= 3) {
            setCodigoConfirmado(true);
            setTimeout(() => confirmarCodigo(code), 100);
            return [];
          }

          return newBuffer.slice(-5);
        });
      });
    };

    const confirmarCodigo = (code) => {
      stopScanner();
      setCodigo(code);
      setCodigoConfirmado(true);
      setError("");
      setCodigoBuffer([]);
    };

    const timer = setTimeout(startScanner, 200);

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  }, [modo]);

  const stopScanner = () => {
    if (Quagga && typeof Quagga.stop === 'function') {
      try {
        Quagga.stop();
        Quagga.offDetected();
        Quagga.offProcessed();
      } catch (err) { }
    }
    setIsScanning(false);
    setScannerReady(false);
  };

  const buscarProductoPorCodigo = async () => {
    if (!codigo) {
      alert("Ingresa un código de barras primero");
      return;
    }

    setBuscandoProducto(true);
    try {
      const response = await fetch(
        `${API_URL}/productos?codigo=${encodeURIComponent(codigo)}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (response.ok) {
        const prod = await response.json();
        setProducto(prod);
        setNombreProd(String(prod.nombre || ""));
        setTipo(String(prod.tipo || ""));
        setPesoEstimado(prod.pesoEstimado ? String(prod.pesoEstimado) : "");
        setError("");
      } else if (response.status === 404) {
        setProducto(null);
        setNombreProd("");
        setTipo("");
        setPesoEstimado("");
        setError("❌ Producto no encontrado. Puedes registrarlo manualmente completando los campos.");
      } else {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      setProducto(null);
      setNombreProd("");
      setTipo("");
      setPesoEstimado("");
      setError("Error al buscar el producto. Verifica tu conexión.");
    } finally {
      setBuscandoProducto(false);
    }
  };

  useEffect(() => {
    if (!codigo || modo !== "codigo" || !codigoConfirmado) return;

    const buscarAutomatico = async () => {
      setBuscandoProducto(true);
      try {
        const response = await fetch(
          `${API_URL}/productos?codigo=${encodeURIComponent(codigo)}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`
            }
          }
        );

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        if (response.ok) {
          const prod = await response.json();
          setProducto(prod);
          setNombreProd(String(prod.nombre || ""));
          setTipo(String(prod.tipo || ""));
          setPesoEstimado(prod.pesoEstimado ? String(prod.pesoEstimado) : "");
          setError("");
        } else if (response.status === 404) {
          setProducto(null);
          setNombreProd("");
          setTipo("");
          setPesoEstimado("");
          setError("❌ Producto no encontrado. Puedes registrarlo manualmente completando los campos.");
        } else {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
      } catch (err) {
        setProducto(null);
        setNombreProd("");
        setTipo("");
        setPesoEstimado("");
        setError("Error al buscar el producto. Verifica tu conexión.");
      } finally {
        setBuscandoProducto(false);
      }
    };

    buscarAutomatico();
  }, [codigo, codigoConfirmado, modo]);

  const registrarProducto = async () => {
    if (!codigo || !nombreProd || !tipo || !pesoEstimado) {
      alert("Completa todos los campos para registrar.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/productos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          codigo,
          nombre: nombreProd,
          tipo,
          pesoEstimado: parseFloat(pesoEstimado)
        })
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || res.statusText);
      }

      setProducto(data);
      setError("");
      setProductoAgregado(data);
      setMostrarModalProducto(true);
    } catch (e) {
      alert("Error al registrar producto: " + e.message);
    }
  };

  const guardarReciclaje = async () => {
    if (!tipo || !pesoEstimado) {
      alert("Debes indicar tipo y peso para guardar el reciclaje.");
      return;
    }

    if (!codigoUsuario) {
      alert("Debes ingresar el código del usuario.");
      return;
    }

    setLoading(true);

    try {
      const puntos = calcularPuntos();

      const response = await fetch(`${API_URL}/reciclajes/recibir`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          codigoUsuario: codigoUsuario.trim(),
          tipo,
          cantidad: parseFloat(pesoEstimado),
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

      setDatosExito({
        puntos: data.puntos || puntos,
        usuario: data.usuario || codigoUsuario
      });
      setMostrarModalExito(true);

      limpiarFormulario();
    } catch (e) {
      alert("Error al guardar reciclaje: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const limpiarFormulario = () => {
    setCodigo("");
    setProducto(null);
    setNombreProd("");
    setTipo("");
    setPesoEstimado("");
    setError("");
    setCodigoUsuario("");

    setCodigoBuffer([]);
    setCodigoConfirmado(false);
    setUltimaDeteccion(null);

    if (modo === "codigo") {
      stopScanner();
      setTimeout(() => {
        const tempModo = modo;
        setModo("manual");
        setTimeout(() => setModo(tempModo), 100);
      }, 100);
    }
  };

  const reiniciarScanner = () => {
    stopScanner();

    setCodigo("");
    setProducto(null);
    setNombreProd("");
    setTipo("");
    setPesoEstimado("");
    setError("");
    setCodigoBuffer([]);
    setCodigoConfirmado(false);
    setUltimaDeteccion(null);

    setTimeout(() => {
      if (modo === "codigo") {
        const tempModo = modo;
        setModo("manual");
        setTimeout(() => setModo(tempModo), 100);
      }
    }, 100);
  };

  if (userDetails?.tipo !== 'comercio') {
    return (
      <div className="scan-container">
        <div className="error">
          <h2>Acceso Restringido</h2>
          <p>Esta página es solo para comercios registrados.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="scan-container">
      <div className="header-section">
        <h2>Recepción de Reciclajes</h2>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {!codigoConfirmado && (
            <button
              className={`toggle-scanner ${isScanning ? 'active' : ''}`}
              onClick={() => {
                if (isScanning) {
                  setModo("manual");
                  stopScanner();
                } else {
                  setModo("codigo");
                }
              }}
            >
              {isScanning ? '✏️ Registrar manual' : '📷 Escanear código'}
            </button>
          )}

          {modo === "codigo" && (
            <button
              className="btn-ayuda"
              onClick={() => setMostrarAyuda(true)}
              title="Ver tips de escaneo"
            >
              💡 Tips
            </button>
          )}
        </div>
      </div>

      <div className={`main-layout ${codigoConfirmado || modo === "manual" ? 'sin-scanner' : ''}`}>

        {modo === "codigo" && !codigoConfirmado && (
          <div className="scanner-column">
            <div className="modo-codigo">
              <div className="scanner-container">
                <div
                  ref={scannerRef}
                  className="scanner-viewport"
                />

                <div className="scanner-controls">
                  {scannerReady && !codigoConfirmado && (
                    <button
                      className="btn-reset"
                      onClick={reiniciarScanner}
                      title="Reiniciar scanner"
                    >
                      🔄 Reiniciar
                    </button>
                  )}

                  {codigoConfirmado && (
                    <button
                      className="btn-nuevo"
                      onClick={() => {
                        setCodigo("");
                        setCodigoConfirmado(false);
                        setCodigoBuffer([]);
                        setUltimaDeteccion(null);
                        setError("");
                        setTimeout(() => {
                          window.location.reload();
                        }, 100);
                      }}
                      title="Escanear otro código"
                    >
                      📷 Nuevo código
                    </button>
                  )}
                </div>

                {scannerReady && !codigoConfirmado && codigoBuffer.length > 0 && (
                  <div className="validation-indicator">
                    <div className="validation-dots">
                      {[1, 2, 3].map(i => (
                        <div
                          key={i}
                          className={`dot ${Math.min(codigoBuffer.length, 3) >= i ? 'active' : ''}`}
                        />
                      ))}
                    </div>
                    <p>Validando... {Math.min(codigoBuffer.length, 3)}/3</p>
                  </div>
                )}
              </div>

              <div className="scanner-feedback">
                {!isScanning && !error && !buscandoProducto && (
                  <p className="loading">🔄 Iniciando scanner...</p>
                )}
                {isScanning && !scannerReady && (
                  <p className="loading">📷 Preparando cámara...</p>
                )}
                {buscandoProducto && (
                  <p className="loading">🔍 Buscando producto en base de datos...</p>
                )}
                {codigo && codigoConfirmado && !buscandoProducto && (
                  <div className="codigo-detectado">
                    <p>✅ <strong>Código confirmado:</strong></p>
                    <span className="codigo-text">{codigo}</span>
                    <p className="scan-complete">✨ Scanner detenido. Para escanear otro, usa "🔄 Reiniciar"</p>
                  </div>
                )}
                {error && modo === "codigo" && !error.includes("Producto no registrado") && <p className="error">{error}</p>}
              </div>
            </div>
          </div>
        )}

        <div className="form-column">
          <div className="registro-producto">
            {codigoConfirmado && modo === "codigo" && (
              <div className="codigo-confirmado-badge">
                ✅ Código escaneado: <strong>{codigo}</strong>
                <button
                  className="btn-volver-scanner"
                  onClick={reiniciarScanner}
                  title="Volver al scanner"
                >
                  🔄 Escanear otro
                </button>
              </div>
            )}

            {buscandoProducto ? (
              <div className="buscando-producto">
                <div className="spinner"></div>
                <h3>🔍 Buscando producto...</h3>
                <p>Consultando base de datos</p>
              </div>
            ) : (
              <>
                <h3>{producto ? "Producto encontrado" : "Datos del producto"}</h3>

                {modo === "manual" && (
                  <>
                    <label>
                      Código (opcional):
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                          type="text"
                          value={codigo}
                          onChange={e => setCodigo(e.target.value)}
                          placeholder="Ej: 7790310083703"
                          style={{ flex: 1 }}
                        />
                        <button
                          className="btn-buscar-codigo"
                          onClick={buscarProductoPorCodigo}
                          disabled={!codigo || buscandoProducto}
                          type="button"
                        >
                          {buscandoProducto ? '🔍...' : '🔍 Buscar'}
                        </button>
                      </div>
                    </label>
                  </>
                )}

                <label>
                  Nombre del producto:
                  <input
                    type="text"
                    value={nombreProd}
                    onChange={e => setNombreProd(e.target.value)}
                    placeholder="Ej: Botella de plástico"
                    disabled={producto !== null}
                  />
                </label>

                <label>
                  Tipo de material:
                  <select
                    value={tipo || ''}
                    onChange={e => setTipo(e.target.value)}
                    disabled={producto !== null}
                  >
                    <option value="">– Selecciona el tipo –</option>
                    {MATERIALES.map(m => (
                      <option key={m.value} value={m.value}>
                        {m.value}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Peso estimado (kg):
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={pesoEstimado}
                    onChange={e => setPesoEstimado(e.target.value)}
                    placeholder="Ej: 0.5"
                  />
                </label>

                {/* Sección de código de usuario - específico para comercio */}
                {tipo && pesoEstimado && (
                  <div className="punto-reciclaje-section">
                    <label>Código del Usuario:</label>
                    <input
                      type="text"
                      value={codigoUsuario}
                      onChange={e => setCodigoUsuario(e.target.value)}
                      placeholder="Ej: USER123 o email del usuario"
                      style={{ marginTop: '0.5rem' }}
                    />
                    <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
                      El usuario debe proporcionarte su código único o email
                    </p>

                    {codigoUsuario && tipo && pesoEstimado && (
                      <div className="info-punto-seleccionado" style={{ marginTop: '0.75rem' }}>
                        <h4>📋 Resumen del reciclaje</h4>
                        <p><strong>Material:</strong> {tipo}</p>
                        <p><strong>Peso:</strong> {pesoEstimado} kg</p>
                        <p><strong>Usuario:</strong> {codigoUsuario}</p>
                        <p className="multiplicador-info">
                          <strong>Puntos a otorgar:</strong> {calcularPuntos()} puntos
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {error && !error.includes("Producto no registrado") && <p className="error">{error}</p>}

                {error && error.includes("Producto no registrado") && (
                  <div className="info-box warning">
                    <p>📝 <strong>Producto no encontrado</strong></p>
                    <p>Completa los campos para registrar este producto en la base de datos.</p>
                  </div>
                )}

                <div className="botones-accion">
                  {!producto && codigo && nombreProd && tipo && pesoEstimado && (
                    <button className="btn orange" onClick={registrarProducto}>
                      📝 Registrar Producto Nuevo
                    </button>
                  )}

                  {(producto || (modo === "manual" && tipo && pesoEstimado)) && codigoUsuario && (
                    <button
                      className="btn green"
                      onClick={guardarReciclaje}
                      disabled={loading}
                    >
                      {loading ? '⏳ Procesando...' : '♻️ Procesar Reciclaje'}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal de éxito */}
      {mostrarModalExito && (
        <div className="modal-overlay" onClick={() => setMostrarModalExito(false)}>
          <div className="modal-exito" onClick={e => e.stopPropagation()}>
            <div className="modal-exito-header">
              <div className="success-icon">✓</div>
              <h3>Reciclaje Procesado</h3>
            </div>

            <div className="modal-exito-content">
              <p className="success-message">El reciclaje se registró correctamente</p>

              {datosExito.puntos > 0 && (
                <div className="exito-stat puntos">
                  <div className="stat-icon">🏆</div>
                  <div className="stat-info">
                    <div className="stat-label">Puntos otorgados</div>
                    <div className="stat-value">{datosExito.puntos} puntos</div>
                  </div>
                </div>
              )}

              {datosExito.usuario && (
                <div className="exito-stat distancia">
                  <div className="stat-icon">👤</div>
                  <div className="stat-info">
                    <div className="stat-label">Usuario beneficiado</div>
                    <div className="stat-value">{datosExito.usuario}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-exito-actions">
              <button
                className="btn-exito-cerrar"
                onClick={() => setMostrarModalExito(false)}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de ayuda */}
      {mostrarAyuda && (
        <div className="modal-overlay" onClick={() => setMostrarAyuda(false)}>
          <div className="modal-ayuda" onClick={e => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setMostrarAyuda(false)}
              type="button"
            >
              ✕
            </button>

            <div className="ayuda-header">
              <div className="ayuda-icon">📷</div>
              <h3>Apunta hacia el código de barras</h3>
            </div>

            <div className="ayuda-content">
              <div className="ayuda-section">
                <p className="ayuda-titulo">💡 <strong>Tips para escanear:</strong></p>
                <ul className="ayuda-lista">
                  <li>• Busca códigos <strong>EAN-13</strong> (13 dígitos) o <strong>EAN-8</strong> (8 dígitos)</li>
                  <li>• Común en productos de supermercado</li>
                  <li>• Mantén el código derecho y centrado</li>
                  <li>• Espera 3 detecciones para confirmar</li>
                  <li>• Buena iluminación es clave 💡</li>
                </ul>
              </div>
            </div>

            <div className="ayuda-actions">
              <button
                className="btn-ayuda-cerrar"
                onClick={() => setMostrarAyuda(false)}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de producto agregado */}
      {mostrarModalProducto && productoAgregado && (
        <div className="modal-overlay" onClick={() => setMostrarModalProducto(false)}>
          <div className="modal-producto" onClick={e => e.stopPropagation()}>
            <div className="modal-producto-header">
              <div className="producto-icon">📦</div>
              <h3>Producto Agregado</h3>
            </div>

            <div className="modal-producto-content">
              <p className="producto-mensaje">El producto se agregó correctamente a la base de datos</p>

              <div className="producto-info-card">
                <div className="producto-detail">
                  <span className="detail-label">Nombre</span>
                  <span className="detail-value">{productoAgregado.nombre}</span>
                </div>

                <div className="producto-detail">
                  <span className="detail-label">Material</span>
                  <span className="detail-value material-badge">{productoAgregado.tipo}</span>
                </div>

                <div className="producto-detail">
                  <span className="detail-label">Código</span>
                  <span className="detail-value codigo-badge">{productoAgregado.codigo}</span>
                </div>
              </div>

              <div className="producto-siguiente">
                <div className="siguiente-icon">👉</div>
                <p>Ahora puedes continuar y procesar el reciclaje</p>
              </div>
            </div>

            <div className="modal-producto-actions">
              <button
                className="btn-producto-continuar"
                onClick={() => setMostrarModalProducto(false)}
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
