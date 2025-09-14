const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/auth');
const { 
  getPuntos, 
  createPunto, 
  validarPunto, 
  invalidarPunto, 
  reactivarPunto 
} = require('../controllers/puntos.controller');

// GET /api/puntos/publicos — versión pública sin autenticación para la página de login
router.get('/publicos', getPuntos);

// GET /api/puntos — devuelve todos los puntos ordenados por distancia
// Parámetros opcionales: tipo, lat, lng, radio, incluirInactivos
router.get('/', verifyToken, getPuntos);

// POST /api/puntos — crea un nuevo punto verde
router.post('/', verifyToken, createPunto);

// PUT /api/puntos/:puntoId/validar — valida un punto (thumbs up)
router.put('/:puntoId/validar', verifyToken, validarPunto);

// PUT /api/puntos/:puntoId/invalidar — invalida un punto (thumbs down)
router.put('/:puntoId/invalidar', verifyToken, invalidarPunto);

// PUT /api/puntos/:puntoId/reactivar — reactiva un punto inactivo
router.put('/:puntoId/reactivar', verifyToken, reactivarPunto);

module.exports = router;
