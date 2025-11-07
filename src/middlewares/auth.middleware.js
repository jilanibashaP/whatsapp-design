const { verifyToken } = require('../utils/token');

module.exports = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Missing authorization header' });

  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'Invalid authorization header' });

  const token = parts[1];
  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
