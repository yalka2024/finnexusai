const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).send('Unauthorized');
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'nexus_secret');
    next();
  } catch (err) {
    return res.status(403).send('Forbidden');
  }
}

module.exports = { authMiddleware };
