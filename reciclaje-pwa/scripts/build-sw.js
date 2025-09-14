import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Obtener la URL de la API desde las variables de entorno
const API_URL = process.env.VITE_API_URL || 'http://localhost:4000';

console.log('🔧 Generando Service Worker con API_URL:', API_URL);

// Leer el template
const templatePath = path.join(__dirname, '../public/sw-template.js');
const outputPath = path.join(__dirname, '../public/sw.js');

try {
  let swContent = fs.readFileSync(templatePath, 'utf8');
  
  // Reemplazar el placeholder con la URL real
  swContent = swContent.replace('__API_BASE_URL__', API_URL);
  
  // Escribir el service worker final
  fs.writeFileSync(outputPath, swContent);
  
  console.log('✅ Service Worker generado exitosamente');
} catch (error) {
  console.error('❌ Error generando Service Worker:', error);
  process.exit(1);
}
