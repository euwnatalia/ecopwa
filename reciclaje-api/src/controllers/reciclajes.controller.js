const { db } = require('../config/firebase');

// Función para calcular puntos según distancia y tipo de material
function calcularPuntos(distancia, tipo, cantidad) {
  // Puntos base por tipo de material (por kg)
  const puntosBase = {
    'Plástico': 10,
    'Vidrio': 8,
    'Cartón': 6,
    'Papel': 5,
    'Metal': 15
  };
  
  const basePoints = puntosBase[tipo] || 5;
  
  // Multiplicador por distancia - más puntos si está más cerca
  let multiplicadorDistancia;
  if (distancia <= 2) {
    multiplicadorDistancia = 2.0;      // Muy cerca (≤2km): doble puntos
  } else if (distancia <= 10) {
    multiplicadorDistancia = 1.5;      // Cerca (≤10km): 50% más puntos  
  } else if (distancia <= 30) {
    multiplicadorDistancia = 1.2;      // Distancia media (≤30km): 20% más puntos
  } else if (distancia <= 60) {
    multiplicadorDistancia = 1.0;      // Distancia normal (≤60km): puntos base
  } else {
    multiplicadorDistancia = 0.8;      // Lejos (>60km): 80% de puntos
  }
  
  return Math.floor(basePoints * cantidad * multiplicadorDistancia);
}

async function getReciclajes(req, res) {
  try {
    const { userId } = req.query;
    
    let query = db.collection('reciclajes');
    
    // Si se especifica userId, filtrar por usuario
    if (userId) {
      query = query.where('userId', '==', userId);
    }
    
    const snap = await query.get();
    const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(lista);
  } catch (error) {
    console.error('Error en getReciclajes:', error);
    res.status(500).json({ error: 'Error al leer reciclajes' });
  }
}

async function createReciclaje(req, res) {
  try {
    const { codigo, tipo, cantidad, puntoReciclaje, userLat, userLng } = req.body;
    const userId = req.user?.uid; // Viene del middleware de auth
    
    if (!tipo || !cantidad || !puntoReciclaje) {
      return res.status(400).json({ 
        error: 'Tipo, cantidad y punto de reciclaje son obligatorios' 
      });
    }
    
    // Buscar el punto de reciclaje para obtener sus coordenadas
    const puntoDoc = await db.collection('puntos').doc(puntoReciclaje.id).get();
    if (!puntoDoc.exists) {
      return res.status(400).json({ error: 'Punto de reciclaje no válido' });
    }
    
    const punto = puntoDoc.data();
    
    // Calcular distancia y puntos
    let distancia = 0;
    let puntosObtenidos = 0;
    
    if (userLat && userLng) {
      // Usar la misma función que en puntos.controller.js
      const R = 6371; // Radio de la Tierra en km
      const dLat = (punto.lat - userLat) * Math.PI / 180;
      const dLng = (punto.lng - userLng) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(userLat * Math.PI / 180) * Math.cos(punto.lat * Math.PI / 180) * 
        Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      distancia = R * c;
      
      puntosObtenidos = calcularPuntos(distancia, tipo, cantidad);
    }
    
    const reciclaje = {
      codigo: codigo || null,
      tipo,
      cantidad: parseFloat(cantidad),
      puntoReciclaje: {
        id: puntoReciclaje.id,
        nombre: punto.nombre,
        lat: punto.lat,
        lng: punto.lng
      },
      distancia: distancia,
      puntosObtenidos,
      userId,
      fechaCreacion: new Date().toISOString(),
      userLocation: userLat && userLng ? { lat: userLat, lng: userLng } : null
    };
    
    const ref = await db.collection('reciclajes').add(reciclaje);
    
    res.status(201).json({ id: ref.id, ...reciclaje });
  } catch (error) {
    console.error('Error en createReciclaje:', error);
    res.status(500).json({ error: 'Error al crear reciclaje' });
  }
}

