# EcoPWA – Prototipo de Plataforma de Reciclaje

**EcoPWA** es una PWA que fomenta el reciclaje mediante gamificación y geolocalización.  
Este README explica cómo instalar y ejecutar tanto el backend (API) como el frontend (PWA).

---

## 🛠 Prerrequisitos

- **Node.js** v16 LTS o superior  
- **npm** v8 o superior  
- **Git**

---

## 🚀 Clonar el repositorio

```bash
git clone https://github.com/euwnatalia/ecopwa.git
cd ecopwa

📁 Estructura de carpetas
/ecopwa
├─ /reciclaje-api/    ← código fuente del backend (Node.js + Express)
└─ /reciclaje-pwa/    ← código fuente del frontend (React PWA)


⚙️ Backend (reciclaje-api)
Sitúate en la carpeta del backend:
```bash
cd reciclaje-api

Instala dependencias:
```bash
npm install

Arranca el servidor:
```bash
npm start
El API escuchará en http://localhost:5000 (o el puerto configurado).


▶️ Frontend (reciclaje-pwa)

En otra terminal, ve al frontend:
```bash
cd reciclaje-pwa
Instala dependencias:
```bash
npm install

Arranca el servidor:
```bash
npm start
Abre tu navegador en http://localhost:3000. (o el puerto configurado).

🎥 Demo en video
Dentro de la carpeta de Drive encontrarás /video/demo.mp4 (3–5 min) con todo el recorrido: login, registro de reciclaje, mapa, logros y perfil.

