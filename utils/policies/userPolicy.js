module.exports = {

    // NOTICE: registration handled by authService, 
    // but might be useful for admin creation?
    canCreate(user) { 
        // TODO
    },
    
    // NOTICE: can guests view profiles? should there 
    // be limited information a guest can see on a profile?
    canView(user, targetUser) {
        // TODO
    },

    canEdit(user, targetUser) {
        // TODO
    },

    canDelete(user, targetUser) {
        // TODO
    },
}