// Obtener historial de reciclajes del usuario
async function getHistorialUsuario(req, res) {
  try {
    const userId = req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    console.log('📈 Obteniendo historial para usuario:', userId);

    // Obtener todos los reciclajes del usuario
    const reciclajes = await db.collection('reciclajes')
      .where('userId', '==', userId)
      .get();

    console.log(`📄 Encontrados ${reciclajes.docs.length} reciclajes en Firestore`);

    const listaReciclajes = reciclajes.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Normalizar el campo de fecha
        fechaCreacion: data.fechaCreacion || data.fecha || new Date().toISOString()
      };
    })
    .sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion)); // Ordenar por fecha desc

    console.log(`✅ Procesados ${listaReciclajes.length} reciclajes`);

    // Calcular estadísticas
    const estadisticas = calcularEstadisticas(listaReciclajes);
    console.log('📊 Estadísticas calculadas:', estadisticas);

    // Calcular logros
    const logros = calcularLogros(estadisticas, listaReciclajes);
    console.log(`🏆 Generados ${logros.length} logros`);

    res.json({
      reciclajes: listaReciclajes,
      estadisticas,
      logros,
      total: listaReciclajes.length
    });

  } catch (error) {
    console.error('❌ Error obteniendo historial para usuario:', userId);
    console.error('Detalle del error:', error);
    res.status(500).json({ 
      error: 'Error al obtener historial de reciclajes',
      details: error.message
    });
  }
}

// Función para calcular estadísticas del usuario
function calcularEstadisticas(reciclajes) {
  const stats = {
    totalReciclajes: reciclajes.length,
    pesoTotal: 0,
    puntosTotal: 0,
    tiposReciclados: {},
    puntosVisitados: new Set(),
    primerReciclaje: null,
    ultimoReciclaje: null,
    mejorMes: null,
    rachaActual: 0,
    mejorRacha: 0
  };

  if (reciclajes.length === 0) {
    return stats;
  }

  // Procesar cada reciclaje
  reciclajes.forEach(reciclaje => {
    // Peso total
    stats.pesoTotal += reciclaje.cantidad || 0;
    
    // Puntos total
    stats.puntosTotal += reciclaje.puntosObtenidos || 0;
    
    // Tipos de materiales
    const tipo = reciclaje.tipo;
    if (tipo) {
      stats.tiposReciclados[tipo] = (stats.tiposReciclados[tipo] || 0) + 1;
    }
    
    // Puntos visitados
    if (reciclaje.puntoReciclaje?.nombre) {
      stats.puntosVisitados.add(reciclaje.puntoReciclaje.nombre);
    }
  });

  // Fechas importantes
  const reciclajesOrdenados = [...reciclajes].sort((a, b) => 
    new Date(a.fechaCreacion) - new Date(b.fechaCreacion)
  );
  
  stats.primerReciclaje = reciclajesOrdenados[0]?.fechaCreacion;
  stats.ultimoReciclaje = reciclajesOrdenados[reciclajesOrdenados.length - 1]?.fechaCreacion;

  // Convertir Set a número
  stats.puntosVisitados = stats.puntosVisitados.size;

  // Calcular mejor mes
  const reciclajePorMes = {};
  reciclajes.forEach(reciclaje => {
    const fecha = new Date(reciclaje.fechaCreacion);
    const mesAno = `${fecha.getFullYear()}-${(fecha.getMonth() + 1).toString().padStart(2, '0')}`;
    reciclajePorMes[mesAno] = (reciclajePorMes[mesAno] || 0) + 1;
  });

  let maxReciclajes = 0;
  let mejorMes = null;
  Object.entries(reciclajePorMes).forEach(([mes, cantidad]) => {
    if (cantidad > maxReciclajes) {
      maxReciclajes = cantidad;
      mejorMes = mes;
    }
  });

  stats.mejorMes = { mes: mejorMes, cantidad: maxReciclajes };

  // Calcular rachas
  stats.rachaActual = calcularRachaActual(reciclajesOrdenados);
  stats.mejorRacha = calcularMejorRacha(reciclajesOrdenados);

  return stats;
}

