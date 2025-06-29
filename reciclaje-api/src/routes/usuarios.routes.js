const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const { getUsers, createUser } = require('../controllers/usuarios.controller');
const validate   = require('../middlewares/validation');
const verifyToken = require('../middlewares/auth');   // <— ¡IMPORTAR AQUÍ!

// GET /api/usuarios
router.get('/', getUsers);

// POST /api/usuarios con validaciones
router.post(
  '/',
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre es obligatorio'),
  body('email')
    .isEmail().withMessage('El email debe ser válido'),
  validate,
  createUser
);

// GET /api/usuarios/me
router.get('/me', verifyToken, (req, res) => {
  res.json({ uid: req.user.uid, email: req.user.email });
});

module.exports = router;


