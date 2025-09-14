# Despliegue para dondereciclo.com.ar

## Pasos para subir a producción

### Método 1: Manual
```bash
# 1. Crear archivo .env para producción
echo "VITE_API_URL=https://dondereciclo.com.ar" > .env

# 2. Compilar aplicación
npm run build:prod
```

### Método 2: Script automatizado
```bash
# Compilar directamente para dondereciclo.com.ar
npm run build:dondereciclo
```

### 3. Subir archivos
Los archivos de la carpeta `dist/` deben subirse al servidor web de `dondereciclo.com.ar`

## Configuraciones incluidas

### Frontend (Vite)
- ✅ Configuración de CORS para desarrollo
- ✅ Optimizaciones para producción (minificación, chunks)
- ✅ URLs configurables por entorno
- ✅ Service Worker generado automáticamente

### Backend (API)
- ✅ CORS configurado para `dondereciclo.com.ar`
- ✅ CORS configurado para `www.dondereciclo.com.ar`
- ✅ Rechaza requests de otros dominios

## Scripts disponibles

- `npm run dev` - Desarrollo local
- `npm run build` - Build genérico 
- `npm run build:prod` - Build optimizado para producción
- `npm run build:dondereciclo` - Build específico para dondereciclo.com.ar
- `npm run build-sw` - Regenerar solo Service Worker

## Verificar configuración

Después del build, verificar que:
- `dist/sw.js` contiene la URL correcta de la API
- `dist/assets/` contiene archivos minificados
- Todo funciona con `npm run preview`

¡Listo para producción! 🚀