// Función para calcular logros basados en estadísticas
function calcularLogros(stats, reciclajes) {
  const logros = [];

  // Logros por cantidad de reciclajes
  if (stats.totalReciclajes >= 1) {
    logros.push({
      id: 'primer_reciclaje',
      titulo: '🌱 Primer Paso',
      descripcion: 'Realizaste tu primer reciclaje',
      categoria: 'cantidad',
      desbloqueado: true,
      fecha: stats.primerReciclaje
    });
  }

  if (stats.totalReciclajes >= 5) {
    logros.push({
      id: 'eco_novato',
      titulo: '♻️ Eco Novato',
      descripcion: 'Completaste 5 reciclajes',
      categoria: 'cantidad',
      desbloqueado: true
    });
  }

  if (stats.totalReciclajes >= 10) {
    logros.push({
      id: 'eco_ninja',
      titulo: '🥷 Eco Ninja',
      descripcion: 'Completaste 10 reciclajes',
      categoria: 'cantidad',
      desbloqueado: true
    });
  }

  if (stats.totalReciclajes >= 25) {
    logros.push({
      id: 'eco_master',
      titulo: '🏆 Eco Master',
      descripcion: 'Completaste 25 reciclajes',
      categoria: 'cantidad',
      desbloqueado: true
    });
  }

  if (stats.totalReciclajes >= 50) {
    logros.push({
      id: 'eco_legend',
      titulo: '🌟 Eco Legend',
      descripcion: 'Completaste 50 reciclajes',
      categoria: 'cantidad',
      desbloqueado: true
    });
  }

  // Logros por peso
  if (stats.pesoTotal >= 10) {
    logros.push({
      id: 'peso_10kg',
      titulo: '⚖️ 10kg Reciclados',
      descripcion: 'Reciclaste 10kg de materiales',
      categoria: 'peso',
      desbloqueado: true
    });
  }

  if (stats.pesoTotal >= 50) {
    logros.push({
      id: 'peso_50kg',
      titulo: '💪 50kg Reciclados',
      descripcion: 'Reciclaste 50kg de materiales',
      categoria: 'peso',
      desbloqueado: true
    });
  }

  if (stats.pesoTotal >= 100) {
    logros.push({
      id: 'peso_100kg',
      titulo: '🏋️ 100kg Reciclados',
      descripcion: 'Reciclaste 100kg de materiales',
      categoria: 'peso',
      desbloqueado: true
    });
  }

  // Logros por diversidad de materiales
  const tiposUnicos = Object.keys(stats.tiposReciclados).length;
  if (tiposUnicos >= 3) {
    logros.push({
      id: 'diversidad_3',
      titulo: '🎨 Diversidad Eco',
      descripcion: 'Reciclaste 3 tipos diferentes de materiales',
      categoria: 'diversidad',
      desbloqueado: true
    });
  }

  if (tiposUnicos >= 5) {
    logros.push({
      id: 'diversidad_5',
      titulo: '🌈 Arcoíris Eco',
      descripcion: 'Reciclaste todos los tipos de materiales',
      categoria: 'diversidad',
      desbloqueado: true
    });
  }

  // Logros por puntos visitados
  if (stats.puntosVisitados >= 3) {
    logros.push({
      id: 'explorador',
      titulo: '🗺️ Explorador Verde',
      descripcion: 'Visitaste 3 puntos de reciclaje diferentes',
      categoria: 'explorador',
      desbloqueado: true
    });
  }

  if (stats.puntosVisitados >= 5) {
    logros.push({
      id: 'viajero',
      titulo: '🧭 Viajero Eco',
      descripcion: 'Visitaste 5 puntos de reciclaje diferentes',
      categoria: 'explorador',
      desbloqueado: true
    });
  }

  // Logros por puntos
  if (stats.puntosTotal >= 100) {
    logros.push({
      id: 'puntos_100',
      titulo: '💎 100 Puntos',
      descripcion: 'Acumulaste 100 puntos',
      categoria: 'puntos',
      desbloqueado: true
    });
  }

  if (stats.puntosTotal >= 500) {
    logros.push({
      id: 'puntos_500',
      titulo: '💰 500 Puntos',
      descripcion: 'Acumulaste 500 puntos',
      categoria: 'puntos',
      desbloqueado: true
    });
  }

  if (stats.puntosTotal >= 1000) {
    logros.push({
      id: 'puntos_1000',
      titulo: '👑 1000 Puntos',
      descripcion: 'Acumulaste 1000 puntos',
      categoria: 'puntos',
      desbloqueado: true
    });
  }

  // Logros especiales
  if (stats.mejorRacha >= 7) {
    logros.push({
      id: 'racha_semanal',
      titulo: '🔥 Racha Semanal',
      descripcion: 'Reciclaste 7 días seguidos',
      categoria: 'especial',
      desbloqueado: true
    });
  }

  if (stats.mejorMes?.cantidad >= 10) {
    logros.push({
      id: 'mes_productivo',
      titulo: '📅 Mes Productivo',
      descripcion: 'Reciclaste 10 veces en un mes',
      categoria: 'especial',
      desbloqueado: true
    });
  }

  return logros;
}

