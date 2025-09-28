const { db } = require('../config/firebase');

// Función para calcular distancia entre dos coordenadas (fórmula de Haversine)
function calcularDistancia(lat1, lng1, lat2, lng2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distancia = R * c; // Distancia en km
  return distancia;
}

async function getPuntos(req, res) {
  try {
    const { tipo, lat, lng, radio = 100, incluirInactivos = false } = req.query; // radio por defecto 100km
    
    console.log('📍 getPuntos called with params:', { tipo, lat, lng, radio, incluirInactivos });
    
    let query = db.collection('puntos');
    
    const snap = await query.get();
    let lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    console.log(`📊 Found ${lista.length} puntos before filtering`);
    
    // Filtrar por tipo (soporta tanto array como string para compatibilidad)
    if (tipo) {
      lista = lista.filter(punto => {
        // Soporte para puntos con array de tipos (nuevo formato)
        if (Array.isArray(punto.tipos)) {
          return punto.tipos.includes(tipo);
        }
        // Soporte para puntos con tipo único (formato antiguo)
        if (punto.tipo) {
          return punto.tipo === tipo;
        }
        return false;
      });
      console.log(`🔍 After filtering by tipo "${tipo}": ${lista.length} puntos`);
    }
    
    // Filtrar localmente por estado activo si es necesario
    if (!incluirInactivos || incluirInactivos === 'false') {
      lista = lista.filter(punto => punto.activo !== false);
      console.log(`✅ After filtering activos: ${lista.length} puntos`);
    }
    
    // Si hay coordenadas del usuario, calcular distancias y ordenar
    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const maxRadio = parseFloat(radio);
      
      lista = lista.map(punto => ({
        ...punto,
        distancia: calcularDistancia(userLat, userLng, punto.lat, punto.lng)
      }))
      .filter(punto => punto.distancia <= maxRadio) // Solo puntos dentro del radio
      .sort((a, b) => a.distancia - b.distancia); // Ordenar por distancia (más cerca primero)
    }

    // Agregar estadísticas de validación
    lista = lista.map(punto => ({
      ...punto,
      validaciones: punto.validaciones || 0,
      invalidaciones: punto.invalidaciones || 0,
      rating: calcularRating(punto.validaciones || 0, punto.invalidaciones || 0)
    }));
    
    console.log(`🎯 Returning ${lista.length} puntos to client`);
    res.json(lista);
  } catch (error) {
    console.error('Error en getPuntos:', error);
    res.status(500).json({ error: 'Error al leer puntos' });
  }
}

// Función para calcular rating de confiabilidad
function calcularRating(validaciones, invalidaciones) {
  const total = validaciones + invalidaciones;
  if (total === 0) return 'nuevo';
  
  const porcentaje = (validaciones / total) * 100;
  if (porcentaje >= 80) return 'excelente';
  if (porcentaje >= 60) return 'bueno';
  if (porcentaje >= 40) return 'regular';
  return 'malo';
}

async function createPunto(req, res) {
  try {
    const { nombre, lat, lng, tipos, direccion, horarios, observaciones } = req.body;
    
    if (!nombre || !lat || !lng || !tipos || !Array.isArray(tipos) || tipos.length === 0) {
      return res.status(400).json({ error: 'Faltan datos obligatorios: nombre, lat, lng, tipos (debe ser un array con al menos un elemento)' });
    }

    const data = {
      nombre,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      tipos,
      direccion: direccion || '',
      horarios: horarios || '',
      observaciones: observaciones || '',
      creadoPor: req.user?.uid || 'anonimo',
      creadoEn: new Date().toISOString(),
      activo: true,
      validaciones: 0,
      invalidaciones: 0,
      validadoPor: [],
      invalidadoPor: []
    };
    
    const ref = await db.collection('puntos').add(data);
    res.status(201).json({ id: ref.id, ...data });
  } catch (error) {
    console.error('Error en createPunto:', error);
    res.status(500).json({ error: 'Error al crear punto' });
  }
}

