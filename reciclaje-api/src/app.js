const express = require('express');
const cors = require('cors');

require('dotenv').config();
require('./config/firebase'); // carga Firebase

const app = express();
// CORS completamente deshabilitado - permite cualquier origen
app.use(cors());

app.use(express.json());

app.get('/', (req, res) => res.send('🚀 ¡Backend corriendo!'));

// Monta todas las rutas
app.use('/api/usuarios',     require('./routes/usuarios.routes'));
app.use('/api/productos',    require('./routes/productos.routes'));
app.use('/api/reciclajes',   require('./routes/reciclajes.routes'));
app.use('/api/puntos',       require('./routes/puntos.routes'));
app.use('/api/validaciones', require('./routes/validaciones.routes'));

// Función para crear puntos de prueba (solo para desarrollo)
const crearPuntosPrueba = async () => {
  const { db } = require('./config/firebase');
  
  try {
    // Limpiar puntos existentes solo en desarrollo
    console.log('🧹 Limpiando puntos existentes...');
    const existingSnap = await db.collection('puntos').get();
    const deletePromises = existingSnap.docs.map(doc => doc.ref.delete());
    await Promise.all(deletePromises);
    console.log(`🗑️ Eliminados ${existingSnap.docs.length} puntos existentes`);

    // Puntos de prueba en Córdoba Capital (-31.4173, -64.1833)
    const puntosPrueba = [
      {
        nombre: "Centro de Reciclaje Municipal - Nueva Córdoba",
        direccion: "Av. Poeta Lugones 50, Nueva Córdoba",
        tipo: "Plástico",
        lat: -31.4200,
        lng: -64.1900,
        activo: true,
        validaciones: 5,
        invalidaciones: 0,
        validadoPor: [],
        invalidadoPor: []
      },
      {
        nombre: "Punto Verde - Barrio Centro",
        direccion: "27 de Abril 275, Centro",
        tipo: "Vidrio", 
        lat: -31.4173,
        lng: -64.1833,
        activo: true,
        validaciones: 3,
        invalidaciones: 1,
        validadoPor: [],
        invalidadoPor: []
      },
      {
        nombre: "Recicladora del Sur",
        direccion: "Av. Rafael Núñez 4000, Cerro de las Rosas",
        tipo: "Cartón",
        lat: -31.3550147,  // Ubicación exacta del usuario
        lng: -64.3703637,   // Ubicación exacta del usuario
        activo: true,
        validaciones: 0,
        invalidaciones: 0,
        validadoPor: [],
        invalidadoPor: []
      },
      {
        nombre: "EcoPunto Güemes",
        direccion: "Pasaje Revol 150, Güemes",
        tipo: "Papel",
        lat: -31.4100,
        lng: -64.1950,
        activo: true,
        validaciones: 2,
        invalidaciones: 0,
        validadoPor: [],
        invalidadoPor: []
      },
      {
        nombre: "Centro de Acopio MetalCor",
        direccion: "Bv. San Juan 1500, San Vicente",
        tipo: "Metal",
        lat: -31.4050,
        lng: -64.1700,
        activo: true,
        validaciones: 7,
        invalidaciones: 1,
        validadoPor: [],
        invalidadoPor: []
      },
      // Puntos adicionales cerca de la ubicación del usuario (-31.3550147, -64.3703637)
      {
        nombre: "EcoPunto Cerro - Plásticos",
        direccion: "Cerca de tu ubicación",
        tipo: "Plástico", 
        lat: -31.3560,  // 1km de distancia
        lng: -64.3710,
        activo: true,
        validaciones: 1,
        invalidaciones: 0,
        validadoPor: [],
        invalidadoPor: []
      },
      {
        nombre: "Centro Verde Local - Vidrio",
        direccion: "A 5km de tu ubicación",
        tipo: "Vidrio",
        lat: -31.3600,  // ~5km de distancia
        lng: -64.3650,
        activo: true,
        validaciones: 0,
        invalidaciones: 2,
        validadoPor: [],
        invalidadoPor: []
      },
      {
        nombre: "Reciclaje Municipal - Papel",
        direccion: "A 25km de tu ubicación", 
        tipo: "Papel",
        lat: -31.3300,  // ~25km de distancia
        lng: -64.3500,
        activo: false,  // Punto inactivo para pruebas
        validaciones: 1,
        invalidaciones: 4,
        validadoPor: [],
        invalidadoPor: [],
        motivoInactivo: 'Múltiples reportes de invalidez'
      }
    ];

    console.log('🔄 Creando puntos de prueba...');
    
    for (let punto of puntosPrueba) {
      await db.collection('puntos').add(punto);
      console.log(`✅ Creado: ${punto.nombre} (${punto.tipo})`);
    }
    
    console.log('🎉 Puntos de prueba creados exitosamente!');
    
  } catch (error) {
    console.error('❌ Error creando puntos de prueba:', error);
  }
};

const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
  console.log(`Server escuchando en puerto ${PORT}`);
  
  // Crear puntos de prueba solo en desarrollo
  if (process.env.NODE_ENV !== 'production') {
    await crearPuntosPrueba();
  }
});
