const { db } = require('../config/firebase');

async function getValidaciones(req, res) {
  try {
    const snap = await db.collection('validaciones').get();
    const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(lista);
  } catch {
    res.status(500).json({ error: 'Error al leer validaciones' });
  }
}

async function createValidacion(req, res) {
  try {
    const data = req.body;
    const ref = await db.collection('validaciones').add(data);
    res.status(201).json({ id: ref.id, ...data });
  } catch {
    res.status(500).json({ error: 'Error al crear validación' });
  }
}

module.exports = { getValidaciones, createValidacion };
