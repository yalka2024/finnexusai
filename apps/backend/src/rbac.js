// Simple RBAC middleware
module.exports = function(requiredRole) {
  return function(req, res, next) {
    const user = req.user || {};
    if (!user.role || user.role !== requiredRole) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
};