// Validar un punto (thumbs up)
async function validarPunto(req, res) {
  try {
    const { puntoId } = req.params;
    const userId = req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const puntoRef = db.collection('puntos').doc(puntoId);
    const puntoDoc = await puntoRef.get();
    
    if (!puntoDoc.exists) {
      return res.status(404).json({ error: 'Punto no encontrado' });
    }
    
    const punto = puntoDoc.data();
    
    // Verificar que el usuario no haya validado ya
    if (punto.validadoPor?.includes(userId)) {
      return res.status(400).json({ error: 'Ya validaste este punto' });
    }
    
    // Si había invalidado antes, remover de invalidaciones
    let invalidadoPor = punto.invalidadoPor || [];
    let invalidaciones = punto.invalidaciones || 0;
    
    if (invalidadoPor.includes(userId)) {
      invalidadoPor = invalidadoPor.filter(id => id !== userId);
      invalidaciones = Math.max(0, invalidaciones - 1);
    }
    
    // Agregar validación
    const validadoPor = [...(punto.validadoPor || []), userId];
    const validaciones = (punto.validaciones || 0) + 1;
    
    await puntoRef.update({
      validaciones,
      invalidaciones,
      validadoPor,
      invalidadoPor
    });
    
    res.json({ 
      message: 'Punto validado correctamente',
      validaciones,
      invalidaciones,
      rating: calcularRating(validaciones, invalidaciones)
    });
  } catch (error) {
    console.error('Error en validarPunto:', error);
    res.status(500).json({ error: 'Error al validar punto' });
  }
}

// Invalidar un punto (thumbs down)
async function invalidarPunto(req, res) {
  try {
    const { puntoId } = req.params;
    const userId = req.user?.uid;
    const { motivo } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const puntoRef = db.collection('puntos').doc(puntoId);
    const puntoDoc = await puntoRef.get();
    
    if (!puntoDoc.exists) {
      return res.status(404).json({ error: 'Punto no encontrado' });
    }
    
    const punto = puntoDoc.data();
    
    // Verificar que el usuario no haya invalidado ya
    if (punto.invalidadoPor?.includes(userId)) {
      return res.status(400).json({ error: 'Ya invalidaste este punto' });
    }
    
    // Si había validado antes, remover de validaciones
    let validadoPor = punto.validadoPor || [];
    let validaciones = punto.validaciones || 0;
    
    if (validadoPor.includes(userId)) {
      validadoPor = validadoPor.filter(id => id !== userId);
      validaciones = Math.max(0, validaciones - 1);
    }
    
    // Agregar invalidación
    const invalidadoPor = [...(punto.invalidadoPor || []), userId];
    const invalidaciones = (punto.invalidaciones || 0) + 1;
    
    // Si muchas invalidaciones, marcar como inactivo
    const updates = {
      invalidaciones,
      validaciones,
      invalidadoPor,
      validadoPor
    };
    
    if (invalidaciones > 2 || (motivo && motivo.toLowerCase().includes("no existe") && invalidaciones > 1)) {
      updates.activo = false;
      updates.motivoInactivo = 'Múltiples reportes de invalidez';
    }
    
    // Registrar el motivo si se proporciona
    if (motivo) {
      updates.ultimoMotivoInvalidacion = motivo;
      updates.motivoReporte = motivo;
      updates.fechaReporte = new Date().toISOString();
      updates.fechaUltimaInvalidacion = new Date().toISOString();
      
      // Guardar historial de reportes
      const reportes = punto.reportes || [];
      reportes.push({
        motivo,
        reportadoPor: userId,
        fecha: new Date().toISOString()
      });
      updates.reportes = reportes;
    }
    
    await puntoRef.update(updates);
    
    res.json({ 
      message: invalidaciones > 2 ?
        'Punto reportado e inactivado por múltiples reportes' :
        'Punto reportado correctamente',
      validaciones,
      invalidaciones,
      activo: updates.activo !== false,
      rating: calcularRating(validaciones, invalidaciones)
    });
  } catch (error) {
    console.error('Error en invalidarPunto:', error);
    res.status(500).json({ error: 'Error al invalidar punto' });
  }
}

// Reactivar un punto (solo para moderadores o el creador)
async function reactivarPunto(req, res) {
  try {
    const { puntoId } = req.params;
    const userId = req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const puntoRef = db.collection('puntos').doc(puntoId);
    const puntoDoc = await puntoRef.get();
    
    if (!puntoDoc.exists) {
      return res.status(404).json({ error: 'Punto no encontrado' });
    }
    
    const punto = puntoDoc.data();
    
    // Solo el creador puede reactivar (en un sistema real habría roles)
    if (punto.creadoPor !== userId) {
      return res.status(403).json({ error: 'Solo el creador puede reactivar este punto' });
    }
    
    await puntoRef.update({
      activo: true,
      motivoInactivo: null,
      fechaReactivacion: new Date().toISOString()
    });
    
    res.json({ message: 'Punto reactivado correctamente' });
  } catch (error) {
    console.error('Error en reactivarPunto:', error);
    res.status(500).json({ error: 'Error al reactivar punto' });
  }
}

module.exports = { 
  getPuntos, 
  createPunto, 
  validarPunto, 
  invalidarPunto, 
  reactivarPunto 
};
