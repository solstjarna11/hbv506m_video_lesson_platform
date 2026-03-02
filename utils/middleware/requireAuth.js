// Middleware to ensure user is authenticated before accessing certain routes.
// requireAuth relies on hydration middleware to populate req.user. If req.user is not set, it redirects to the login page.
module.exports = function requireAuth(req, res, next) {
  if (!req.user) return res.redirect('/auth/login');
  next();
};