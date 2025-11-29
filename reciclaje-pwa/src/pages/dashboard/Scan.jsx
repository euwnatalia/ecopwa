// src/pages/dashboard/Scan.jsx
import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import Quagga from "@ericblade/quagga2";
import API_URL from "../../config/api.js";
import "./Scan.css";

export default function Scan() {
  const { onLogout } = useOutletContext();
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
    horarios: "",
    observaciones: "",
    lat: null,
    lng: null
  });
  const [creandoPunto, setCreandoPunto] = useState(false);

  // Estado para modal de éxito
  const [mostrarModalExito, setMostrarModalExito] = useState(false);
  const [datosExito, setDatosExito] = useState({
    puntos: 0,
    distancia: 0,
    advertencia: false
  });

  const [mostrarModalProducto, setMostrarModalProducto] = useState(false);
  const [productoAgregado, setProductoAgregado] = useState(null);
  const [mostrarAyuda, setMostrarAyuda] = useState(false);
  const [buscandoProducto, setBuscandoProducto] = useState(false);
  const [errorCamara, setErrorCamara] = useState(null); // Estado para errores de cámara específicos

  const scannerRef = useRef(null);
  const detectionTimeoutRef = useRef(null);

  const handleUnauthorized = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    onLogout();
  };

  useEffect(() => {
    obtenerUbicacion();

    const ayudaMostrada = localStorage.getItem('ayudaScannerMostrada');
    if (!ayudaMostrada) {
      setMostrarAyuda(true);
      localStorage.setItem('ayudaScannerMostrada', 'true');
    }
  }, []);

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
        },
      (error) => {
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
        params.append('radio', '100');
      }

      const response = await fetch(
        `${API_URL}/puntos?${params}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      if (response.ok) {
        const puntos = await response.json();
        setPuntosReciclaje(puntos);

        if (puntos.length > 0 && userLocation) {
          const puntoCompatible = puntos.find(punto =>
            punto.tipo && tipo && punto.tipo.toLowerCase() === tipo.toLowerCase()
          );

          if (puntoCompatible) {
            setPuntoSeleccionado(puntoCompatible);
          } else {
            setPuntoSeleccionado(puntos[0]);
          }
        }
      } else {
        if (response.status === 401) {
          handleUnauthorized();
        } else {
          const errorText = await response.text();
          setError(`Error ${response.status}: ${errorText}`);
        }
      }
    } catch (err) {
      setError("Error al cargar puntos de reciclaje cercanos: " + err.message);
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
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            aspectRatio: { ideal: 16/9 },
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
          // Manejar errores específicos de cámara
          let errorInfo = {
            tipo: 'desconocido',
            mensaje: 'Error al acceder a la cámara',
            descripcion: err.message
          };

          if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
            errorInfo = {
              tipo: 'permiso_denegado',
              mensaje: 'Permiso de cámara denegado',
              descripcion: 'Necesitamos acceso a tu cámara para escanear códigos de barras.'
            };
          } else if (err.name === 'NotFoundError' || err.message?.includes('Requested device not found')) {
            errorInfo = {
              tipo: 'sin_camara',
              mensaje: 'No se encontró una cámara',
              descripcion: 'Tu dispositivo no tiene cámara disponible o no está conectada.'
            };
          } else if (err.name === 'NotReadableError' || err.message?.includes('Could not start video source')) {
            errorInfo = {
              tipo: 'camara_en_uso',
              mensaje: 'La cámara está en uso',
              descripcion: 'Otra aplicación está usando la cámara. Ciérrala e intenta de nuevo.'
            };
          } else if (err.name === 'OverconstrainedError') {
            errorInfo = {
              tipo: 'camara_incompatible',
              mensaje: 'Cámara no compatible',
              descripcion: 'Tu cámara no cumple los requisitos necesarios para el scanner.'
            };
          }

          setErrorCamara(errorInfo);
          setError("");
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
        const error = result.codeResult.error;

        console.log('📷 Código detectado:', code, 'Error:', error, 'Longitud:', code?.length);

        if (codigoConfirmado) return;

        if (!code || (code.length !== 13 && code.length !== 8)) {
          console.log('❌ Rechazado: Longitud incorrecta');
          return;
        }

        if (error > 0.15) {
          console.log('❌ Rechazado: Error muy alto');
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
      } catch (err) {
      }
    }
    setIsScanning(false);
    setScannerReady(false);
  };

  // Función para solicitar permisos de cámara
  const solicitarPermisoCamara = async () => {
    try {
      // Primero verificar el estado actual del permiso
      if (navigator.permissions && navigator.permissions.query) {
        const permissionStatus = await navigator.permissions.query({ name: 'camera' });

        if (permissionStatus.state === 'denied') {
          // El permiso fue denegado permanentemente, mostrar instrucciones
          setErrorCamara({
            tipo: 'permiso_bloqueado',
            mensaje: 'Permiso de cámara bloqueado',
            descripcion: 'El acceso a la cámara está bloqueado. Debes habilitarlo manualmente en la configuración del navegador.'
          });
          return;
        }
      }

      // Intentar solicitar permiso
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      // Si llegamos aquí, el permiso fue otorgado
      stream.getTracks().forEach(track => track.stop()); // Detener el stream temporal
      setErrorCamara(null);
      // Reiniciar el scanner
      setModo("manual");
      setTimeout(() => setModo("codigo"), 100);
    } catch (err) {
      console.log('Error al solicitar cámara:', err.name, err.message);
      // Si el usuario deniega o está bloqueado
      if (err.name === 'NotAllowedError') {
        setErrorCamara({
          tipo: 'permiso_bloqueado',
          mensaje: 'Permiso de cámara bloqueado',
          descripcion: 'El acceso a la cámara está bloqueado. Debes habilitarlo manualmente en la configuración del navegador.'
        });
      }
    }
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
    
    if (!puntoSeleccionado) {
      alert("Debes seleccionar un punto de reciclaje.");
      return;
    }

    const esCompatible = puntoSeleccionado.tipo && tipo && puntoSeleccionado.tipo.toLowerCase() === tipo.toLowerCase();

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

      if (userLocation) {
        reciclaje.userLat = userLocation.lat;
        reciclaje.userLng = userLocation.lng;
      }
      
      const res = await fetch(`${API_URL}/reciclajes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(reciclaje)
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || res.statusText);
      }

      setDatosExito({
        puntos: data.puntosObtenidos || 0,
        distancia: data.distancia || 0,
        advertencia: !esCompatible
      });
      setMostrarModalExito(true);

      limpiarFormulario();
    } catch (e) {
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

    setCodigoBuffer([]);
    setCodigoConfirmado(false);
    setUltimaDeteccion(null);

    // Si estamos en modo código, reiniciar el escáner
    if (modo === "codigo") {
      stopScanner();
      // Forzar reinicio del escáner cambiando temporalmente el modo
      setTimeout(() => {
        const tempModo = modo;
        setModo("manual");
        setTimeout(() => setModo(tempModo), 100);
      }, 100);
    }
  };

  const cambiarModo = (nuevoModo) => {
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

    setCodigo("");
    setProducto(null);
    setNombreProd("");
    setTipo("");
    setPesoEstimado("");
    setError("");
    setCodigoBuffer([]);
    setCodigoConfirmado(false);
    setUltimaDeteccion(null);
    setPuntoSeleccionado(null);

    setTimeout(() => {
      if (modo === "codigo") {
        const tempModo = modo;
        setModo("manual");
        setTimeout(() => setModo(tempModo), 100);
      }
    }, 100);
  };

  const abrirFormularioPunto = () => {
    if (userLocation && tipo) {
      setNuevoPunto({
        nombre: "",
        direccion: "",
        tipo: tipo,
        horarios: "",
        observaciones: "",
        lat: userLocation.lat,
        lng: userLocation.lng
      });
      setMostrarFormPunto(true);
    } else {
      alert("Necesitas ubicación y tipo de material seleccionado");
    }
  };

  const crearPuntoReciclaje = async () => {
    if (!nuevoPunto.nombre || !nuevoPunto.direccion) {
      alert("Por favor completa nombre y dirección del punto");
      return;
    }

    setCreandoPunto(true);
    try {
      const payload = {
        ...nuevoPunto,
        tipos: [nuevoPunto.tipo]
      };
      delete payload.tipo;

      const response = await fetch(`${API_URL}/puntos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const puntoCreado = await response.json();
        alert(`✅ Punto de reciclaje "${puntoCreado.nombre}" creado exitosamente`);

        setMostrarFormPunto(false);
        setNuevoPunto({ nombre: "", direccion: "", tipo: "", horarios: "", observaciones: "", lat: null, lng: null });
        cargarPuntosCercanos();
      } else {
        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      alert("Error al crear punto de reciclaje: " + err.message);
    } finally {
      setCreandoPunto(false);
    }
  };

  return (
    <div className="scan-container">
      <div className="header-section">
        <h2>Registrar Reciclaje</h2>

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

      {loadingLocation && (
        <div className="location-info">
          <p>📍 Obteniendo tu ubicación...</p>
        </div>
      )}

      <div className={`main-layout ${codigoConfirmado || modo === "manual" ? 'sin-scanner' : ''}`}>

        {modo === "codigo" && !codigoConfirmado && (
        <div className="scanner-column">
        <div className="modo-codigo">
              {/* Mostrar error de cámara si existe */}
              {errorCamara ? (
                <div className="error-camara-container">
                  <div className="error-camara-icon">
                    {(errorCamara.tipo === 'permiso_denegado' || errorCamara.tipo === 'permiso_bloqueado') ? '🔒' : null}
                    {errorCamara.tipo === 'sin_camara' ? '📷' : null}
                    {errorCamara.tipo === 'camara_en_uso' ? '⚠️' : null}
                    {errorCamara.tipo === 'camara_incompatible' ? '❌' : null}
                    {errorCamara.tipo === 'desconocido' ? '❓' : null}
                  </div>
                  <h3 className="error-camara-titulo">{errorCamara.mensaje}</h3>
                  <p className="error-camara-descripcion">{errorCamara.descripcion}</p>

                  {/* Instrucciones para permiso bloqueado */}
                  {errorCamara.tipo === 'permiso_bloqueado' && (
                    <div className="error-camara-instrucciones">
                      <p className="instrucciones-titulo">Para habilitar la cámara:</p>
                      <div className="instrucciones-pasos">
                        <div className="paso">
                          <span className="paso-numero">1</span>
                          <span>Haz clic en el ícono 🔒 en la barra de direcciones</span>
                        </div>
                        <div className="paso">
                          <span className="paso-numero">2</span>
                          <span>Busca "Cámara" y selecciona "Permitir"</span>
                        </div>
                        <div className="paso">
                          <span className="paso-numero">3</span>
                          <span>Recarga la página</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="error-camara-acciones">
                    {errorCamara.tipo === 'permiso_denegado' && (
                      <button
                        className="btn-solicitar-permiso"
                        onClick={solicitarPermisoCamara}
                      >
                        📷 Permitir acceso a la cámara
                      </button>
                    )}

                    {errorCamara.tipo === 'permiso_bloqueado' && (
                      <button
                        className="btn-reintentar-camara"
                        onClick={() => window.location.reload()}
                      >
                        🔄 Recargar página
                      </button>
                    )}

                    {(errorCamara.tipo === 'camara_en_uso' || errorCamara.tipo === 'desconocido') && (
                      <button
                        className="btn-reintentar-camara"
                        onClick={() => {
                          setErrorCamara(null);
                          setModo("manual");
                          setTimeout(() => setModo("codigo"), 100);
                        }}
                      >
                        🔄 Reintentar
                      </button>
                    )}

                    <button
                      className="btn-modo-manual"
                      onClick={() => {
                        setErrorCamara(null);
                        setModo("manual");
                      }}
                    >
                      ✏️ Ingresar código manualmente
                    </button>
                  </div>
                </div>
              ) : (
              <>
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
                {!isScanning && !error && !buscandoProducto && !errorCamara && (
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
              </>
              )}
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
                        const punto = puntosReciclaje.find(p => String(p.id) === e.target.value);
                        setPuntoSeleccionado(punto);
                      }}
                    >
                      <option value="">– Selecciona un punto –</option>
                      {puntosReciclaje.map(punto => {
                        const puntoTipo = punto.tipo || 'Sin especificar';
                        const esCompatible = punto.tipo && tipo && punto.tipo.toLowerCase() === tipo.toLowerCase();
                        const distanciaTexto = punto.distancia ? ` (${formatDistancia(punto.distancia)})` : '';
                        const tipoIndicador = esCompatible ? '✅' : '⚠️';

                        return (
                          <option key={String(punto.id)} value={String(punto.id)}>
                            {tipoIndicador} {String(punto.nombre)} - {puntoTipo}{distanciaTexto}
                          </option>
                        );
                      })}
                    </select>

                    {puntoSeleccionado && puntoSeleccionado.tipo && tipo && puntoSeleccionado.tipo.toLowerCase() !== tipo.toLowerCase() && (
                      <div className="warning-compatibilidad">
                        ⚠️ <strong>Advertencia:</strong> Este punto acepta <strong>{puntoSeleccionado.tipo}</strong>,
                        pero seleccionaste <strong>{tipo}</strong>.
                        Verifica que acepten tu material antes de ir.
                      </div>
                    )}

                    {puntoSeleccionado && (
                      <div className="info-punto-seleccionado">
                        <h4>📍 {String(puntoSeleccionado.nombre)}</h4>
                        <p><strong>Tipo:</strong> {String(puntoSeleccionado.tipo)}</p>
                        {puntoSeleccionado.direccion && (
                          <p><strong>Dirección:</strong> {String(puntoSeleccionado.direccion)}</p>
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

              {(producto || (modo === "manual" && tipo && pesoEstimado)) && puntoSeleccionado && (
                <button className="btn green" onClick={guardarReciclaje}>
                  ♻️ Guardar Reciclaje
                </button>
              )}
            </div>
              </>
            )}
          </div>
        </div>
      </div>

      {mostrarFormPunto && (
        <div className="modal-overlay" onClick={() => setMostrarFormPunto(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setMostrarFormPunto(false)}
              type="button"
            >
              ✕
            </button>

            <h3>Agregar Punto de Reciclaje</h3>

            <form onSubmit={e => { e.preventDefault(); crearPuntoReciclaje(); }}>
              <div className="form-row form-row-split">
                <div className="form-field">
                  <label>
                    Nombre del Punto <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    value={nuevoPunto.nombre}
                    onChange={e => setNuevoPunto({...nuevoPunto, nombre: e.target.value})}
                    placeholder="Ej: Centro de Reciclaje Municipal"
                    required
                  />
                </div>

                <div className="form-field">
                  <label>
                    Dirección <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    value={nuevoPunto.direccion}
                    onChange={e => setNuevoPunto({...nuevoPunto, direccion: e.target.value})}
                    placeholder="Ej: Río Paraná E Islas Malvinas, X5151 La Calera, Córdoba"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <label>
                  Tipos de Materiales <span className="required">*</span>
                  <div className="material-types-grid">
                    {['Plástico', 'Vidrio', 'Cartón', 'Papel', 'Metal', 'Electrónicos', 'Orgánico', 'Textil'].map(material => {
                      const emojis = {
                        'Plástico': '🧴',
                        'Vidrio': '🍾',
                        'Cartón': '📦',
                        'Papel': '📄',
                        'Metal': '🥫',
                        'Electrónicos': '💻',
                        'Orgánico': '🌿',
                        'Textil': '👕'
                      };

                      return (
                        <div
                          key={material}
                          className={`material-type-option ${nuevoPunto.tipo === material ? 'selected' : ''}`}
                          onClick={() => setNuevoPunto({...nuevoPunto, tipo: material})}
                        >
                          <span className="material-icon">{emojis[material]}</span>
                          <span className="material-label">{material}</span>
                        </div>
                      );
                    })}
                  </div>
                </label>
              </div>

              <div className="form-row">
                <label>
                  Horarios <span className="optional">(opcional)</span>
                  <input
                    type="text"
                    value={nuevoPunto.horarios || ''}
                    onChange={e => setNuevoPunto({...nuevoPunto, horarios: e.target.value})}
                    placeholder="Ej: Lun-Vie 8:00-17:00"
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Observaciones <span className="optional">(opcional)</span>
                  <textarea
                    value={nuevoPunto.observaciones || ''}
                    onChange={e => setNuevoPunto({...nuevoPunto, observaciones: e.target.value})}
                    placeholder="Información adicional, requisitos especiales, etc."
                    rows="3"
                    maxLength="200"
                  />
                  <span className="char-count">{(nuevoPunto.observaciones || '').length}/200</span>
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="submit"
                  className="btn green"
                  disabled={creandoPunto || !nuevoPunto.nombre || !nuevoPunto.direccion || !nuevoPunto.tipo}
                >
                  {creandoPunto ? "Creando..." : "✅ Crear Punto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mostrarModalExito && (
        <div className="modal-overlay" onClick={() => setMostrarModalExito(false)}>
          <div className="modal-exito" onClick={e => e.stopPropagation()}>
            <div className="modal-exito-header">
              <div className="success-icon">✓</div>
              <h3>Reciclaje Registrado</h3>
            </div>

            <div className="modal-exito-content">
              <p className="success-message">Tu reciclaje se registró correctamente</p>

              {datosExito.puntos > 0 && (
                <div className="exito-stat puntos">
                  <div className="stat-icon">🏆</div>
                  <div className="stat-info">
                    <div className="stat-label">Ganaste</div>
                    <div className="stat-value">{datosExito.puntos} puntos</div>
                  </div>
                </div>
              )}

              {datosExito.distancia > 0 && (
                <div className="exito-stat distancia">
                  <div className="stat-icon">📍</div>
                  <div className="stat-info">
                    <div className="stat-label">Distancia</div>
                    <div className="stat-value">{datosExito.distancia.toFixed(1)} km</div>
                  </div>
                </div>
              )}

              {datosExito.advertencia && (
                <div className="exito-advertencia">
                  <span className="advertencia-icon">⚠️</span>
                  <span>Recuerda verificar que acepten tu material</span>
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
                <p className="ayuda-titulo">💡 <strong>Tips para Argentina:</strong></p>
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
                <p>Ahora puedes continuar y guardar el reciclaje</p>
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