// Funciones auxiliares para calcular rachas
function calcularRachaActual(reciclajes) {
  if (reciclajes.length === 0) return 0;
  
  // Simplificado: contar reciclajes en días consecutivos desde hoy
  const hoy = new Date();
  let racha = 0;
  
  for (let i = 0; i < 30; i++) { // Revisar últimos 30 días
    const fechaObjetivo = new Date(hoy);
    fechaObjetivo.setDate(hoy.getDate() - i);
    
    const hayReciclaje = reciclajes.some(r => {
      const fechaReciclaje = new Date(r.fechaCreacion);
      return fechaReciclaje.toDateString() === fechaObjetivo.toDateString();
    });
    
    if (hayReciclaje) {
      racha++;
    } else if (racha > 0) {
      break; // Racha rota
    }
  }
  
  return racha;
}

function calcularMejorRacha(reciclajes) {
  if (reciclajes.length === 0) return 0;
  
  // Simplificado: buscar la mayor cantidad de días consecutivos con reciclajes
  const diasConReciclaje = new Set();
  
  reciclajes.forEach(r => {
    const fecha = new Date(r.fechaCreacion);
    diasConReciclaje.add(fecha.toDateString());
  });
  
  const diasOrdenados = Array.from(diasConReciclaje).sort();
  let mejorRacha = 0;
  let rachaActual = 1;
  
  for (let i = 1; i < diasOrdenados.length; i++) {
    const fechaAnterior = new Date(diasOrdenados[i - 1]);
    const fechaActual = new Date(diasOrdenados[i]);
    
    const diffTime = fechaActual - fechaAnterior;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    if (diffDays === 1) {
      rachaActual++;
    } else {
      mejorRacha = Math.max(mejorRacha, rachaActual);
      rachaActual = 1;
    }
  }
  
  return Math.max(mejorRacha, rachaActual);
}

