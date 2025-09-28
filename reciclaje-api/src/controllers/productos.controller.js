const { db } = require('../config/firebase');

async function getProductos(req, res) {
  try {
    const { codigo } = req.query;

    // Si viene código, buscar producto específico
    if (codigo) {
      // Primero buscar en la base de datos local
      const snap = await db.collection('productos')
        .where('codigo', '==', codigo)
        .limit(1)
        .get();

      if (!snap.empty) {
        // Producto encontrado en base local
        const producto = { id: snap.docs[0].id, ...snap.docs[0].data() };
        console.log('Producto encontrado en base local:', codigo);
        return res.json(producto);
      }

      // Si no está en base local, buscar en API externa
      console.log('Producto no encontrado localmente, buscando en API externa:', codigo);

      try {
        // Usar Open Food Facts API (gratis y sin autenticación)
        const response = await fetch(
          `https://world.openfoodfacts.org/api/v0/product/${codigo}.json`
        );

        if (!response.ok) {
          return res.status(404).json({ error: 'Producto no encontrado en API externa' });
        }

        const apiData = await response.json();

        if (apiData.status === 0) {
          return res.status(404).json({ error: 'Producto no encontrado' });
        }

        // Extraer información relevante del producto
        const product = apiData.product;
        const nuevoProducto = {
          codigo: codigo,
          nombre: product.product_name || product.product_name_es || 'Producto sin nombre',
          marca: product.brands || '',
          tipo: determinarTipoMaterial(product),
          pesoEstimado: obtenerPeso(product),
          imagen: product.image_url || product.image_front_url || null
        };

        // Guardar en base de datos local para futuras consultas
        const docRef = await db.collection('productos').add(nuevoProducto);
        console.log('Producto guardado en base local:', nuevoProducto);

        // Devolver el producto con su ID
        return res.json({ id: docRef.id, ...nuevoProducto });

      } catch (apiError) {
        console.error('Error consultando API externa:', apiError);
        return res.status(404).json({ error: 'Producto no encontrado' });
      }
    }

    // Si no viene código, devolver todos los productos locales
    const snap = await db.collection('productos').get();
    const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(lista);
  } catch (error) {
    console.error('Error en getProductos:', error);
    res.status(500).json({ error: 'Error al leer productos' });
  }
}

// Función auxiliar para determinar el tipo de material basado en el envase
function determinarTipoMaterial(product) {
  const packaging = (product.packaging || '').toLowerCase();
  const packagingTags = product.packaging_tags || [];

  // Buscar palabras clave en el packaging
  if (packaging.includes('plastic') || packaging.includes('plástico') ||
      packagingTags.some(tag => tag.includes('plastic'))) {
    return 'Plástico';
  }
  if (packaging.includes('glass') || packaging.includes('vidrio') ||
      packagingTags.some(tag => tag.includes('glass'))) {
    return 'Vidrio';
  }
  if (packaging.includes('cardboard') || packaging.includes('cartón') ||
      packagingTags.some(tag => tag.includes('cardboard'))) {
    return 'Cartón';
  }
  if (packaging.includes('paper') || packaging.includes('papel') ||
      packagingTags.some(tag => tag.includes('paper'))) {
    return 'Papel';
  }
  if (packaging.includes('metal') || packaging.includes('aluminum') ||
      packaging.includes('aluminio') || packagingTags.some(tag => tag.includes('metal'))) {
    return 'Metal';
  }

  // Si no se puede determinar, usar Plástico por defecto (más común)
  return 'Plástico';
}

// Función auxiliar para obtener el peso estimado
function obtenerPeso(product) {
  // Intentar obtener el peso del envase
  if (product.product_quantity) {
    // Convertir a kg si es necesario
    const quantity = parseFloat(product.product_quantity);
    const unit = product.product_quantity_unit || 'g';

    if (unit === 'kg') return quantity;
    if (unit === 'g') return quantity / 1000;
    if (unit === 'ml' || unit === 'l') {
      // Para líquidos, estimar peso del envase
      return unit === 'l' ? 0.05 : 0.03; // Estimado del envase
    }
  }

  // Peso estimado por defecto para envases comunes
  return 0.05; // 50 gramos
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
