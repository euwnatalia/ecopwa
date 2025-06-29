// src/pages/dashboard/Scan.jsx
import { useState, useEffect, useRef } from "react";
import Quagga from "@ericblade/quagga2";
import "./Scan.css";

export default function Scan() {
  const [modo, setModo] = useState("codigo");             // "codigo" o "manual"
  const [codigo, setCodigo] = useState("");
  const [nombreProd, setNombreProd] = useState("");
  const [tipo, setTipo] = useState("");
  const [pesoEstimado, setPesoEstimado] = useState("");
  const [error, setError] = useState("");
  const [producto, setProducto] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  
  // Nuevos estados para geolocalización y puntos de reciclaje
  const [userLocation, setUserLocation] = useState(null);
  const [puntosReciclaje, setPuntosReciclaje] = useState([]);
  const [puntoSeleccionado, setPuntoSeleccionado] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingPuntos, setLoadingPuntos] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  
  // Estados para validación múltiple
  const [codigoBuffer, setCodigoBuffer] = useState([]);
  const [ultimaDeteccion, setUltimaDeteccion] = useState(null);
  const [codigoConfirmado, setCodigoConfirmado] = useState(false);

  // Estados para crear punto de reciclaje
  const [mostrarFormPunto, setMostrarFormPunto] = useState(false);
  const [nuevoPunto, setNuevoPunto] = useState({
    nombre: "",
    direccion: "",
    tipo: "",
    lat: null,
    lng: null
  });
  const [creandoPunto, setCreandoPunto] = useState(false);

  const scannerRef = useRef(null);
  const detectionTimeoutRef = useRef(null);

  // Obtener geolocalización al cargar el componente
  useEffect(() => {
    obtenerUbicacion();
  }, []);

  // Cargar puntos cercanos cuando tengamos la ubicación
  useEffect(() => {
    if (userLocation && tipo) {
      cargarPuntosCercanos();
    }
  }, [userLocation, tipo]);

  const obtenerUbicacion = () => {
    if (!navigator.geolocation) {
      setError("Tu navegador no soporta geolocalización");
      return;
    }

    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(location);
        setLoadingLocation(false);
        console.log("Ubicación obtenida:", location);
      },
      (error) => {
        console.error("Error obteniendo ubicación:", error);
        setLoadingLocation(false);
        setError("No se pudo obtener tu ubicación. Los puntos se mostrarán sin orden por distancia.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutos
      }
    );
  };

  const cargarPuntosCercanos = async () => {
    setLoadingPuntos(true);
    try {
      const params = new URLSearchParams();
      
      if (userLocation) {
        params.append('lat', userLocation.lat);
        params.append('lng', userLocation.lng);
        params.append('radio', '100'); // 100km de radio (aprox 1 hora)
      }

      const response = await fetch(
        `http://localhost:4000/api/puntos?${params}`, 
        {
          headers: { 
            Authorization: `Bearer ${localStorage.getItem("token")}` 
          }
        }
      );
      
      if (response.ok) {
        const puntos = await response.json();
        setPuntosReciclaje(puntos);
        
        // Auto-seleccionar el punto más cercano si hay ubicación
        if (puntos.length > 0 && userLocation) {
          // Encontrar el punto más cercano que acepta el tipo de material seleccionado
          const puntoCompatible = puntos.find(punto => 
            punto.tipo.toLowerCase() === tipo.toLowerCase()
          );
          
          if (puntoCompatible) {
            setPuntoSeleccionado(puntoCompatible);
          } else {
            // Si no hay punto compatible, seleccionar el más cercano de cualquier tipo
            setPuntoSeleccionado(puntos[0]);
          }
        }
      } else {
        console.error("Error cargando puntos:", response.statusText);
      }
    } catch (err) {
      console.error("Error cargando puntos cercanos:", err);
      setError("Error al cargar puntos de reciclaje cercanos");
    } finally {
      setLoadingPuntos(false);
    }
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
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            facingMode: "environment"
          }
        },
        decoder: {
          readers: [
            "ean_reader",       // EAN-13 (muy común en Argentina)
            "ean_8_reader",     // EAN-8 
            "code_128_reader",  // Code 128 (productos locales)
            "upc_reader",       // UPC-A (productos importados)
            "upc_e_reader"      // UPC-E
          ]
        },
        locate: true,
        frequency: 25,   // Frecuencia optimizada
        debug: false
      };

      Quagga.init(config, (err) => {
        if (err) {
          console.error("Error inicializando Quagga:", err);
          setError("Error al inicializar el scanner: " + err.message);
          setIsScanning(false);
          setScannerReady(false);
          return;
        }
        
        console.log("Quagga inicializado correctamente");
        Quagga.start();
        setIsScanning(true);
        setScannerReady(true);
        setError("");
      });

      // Listener para detección de códigos con validación múltiple
      Quagga.onDetected((result) => {
        const code = result.codeResult.code;
        const now = Date.now();
        
        // Si ya se confirmó un código, no procesar más
        if (codigoConfirmado) return;
        
        // Throttle: solo permitir una detección cada 50ms
        if (ultimaDeteccion && now - ultimaDeteccion < 50) {
          return;
        }
        
        setUltimaDeteccion(now);
        console.log("Código detectado (validando):", code);
        
        // Agregar al buffer de detecciones
        setCodigoBuffer(prev => {
          const newBuffer = [...prev, { code, timestamp: now }];
          
          // Limpiar detecciones antiguas (más de 1000ms)
          const filteredBuffer = newBuffer.filter(item => 
            now - item.timestamp < 1000
          );
          
          // Verificar si tenemos 3 detecciones del mismo código
          const sameCodeDetections = filteredBuffer.filter(item => item.code === code);
          
          if (sameCodeDetections.length >= 3) {
            // ¡Código confirmado!
            setTimeout(() => confirmarCodigo(code), 100);
            return [];
          }
          
          return filteredBuffer;
        });
      });
    };

    // Función para confirmar código después de 3 detecciones
    const confirmarCodigo = (code) => {
      console.log("✅ Código confirmado:", code);
      
      // Parar el scanner inmediatamente
      stopScanner();
      
      // Establecer el código confirmado
      setCodigo(code);
      setCodigoConfirmado(true);
      setError("");
      
      // Limpiar el buffer
      setCodigoBuffer([]);
    };

    // Delay para asegurar que el DOM esté listo
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
        console.log("Scanner detenido");
      } catch (err) {
        console.log("Error deteniendo scanner:", err);
      }
    }
    setIsScanning(false);
    setScannerReady(false);
  };

  // cada vez que cambie el código intento cargar el producto
  useEffect(() => {
    if (!codigo) return;
    
    const buscarProducto = async () => {
      try {
        const response = await fetch(
          `http://localhost:4000/api/productos?codigo=${encodeURIComponent(codigo)}`, 
          {
            headers: { 
              Authorization: `Bearer ${localStorage.getItem("token")}` 
            }
          }
        );
        
        if (response.ok) {
          const prod = await response.json();
          console.log("Producto encontrado:", prod); // Para debug
        setProducto(prod);
          setNombreProd(prod.nombre || "");
          setTipo(prod.tipo || "");
          setPesoEstimado(prod.pesoEstimado ? prod.pesoEstimado.toString() : "");
        setError("");
        } else if (response.status === 404) {
          // Producto no encontrado
          setProducto(null);
          setNombreProd("");
          setTipo("");
          setPesoEstimado("");
          setError("Producto no registrado. Rellena los campos abajo para añadirlo.");
        } else {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
      } catch (err) {
        console.error("Error buscando producto:", err);
        setProducto(null);
        setNombreProd("");
        setTipo("");
        setPesoEstimado("");
        setError("Error al buscar el producto. Verifica tu conexión.");
      }
    };

    buscarProducto();
  }, [codigo]);

  // POST /api/productos
  const registrarProducto = async () => {
    if (!codigo || !nombreProd || !tipo || !pesoEstimado) {
      alert("Completa todos los campos para registrar.");
      return;
    }
    
    try {
      const res = await fetch("http://localhost:4000/api/productos", {
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
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || res.statusText);
      }

      setProducto(data);
      setError("");
      alert("✅ Producto agregado correctamente. Ahora puedes guardar el reciclaje.");
    } catch (e) {
      console.error("Error registrando producto:", e);
      alert("Error al registrar producto: " + e.message);
    }
  };

  // POST /api/reciclajes - Actualizado para incluir punto de reciclaje
  const guardarReciclaje = async () => {
    if (!tipo || !pesoEstimado) {
      alert("Debes indicar tipo y peso para guardar el reciclaje.");
      return;
    }
    
    if (!puntoSeleccionado) {
      alert("Debes seleccionar un punto de reciclaje.");
      return;
    }
    
    // Verificar compatibilidad de materiales
    const esCompatible = puntoSeleccionado.tipo.toLowerCase() === tipo.toLowerCase();
    
    if (!esCompatible) {
      const confirmar = confirm(
        `⚠️ ADVERTENCIA:\n\n` +
        `El punto "${puntoSeleccionado.nombre}" acepta ${puntoSeleccionado.tipo}, ` +
        `pero estás registrando ${tipo}.\n\n` +
        `¿Estás seguro de que este punto acepta tu material?\n\n` +
        `Presiona OK para continuar o Cancelar para elegir otro punto.`
      );
      
      if (!confirmar) {
        return;
      }
    }
    
    try {
      const reciclaje = {
        codigo: modo === "codigo" ? codigo : undefined,
        tipo,
        cantidad: parseFloat(pesoEstimado),
        puntoReciclaje: {
          id: puntoSeleccionado.id,
          nombre: puntoSeleccionado.nombre
        },
        tipoCompatible: esCompatible
      };
      
      // Agregar ubicación del usuario si está disponible
      if (userLocation) {
        reciclaje.userLat = userLocation.lat;
        reciclaje.userLng = userLocation.lng;
      }
      
      const res = await fetch("http://localhost:4000/api/reciclajes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(reciclaje)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || res.statusText);
      }

      const puntosMsg = data.puntosObtenidos 
        ? `\n🏆 ¡Ganaste ${data.puntosObtenidos} puntos!` 
        : '';
      
      const distanciaMsg = data.distancia 
        ? `\n📍 Distancia: ${data.distancia.toFixed(1)} km` 
        : '';

      const compatibilidadMsg = !esCompatible 
        ? `\n⚠️ Recuerda verificar que acepten tu material` 
        : '';

      alert(`✅ Reciclaje registrado correctamente${puntosMsg}${distanciaMsg}${compatibilidadMsg}`);
      
      // limpio todo
      limpiarFormulario();
    } catch (e) {
      console.error("Error guardando reciclaje:", e);
      alert("Error al guardar reciclaje: " + e.message);
    }
  };

  const limpiarFormulario = () => {
      setCodigo("");
      setProducto(null);
      setNombreProd("");
      setTipo("");
      setPesoEstimado("");
      setError("");
    setPuntoSeleccionado(null);
    setPuntosReciclaje([]);
    
    // Limpiar estados del scanner
    setCodigoBuffer([]);
    setCodigoConfirmado(false);
    setUltimaDeteccion(null);
  };

  const cambiarModo = (nuevoModo) => {
    // Si estamos cambiando al modo código y ya hay un código confirmado, reiniciar scanner
    if (nuevoModo === "codigo" && (codigoConfirmado || codigo)) {
      reiniciarScanner();
      return;
    }
    
    setModo(nuevoModo);
    limpiarFormulario();
  };

  const formatDistancia = (distancia) => {
    if (distancia === undefined) return '';
    if (distancia < 1) return `${(distancia * 1000).toFixed(0)}m`;
    return `${distancia.toFixed(1)}km`;
  };

  const getMultiplicadorPuntos = (distancia) => {
    if (distancia <= 2) return 2.0;
    if (distancia <= 10) return 1.5;
    if (distancia <= 30) return 1.2;
    if (distancia <= 60) return 1.0;
    return 0.8;
  };

  const reiniciarScanner = () => {
    stopScanner();
    
    // Limpiar todos los estados
    setCodigo("");
    setError("");
    setCodigoBuffer([]);
    setCodigoConfirmado(false);
    setUltimaDeteccion(null);
    
    // Reiniciar el scanner si estamos en modo código
    if (modo === "codigo") {
      setTimeout(() => {
        setModo("codigo"); // Forzar re-render del useEffect
      }, 200);
    }
  };

  // Función para abrir formulario de nuevo punto
  const abrirFormularioPunto = () => {
    if (userLocation && tipo) {
      setNuevoPunto({
        nombre: "",
        direccion: "",
        tipo: tipo,
        lat: userLocation.lat,
        lng: userLocation.lng
      });
      setMostrarFormPunto(true);
    } else {
      alert("Necesitas ubicación y tipo de material seleccionado");
    }
  };

  // Función para crear punto de reciclaje
  const crearPuntoReciclaje = async () => {
    if (!nuevoPunto.nombre || !nuevoPunto.direccion) {
      alert("Por favor completa nombre y dirección del punto");
      return;
    }

    setCreandoPunto(true);
    try {
      const response = await fetch("http://localhost:4000/api/puntos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(nuevoPunto)
      });

      if (response.ok) {
        const puntoCreado = await response.json();
        alert(`✅ Punto de reciclaje "${puntoCreado.nombre}" creado exitosamente`);
        
        // Cerrar formulario y recargar puntos
        setMostrarFormPunto(false);
        setNuevoPunto({ nombre: "", direccion: "", tipo: "", lat: null, lng: null });
        cargarPuntosCercanos();
      } else {
        throw new Error("Error al crear punto");
      }
    } catch (err) {
      console.error("Error creando punto:", err);
      alert("Error al crear punto de reciclaje: " + err.message);
    } finally {
      setCreandoPunto(false);
    }
  };

  return (
    <div className="scan-container">
      <h2>Escanear / Registrar Reciclaje</h2>

      {/* Información de ubicación */}
      {loadingLocation && (
        <div className="location-info">
          <p>📍 Obteniendo tu ubicación...</p>
        </div>
      )}
      
      {userLocation && (
        <div className="location-info">
          <p>📍 Ubicación obtenida correctamente</p>
        </div>
      )}

      {/* switch de modo */}
      <div className="scan-modo">
        <button
          className={modo === "codigo" ? "activo" : ""}
          onClick={() => cambiarModo("codigo")}
        >
          📷 Con código de barras
        </button>
        <button
          className={modo === "manual" ? "activo" : ""}
          onClick={() => cambiarModo("manual")}
        >
          ✍️ Registro manual
        </button>
      </div>

      {/* Layout principal: Scanner + Formulario */}
      <div className="main-layout">
        
        {/* Columna Izquierda: Scanner */}
        <div className="scanner-column">
      {modo === "codigo" && (
        <div className="modo-codigo">
              <div className="scanner-container">
                <div 
                  ref={scannerRef} 
                  className="scanner-viewport"
                />
                
                {/* Controles del scanner */}
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
                        // Reiniciar el scanner
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
                
                {/* Indicador de validación */}
                {scannerReady && !codigoConfirmado && codigoBuffer.length > 0 && (
                  <div className="validation-indicator">
                    <div className="validation-dots">
                      {[1, 2, 3].map(i => (
                        <div 
                          key={i}
                          className={`dot ${codigoBuffer.length >= i ? 'active' : ''}`}
                        />
                      ))}
                    </div>
                    <p>Validando... {codigoBuffer.length}/3</p>
                  </div>
                )}
              </div>
              
              {/* Estado y feedback */}
              <div className="scanner-feedback">
                {!isScanning && !error && (
                  <p className="loading">🔄 Iniciando scanner...</p>
                )}
                {isScanning && !scannerReady && (
                  <p className="loading">📷 Preparando cámara...</p>
                )}
                {scannerReady && !codigo && !codigoConfirmado && (
                  <div className="scanner-tips">
                    <p className="instruction">📷 Apunta hacia el código de barras</p>
                    <div className="tips">
                      <p>💡 <strong>Tips para Argentina:</strong></p>
                      <ul>
                        <li>• Busca códigos <strong>EAN-13</strong> (13 dígitos)</li>
                        <li>• Común en productos de supermercado</li>
                        <li>• Mantén el código derecho y centrado</li>
                        <li>• Espera 3 detecciones para confirmar</li>
                        <li>• Buena iluminación es clave 💡</li>
                      </ul>
                    </div>
                  </div>
                )}
                {codigo && codigoConfirmado && (
                  <div className="codigo-detectado">
                    <p>✅ <strong>Código confirmado:</strong></p>
                    <span className="codigo-text">{codigo}</span>
                    <p className="scan-complete">✨ Scanner detenido. Para escanear otro, usa "📷 Nuevo código"</p>
                  </div>
                )}
          {error && <p className="error">{error}</p>}
              </div>
        </div>
      )}

          {modo === "manual" && (
            <div className="modo-manual">
              <div className="manual-placeholder">
                <h3>✍️ Registro Manual</h3>
                <p>Completa el formulario de la derecha para registrar tu reciclaje manualmente.</p>
              </div>
            </div>
          )}
        </div>

        {/* Columna Derecha: Formulario */}
        <div className="form-column">
      <div className="registro-producto">
            <h3>{producto ? "Producto encontrado" : "Datos del producto"}</h3>
            
        {modo === "manual" && (
          <label>
            Código:
            <input
              type="text"
              value={codigo}
              onChange={e => setCodigo(e.target.value)}
                  placeholder="Ingresa el código del producto"
            />
          </label>
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
                value={tipo} 
                onChange={e => setTipo(e.target.value)}
                disabled={producto !== null}
              >
                <option value="">– Selecciona el tipo –</option>
                <option value="Plástico">Plástico</option>
                <option value="Vidrio">Vidrio</option>
                <option value="Cartón">Cartón</option>
                <option value="Papel">Papel</option>
                <option value="Metal">Metal</option>
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

            {/* Selector de punto de reciclaje mejorado */}
            {tipo && (
              <div className="punto-reciclaje-section">
                <label>Punto de reciclaje:</label>
                {loadingPuntos ? (
                  <p>🔄 Cargando puntos cercanos...</p>
                ) : puntosReciclaje.length > 0 ? (
                  <div className="selector-puntos">
                    <select
                      value={puntoSeleccionado?.id || ""}
                      onChange={e => {
                        const punto = puntosReciclaje.find(p => p.id === e.target.value);
                        setPuntoSeleccionado(punto);
                      }}
                    >
                      <option value="">– Selecciona un punto –</option>
                      {puntosReciclaje.map(punto => {
                        const esCompatible = punto.tipo.toLowerCase() === tipo.toLowerCase();
                        const distanciaTexto = punto.distancia ? ` (${formatDistancia(punto.distancia)})` : '';
                        const tipoIndicador = esCompatible ? '✅' : '⚠️';
                        
                        return (
                          <option key={punto.id} value={punto.id}>
                            {tipoIndicador} {punto.nombre} - {punto.tipo}{distanciaTexto}
                          </option>
                        );
                      })}
                    </select>
                    
                    {/* Advertencia de compatibilidad */}
                    {puntoSeleccionado && puntoSeleccionado.tipo.toLowerCase() !== tipo.toLowerCase() && (
                      <div className="warning-compatibilidad">
                        ⚠️ <strong>Advertencia:</strong> Este punto acepta <strong>{puntoSeleccionado.tipo}</strong>, 
                        pero seleccionaste <strong>{tipo}</strong>. 
                        Verifica que acepten tu material antes de ir.
                      </div>
                    )}
                    
                    {/* Info del punto seleccionado */}
                    {puntoSeleccionado && (
                      <div className="info-punto-seleccionado">
                        <h4>📍 {puntoSeleccionado.nombre}</h4>
                        <p><strong>Tipo:</strong> {puntoSeleccionado.tipo}</p>
                        {puntoSeleccionado.direccion && (
                          <p><strong>Dirección:</strong> {puntoSeleccionado.direccion}</p>
                        )}
                        {puntoSeleccionado.distancia && (
                          <p><strong>Distancia:</strong> {formatDistancia(puntoSeleccionado.distancia)}</p>
                        )}
                        {puntoSeleccionado.distancia && getMultiplicadorPuntos(puntoSeleccionado.distancia) && (
                          <p className="multiplicador-info">
                            <strong>Bonus distancia:</strong> ×{getMultiplicadorPuntos(puntoSeleccionado.distancia)} puntos
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="no-puntos">
                    <p>No hay puntos de reciclaje en un radio de 100km.</p>
                    <p className="puntos-info">
                      💡 <strong>Sistema de puntos por distancia:</strong><br/>
                      • ≤2km: ×2.0 puntos 🏆<br/>
                      • ≤10km: ×1.5 puntos 🥈<br/>
                      • ≤30km: ×1.2 puntos 🥉<br/>
                      • ≤60km: puntos normales<br/>
                      • &gt;60km: ×0.8 puntos
                    </p>
                    <div className="puntos-actions">
                      <button 
                        className="btn orange small" 
                        onClick={() => cargarPuntosCercanos()}
                      >
                        🔄 Recargar puntos
                      </button>
                      <button 
                        className="btn green small" 
                        onClick={abrirFormularioPunto}
                      >
                        ➕ Agregar punto aquí
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && <p className="error">{error}</p>}

            <div className="botones-accion">
              {!producto && codigo && nombreProd && tipo && pesoEstimado && (
          <button className="btn orange" onClick={registrarProducto}>
                  📝 Registrar Producto Nuevo
          </button>
        )}
              
              {(producto || (modo === "manual" && tipo && pesoEstimado)) && puntoSeleccionado && (
          <button className="btn green" onClick={guardarReciclaje}>
                  ♻️ Guardar Reciclaje
          </button>
        )}
      </div>
          </div>
        </div>
      </div>

      {/* Modal para crear punto de reciclaje */}
      {mostrarFormPunto && (
        <div className="modal-overlay" onClick={() => setMostrarFormPunto(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>➕ Agregar Punto de Reciclaje</h3>
            <form onSubmit={e => { e.preventDefault(); crearPuntoReciclaje(); }}>
              <label>
                Nombre del punto:
                <input
                  type="text"
                  value={nuevoPunto.nombre}
                  onChange={e => setNuevoPunto({...nuevoPunto, nombre: e.target.value})}
                  placeholder="Ej: Centro de Reciclaje Municipal"
                  required
                />
              </label>
              
              <label>
                Dirección:
                <input
                  type="text"
                  value={nuevoPunto.direccion}
                  onChange={e => setNuevoPunto({...nuevoPunto, direccion: e.target.value})}
                  placeholder="Ej: Av. Colón 123, Córdoba"
                  required
                />
              </label>
              
              <label>
                Tipo de material:
                <select 
                  value={nuevoPunto.tipo} 
                  onChange={e => setNuevoPunto({...nuevoPunto, tipo: e.target.value})}
                  required
                >
                  <option value={tipo}>{tipo}</option>
                  <option value="Plástico">Plástico</option>
                  <option value="Vidrio">Vidrio</option>
                  <option value="Cartón">Cartón</option>
                  <option value="Papel">Papel</option>
                  <option value="Metal">Metal</option>
                </select>
              </label>
              
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn orange" 
                  onClick={() => setMostrarFormPunto(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn green" 
                  disabled={creandoPunto}
                >
                  {creandoPunto ? "Creando..." : "✅ Crear Punto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
