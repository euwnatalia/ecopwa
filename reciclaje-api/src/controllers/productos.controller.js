const { db } = require('../config/firebase');

async function getProductos(req, res) {
  try {
    const { codigo } = req.query;
    
    // Si viene código, buscar producto específico
    if (codigo) {
      const snap = await db.collection('productos')
        .where('codigo', '==', codigo)
        .limit(1)
        .get();
      
      if (snap.empty) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }
      
      const producto = { id: snap.docs[0].id, ...snap.docs[0].data() };
      return res.json(producto);
    }
    
    // Si no viene código, devolver todos los productos
    const snap = await db.collection('productos').get();
    const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(lista);
  } catch (error) {
    console.error('Error en getProductos:', error);
    res.status(500).json({ error: 'Error al leer productos' });
  }
}

async function createProducto(req, res) {
  try {
    const data = req.body;
    const ref = await db.collection('productos').add(data);
    res.status(201).json({ id: ref.id, ...data });
  } catch (error) {
    console.error('Error en createProducto:', error);
    res.status(500).json({ error: 'Error al crear producto' });
  }
}

module.exports = { getProductos, createProducto };
