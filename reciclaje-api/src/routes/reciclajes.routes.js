// src/routes/reciclajes.routes.js
const express = require("express");
const { body } = require("express-validator");
const router = express.Router();
const validate = require("../middlewares/validation");
const verifyToken = require("../middlewares/auth");
const { getReciclajes, createReciclaje, getHistorialUsuario } = require("../controllers/reciclajes.controller");

// GET /api/reciclajes — obtener reciclajes
router.get("/", verifyToken, getReciclajes);

// POST /api/reciclajes — crear un nuevo reciclaje
router.post(
  "/",
  verifyToken,
  [
    body("codigo").optional().isString(),
    body("tipo").notEmpty().withMessage("Tipo de material es requerido"),
    body("cantidad")
      .isFloat({ gt: 0 })
      .withMessage("La cantidad debe ser un número mayor a 0"),
    body("puntoReciclaje")
      .notEmpty()
      .withMessage("Punto de reciclaje es requerido")
      .isObject()
      .withMessage("Punto de reciclaje debe ser un objeto"),
    body("puntoReciclaje.id")
      .notEmpty()
      .withMessage("ID del punto de reciclaje es requerido"),
    body("userLat")
      .optional()
      .isFloat()
      .withMessage("Latitud del usuario debe ser un número"),
    body("userLng")
      .optional()
      .isFloat()
      .withMessage("Longitud del usuario debe ser un número"),
  ],
  validate,
  createReciclaje
);

// GET /api/reciclajes/historial — obtener historial del usuario actual  
router.get('/historial', verifyToken, getHistorialUsuario);

module.exports = router;

