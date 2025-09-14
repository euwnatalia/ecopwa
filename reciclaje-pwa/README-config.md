# Configuración de URL de la API

## Para desarrollo local
La aplicación está configurada por defecto para funcionar con `http://localhost:4000`

## Para producción (dondereciclo.com.ar)

### 1. Variables de entorno
Crea un archivo `.env` en la carpeta `reciclaje-pwa/` con:
```bash
# Configuración para dondereciclo.com.ar
VITE_API_URL=https://dondereciclo.com.ar
```

O para desarrollo con otro dominio:
```bash
VITE_API_URL=https://tu-dominio.com
```

### 2. Compilar para producción
```bash
npm run build
```

El Service Worker se generará automáticamente con la URL correcta durante el build.

### 3. Configuración del backend
El backend ya está configurado para permitir requests desde:
- `https://dondereciclo.com.ar`
- `https://www.dondereciclo.com.ar`
- `http://localhost:5174` (desarrollo)

## Scripts disponibles

- `npm run dev` - Inicia el servidor de desarrollo (genera SW automáticamente)
- `npm run build` - Compila para producción (genera SW automáticamente)
- `npm run build-sw` - Solo genera el Service Worker con la configuración actual

## Ejemplo de uso para dondereciclo.com.ar

```bash
# 1. Configurar la variable de entorno
echo "VITE_API_URL=https://dondereciclo.com.ar" > .env

# 2. Compilar para producción
npm run build

# 3. Los archivos en dist/ están listos para subir al servidor
```