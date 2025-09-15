// Simple audit logging middleware
module.exports = function(req, res, next) {
  // Log user, action, timestamp
  console.log(`[AUDIT] user=${req.user?.username || 'anon'} action=${req.method} ${req.path} time=${new Date().toISOString()}`);
  next();
};
