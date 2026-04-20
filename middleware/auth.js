const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

const requireRole = (role) => (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  if (req.session.role !== role) {
    return res.status(403).json({ error: `Forbidden — requires ${role} role` });
  }
  next();
};

module.exports = { requireAuth, requireRole };