// Función para que comercios reciban reciclajes
async function recibirReciclaje(req, res) {
  try {
    const { codigoUsuario, tipo, cantidad, puntos } = req.body;
    const comercioId = req.user?.uid;
    
    if (!comercioId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (!codigoUsuario || !tipo || !cantidad || !puntos) {
      return res.status(400).json({ 
        error: 'Todos los campos son obligatorios' 
      });
    }

    // Buscar usuario por código (puede ser email o uid)
    let usuarioQuery = db.collection('usuarios').where('email', '==', codigoUsuario);
    let usuarioSnap = await usuarioQuery.get();
    
    if (usuarioSnap.empty) {
      usuarioQuery = db.collection('usuarios').where('uid', '==', codigoUsuario);
      usuarioSnap = await usuarioQuery.get();
    }

    if (usuarioSnap.empty) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuario = usuarioSnap.docs[0].data();
    const userId = usuario.uid;

    // Obtener información del comercio
    const comercioQuery = await db.collection('usuarios').where('uid', '==', comercioId).get();
    if (comercioQuery.empty) {
      return res.status(404).json({ error: 'Comercio no encontrado' });
    }

    const comercio = comercioQuery.docs[0].data();

    // Crear el reciclaje
    const reciclaje = {
      tipo,
      cantidad: parseFloat(cantidad),
      puntosObtenidos: parseInt(puntos), // Cambiado de 'puntos' a 'puntosObtenidos' para consistencia
      userId,
      comercioId,
      usuario: usuario.nombre,
      comercio: comercio.nombre,
      puntoReciclaje: {
        id: comercioId,
        nombre: comercio.nombre || 'Comercio sin nombre',
        tipo: 'comercio'
      },
      fechaCreacion: new Date().toISOString(),
      estado: 'completado',
      metodo: 'comercio'
    };

    const ref = await db.collection('reciclajes').add(reciclaje);
    
    res.status(201).json({
      id: ref.id,
      ...reciclaje,
      puntos: reciclaje.puntosObtenidos, // Para compatibilidad con el frontend
      usuario: usuario.nombre,
      mensaje: 'Reciclaje procesado exitosamente'
    });

  } catch (error) {
    console.error('Error en recibirReciclaje:', error);
    res.status(500).json({ error: 'Error al procesar el reciclaje' });
  }
}

// Obtener reciclajes procesados por un comercio
async function getReciclajesComercio(req, res) {
  try {
    const comercioId = req.user?.uid;
    
    if (!comercioId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const reciclajes = await db.collection('reciclajes')
      .where('comercioId', '==', comercioId)
      .orderBy('fechaCreacion', 'desc')
      .limit(50)
      .get();

    const lista = reciclajes.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(lista);

  } catch (error) {
    console.error('Error en getReciclajesComercio:', error);
    res.status(500).json({ error: 'Error al obtener reciclajes del comercio' });
  }
}

// Obtener estadísticas específicas para comercios
async function getEstadisticasComercio(req, res) {
  try {
    const comercioId = req.user?.uid;
    
    if (!comercioId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Obtener todos los reciclajes del comercio
    const reciclajes = await db.collection('reciclajes')
      .where('comercioId', '==', comercioId)
      .get();

    const lista = reciclajes.docs.map(doc => doc.data());

    // Calcular estadísticas específicas para comercios
    const stats = {
      totalReciclajes: lista.length,
      pesoTotal: lista.reduce((sum, r) => sum + (r.cantidad || 0), 0),
      puntosOtorgados: lista.reduce((sum, r) => sum + (r.puntosObtenidos || r.puntos || 0), 0),
      usuariosAtendidos: new Set(lista.map(r => r.userId)).size,
      tiposRecibidos: {},
      mejorMes: null,
      impactoAmbiental: {
        co2Ahorrado: 0, // kg de CO2 ahorrado
        energiaAhorrada: 0, // kWh ahorrados
        aguaAhorrada: 0 // litros de agua ahorrados
      }
    };

    // Calcular tipos recibidos
    lista.forEach(reciclaje => {
      const tipo = reciclaje.tipo;
      if (tipo) {
        stats.tiposRecibidos[tipo] = (stats.tiposRecibidos[tipo] || 0) + reciclaje.cantidad;
      }
    });

    // Calcular impacto ambiental (valores aproximados)
    const impactoPorTipo = {
      'Plástico': { co2: 2.0, energia: 5.5, agua: 15 }, // por kg
      'Vidrio': { co2: 0.5, energia: 0.8, agua: 2 },
      'Cartón': { co2: 3.3, energia: 4.2, agua: 25 },
      'Papel': { co2: 1.5, energia: 3.0, agua: 20 },
      'Metal': { co2: 4.5, energia: 8.0, agua: 10 }
    };

    Object.entries(stats.tiposRecibidos).forEach(([tipo, cantidad]) => {
      const impacto = impactoPorTipo[tipo];
      if (impacto) {
        stats.impactoAmbiental.co2Ahorrado += cantidad * impacto.co2;
        stats.impactoAmbiental.energiaAhorrada += cantidad * impacto.energia;
        stats.impactoAmbiental.aguaAhorrada += cantidad * impacto.agua;
      }
    });

    // Calcular mejor mes
    const reciclajesPorMes = {};
    lista.forEach(reciclaje => {
      const fecha = new Date(reciclaje.fechaCreacion);
      const mesAno = `${fecha.getFullYear()}-${(fecha.getMonth() + 1).toString().padStart(2, '0')}`;
      reciclajesPorMes[mesAno] = (reciclajesPorMes[mesAno] || 0) + 1;
    });

    let maxReciclajes = 0;
    let mejorMes = null;
    Object.entries(reciclajesPorMes).forEach(([mes, cantidad]) => {
      if (cantidad > maxReciclajes) {
        maxReciclajes = cantidad;
        mejorMes = mes;
      }
    });

    stats.mejorMes = { mes: mejorMes, cantidad: maxReciclajes };

    // Redondear valores de impacto
    stats.impactoAmbiental.co2Ahorrado = Math.round(stats.impactoAmbiental.co2Ahorrado * 10) / 10;
    stats.impactoAmbiental.energiaAhorrada = Math.round(stats.impactoAmbiental.energiaAhorrada * 10) / 10;
    stats.impactoAmbiental.aguaAhorrada = Math.round(stats.impactoAmbiental.aguaAhorrada);

    res.json({
      estadisticas: stats,
      reciclajes: lista.slice(0, 10), // Últimos 10 para el dashboard
      total: lista.length
    });

  } catch (error) {
    console.error('Error en getEstadisticasComercio:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas del comercio' });
  }
}

module.exports = { 
  getReciclajes,
  createReciclaje, 
  getHistorialUsuario,
  recibirReciclaje,
  getReciclajesComercio,
  getEstadisticasComercio
};
