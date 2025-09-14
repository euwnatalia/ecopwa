const { db } = require('../config/firebase');

async function getUsers(req, res) {
  try {
    const snap = await db.collection('usuarios').get();
    const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(lista);
  } catch {
    res.status(500).json({ error: 'Error al leer usuarios' });
  }
}

async function getUserByUid(req, res) {
  try {
    const { uid } = req.user;
    const snap = await db.collection('usuarios').where('uid', '==', uid).get();
    
    if (snap.empty) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    const userData = snap.docs[0].data();
    res.json({ id: snap.docs[0].id, ...userData });
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
}

async function createUser(req, res) {
  try {
    const { uid, nombre, email, tipo = 'usuario', ...otherData } = req.body;
    
    const existingUser = await db.collection('usuarios').where('uid', '==', uid).get();
    if (!existingUser.empty) {
      return res.status(409).json({ error: 'Usuario ya existe' });
    }
    
    const userData = {
      uid,
      nombre,
      email,
      tipo,
      fechaCreacion: new Date().toISOString(),
      activo: true,
      ...otherData
    };
    
    if (tipo === 'comercio') {
      userData.puntoReciclaje = {
        tiposReciclaje: otherData.tiposReciclaje || [],
        ubicacion: otherData.ubicacion,
        direccion: otherData.direccion || '',
        telefono: otherData.telefono || '',
        horarios: otherData.horarios || '',
        validado: false
      };

      // Crear punto de reciclaje automáticamente para cada tipo de material
      const tiposReciclaje = otherData.tiposReciclaje || [];
      for (const tipoMaterial of tiposReciclaje) {
        const puntoData = {
          nombre: `${nombre} - ${tipoMaterial}`,
          lat: otherData.ubicacion.lat,
          lng: otherData.ubicacion.lng,
          tipo: tipoMaterial,
          direccion: otherData.direccion || '',
          creadoPor: uid,
          creadoEn: new Date().toISOString(),
          activo: true,
          validaciones: 0,
          invalidaciones: 0,
          validadoPor: [],
          invalidadoPor: [],
          esComercio: true,
          comercioInfo: {
            telefono: otherData.telefono || '',
            horarios: otherData.horarios || ''
          }
        };
        
        await db.collection('puntos').add(puntoData);
      }
    }
    
    const ref = await db.collection('usuarios').add(userData);
    res.status(201).json({ id: ref.id, ...userData });
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
}

module.exports = { getUsers, createUser, getUserByUid };
