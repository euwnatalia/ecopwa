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

async function createUser(req, res) {
  try {
    const data = req.body;
    const ref = await db.collection('usuarios').add(data);
    res.status(201).json({ id: ref.id, ...data });
  } catch {
    res.status(500).json({ error: 'Error al crear usuario' });
  }
}

module.exports = { getUsers, createUser };
