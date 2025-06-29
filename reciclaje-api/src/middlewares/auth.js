const { auth } = require('../config/firebase');

async function verifyToken(req, res, next) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer (.+)$/);
  if (!match) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = await auth.verifyIdToken(match[1]);
    req.user = { uid: decoded.uid, email: decoded.email };
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

module.exports = verifyToken;
