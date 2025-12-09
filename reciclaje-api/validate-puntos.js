const { db } = require('./src/config/firebase');

async function validatePuntos() {
  try {
    console.log('Validando puntos de reciclaje en la base de datos...');
    
    const snapshot = await db.collection('puntos').get();
    
    console.log(`Total de documentos encontrados: ${snapshot.size}`);
    
    if (snapshot.empty) {
      console.log('No se encontraron puntos.');
      return;
    }

    console.log('\nListado de Puntos (ID - Nombre):');
    console.log('-----------------------------------');
    
    const puntos = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      // Verificamos si el ID del documento coincide con el ID en la data (si existe campo id)
      const dataId = data.id || 'N/A';
      puntos.push({ docId: doc.id, dataId, nombre: data.nombre });
    });

    // Ordenar por ID para facilitar la lectura
    puntos.sort((a, b) => a.docId.localeCompare(b.docId));

    puntos.forEach(p => {
      const match = p.docId === p.dataId ? 'OK' : 'MISMATCH';
      console.log(`[${match}] ${p.docId.padEnd(30)} | ${p.nombre}`);
    });

    console.log('-----------------------------------');
    console.log(`Total validados: ${puntos.length}`);
    process.exit(0);
  } catch (error) {
    console.error('Error al validar puntos:', error);
    process.exit(1);
  }
}

validatePuntos();



