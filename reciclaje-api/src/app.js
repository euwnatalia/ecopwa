const express = require('express');
const cors = require('cors');

require('dotenv').config();
require('./config/firebase');

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [process.env.FRONTEND_URL || 'http://localhost:5173'];

if (process.env.NODE_ENV === 'production' && process.env.FRONTEND_URL && !process.env.FRONTEND_URL.includes('localhost')) {
  if (!process.env.FRONTEND_URL.includes('www.')) {
    const urlWithWww = process.env.FRONTEND_URL.replace('https://', 'https://www.');
    allowedOrigins.push(urlWithWww);
  }
}

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked for origin:', origin);
      console.log('Allowed origins:', allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

app.use(express.json());

app.get('/', (req, res) => res.send('🚀 Backend running!'));

app.use('/api/usuarios',     require('./routes/usuarios.routes'));
app.use('/api/productos',    require('./routes/productos.routes'));
app.use('/api/reciclajes',   require('./routes/reciclajes.routes'));
app.use('/api/puntos',       require('./routes/puntos.routes'));
app.use('/api/validaciones', require('./routes/validaciones.routes'));


const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
  console.log(`Server escuchando en puerto ${PORT}`);
  console.log('🚀 API lista para recibir datos reales desde la aplicación');
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('CORS configured for:', allowedOrigins);
});
