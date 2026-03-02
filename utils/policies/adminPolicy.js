module.exports = {
  canAccess(user) {
    if (!user) return false;
    if (!user.is_active) return false;
    return user.role === 'admin';
  },
};