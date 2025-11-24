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

async function updateUserType(req, res) {
  try {
    const { uid } = req.user;
    const { tipo } = req.body;

    if (!tipo || (tipo !== "usuario" && tipo !== "comercio")) {
      return res.status(400).json({ error: "Tipo de usuario inválido" });
    }

    const snap = await db.collection("usuarios").where("uid", "==", uid).get();

    if (snap.empty) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const userDoc = snap.docs[0];
    await userDoc.ref.update({ tipo });

    res.json({ message: "Tipo de usuario actualizado", tipo });
  } catch (error) {
    console.error("Error actualizando tipo de usuario:", error);
    res.status(500).json({ error: "Error al actualizar tipo de usuario" });
  }
}

async function updateUser(req, res) {
  try {
    const { uid } = req.user;
    const { nombre } = req.body;

    const snap = await db.collection("usuarios").where("uid", "==", uid).get();

    if (snap.empty) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const userDoc = snap.docs[0];
    const userData = userDoc.data();

    // Actualizar nombre del usuario
    await userDoc.ref.update({ nombre });

    // Si es comercio, actualizar también los puntos de reciclaje asociados
    if (userData.tipo === 'comercio') {
      const puntosSnap = await db.collection('puntos')
        .where('creadoPor', '==', uid)
        .where('esComercio', '==', true)
        .get();

      const batch = db.batch();
      puntosSnap.docs.forEach(doc => {
        const puntoData = doc.data();
        const tipoMaterial = puntoData.tipo;
        batch.update(doc.ref, {
          nombre: `${nombre} - ${tipoMaterial}`
        });
      });
      await batch.commit();
    }

    res.json({ message: "Usuario actualizado correctamente", nombre });
  } catch (error) {
    console.error("Error actualizando usuario:", error);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
}

module.exports = { getUsers, createUser, getUserByUid, updateUserType, updateUser };
