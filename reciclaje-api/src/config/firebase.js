const admin = require('firebase-admin');
require('dotenv').config();

const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db   = admin.firestore();
const auth = admin.auth();

module.exports = { db, auth };