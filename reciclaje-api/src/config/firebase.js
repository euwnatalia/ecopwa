// src/config/firebase.js
const admin = require('firebase-admin');
require('dotenv').config();

// Si usas JSON key file, carga el servicio así:
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // Si en lugar de Firestore usaras Realtime DB:
  // databaseURL: process.env.FIREBASE_DB_URL
});

const db   = admin.firestore();
const auth = admin.auth();

module.exports = { db, auth };



