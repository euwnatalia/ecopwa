const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const { getProductos, createProducto } = require('../controllers/productos.controller');
const validate = require('../middlewares/validation');

router.get('/', getProductos);

router.post(
  '/',
  body('codigo')
    .notEmpty().withMessage('El código es obligatorio'),
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre del producto es obligatorio'),
  body('tipo')
    .notEmpty().withMessage('El tipo de material es obligatorio'),
  body('pesoEstimado')
    .isNumeric().withMessage('El peso estimado debe ser un número')
    .isFloat({ min: 0 }).withMessage('El peso estimado debe ser mayor a 0'),
  validate,
  createProducto
);

module.exports = router;

