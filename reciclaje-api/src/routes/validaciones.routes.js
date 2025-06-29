const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  getValidaciones,
  createValidacion
} = require('../controllers/validaciones.controller');
const validate = require('../middlewares/validation');
const verifyToken = require('../middlewares/auth');

// Listar validaciones
router.get('/', verifyToken, getValidaciones);

// Crear validación
router.post(
  '/',
  verifyToken,
  body('reciclajeId')
    .notEmpty().withMessage('El ID de reciclaje es obligatorio'),
  body('comentario')
    .trim()
    .notEmpty().withMessage('El comentario es obligatorio'),
  validate,
  createValidacion
);

module.exports = router;
