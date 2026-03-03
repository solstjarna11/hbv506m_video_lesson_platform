module.exports = {
  canView(currentUser, targetUser) {
    if (!currentUser || !targetUser) return false;
    if (!currentUser.is_active) return false;

    // Admin can view anyone
    if (currentUser.role === 'admin') return true;

    // Users can view themselves
    return currentUser.id === targetUser.id;
  },

  canEdit(currentUser, targetUser) {
    if (!currentUser || !targetUser) return false;
    if (!currentUser.is_active) return false;

    // Admin can edit anyone
    if (currentUser.role === 'admin') return true;

    // Users can edit themselves
    return currentUser.id === targetUser.id;
  },

  canList(currentUser) {
    if (!currentUser) return false;
    if (!currentUser.is_active) return false;

    return currentUser.role === 'admin';
  },

  canDeactivate(currentUser, targetUser) {
    if (!currentUser || !targetUser) return false;
    if (!currentUser.is_active) return false;
    if (currentUser.role !== 'admin') return false;
    // Prevent self-deactivation
    if (currentUser.id === targetUser.id) return false;
    return true;
    }
};