import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const isProduction = mode === 'production';
  
  // Configuración base común
  const baseConfig = {
    plugins: [react()],
    
    // Base URL para diferentes entornos
    base: '/',
    
    build: {
      target: 'es2015',
      sourcemap: false,
      outDir: 'dist',
      assetsDir: 'assets',
      minify: isProduction ? 'terser' : false,
      cssMinify: isProduction,
      reportCompressedSize: false,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore']
          },
          entryFileNames: 'assets/[name].[hash].js',
          chunkFileNames: 'assets/[name].[hash].js',
          assetFileNames: 'assets/[name].[hash].[ext]'
        }
      }
    },
    
    server: {
      port: 5174,
      host: true,
      open: false,
      cors: true,
      // Hosts permitidos para desarrollo y producción
      allowedHosts: [
        'localhost',
        '127.0.0.1',
        'dondereciclo.com.ar',
        'www.dondereciclo.com.ar',
        '.dondereciclo.com.ar'  // Permite subdominios
      ],
      // Configuración para desarrollo con dondereciclo.com.ar
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
        'Cross-Origin-Embedder-Policy': 'unsafe-none'
      },
      // Configuración HMR para Windows
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        port: 5174,
        clientPort: 5174
      }
    },
    
    preview: {
      port: 5174,
      host: true,
      cors: true,
      // Hosts permitidos para preview
      allowedHosts: [
        'localhost',
        '127.0.0.1', 
        'dondereciclo.com.ar',
        'www.dondereciclo.com.ar',
        '.dondereciclo.com.ar'
      ]
    },
    
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
      __API_URL__: JSON.stringify(process.env.VITE_API_URL || 'http://localhost:4000')
    }
  };

  return baseConfig;
})
