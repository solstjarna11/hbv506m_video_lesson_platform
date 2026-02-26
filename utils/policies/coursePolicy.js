module.exports = {
    canCreate(user) {
        if (!user) return false
        if (!user.is_active) return false
        return user.role === 'instructor' || user.role === 'admin'
    },
    
    canView(user, course) { // Access to a specific course page
        if (!user) return false
        if (!user.is_active) return false
        if (user.role === 'admin') return true 
        if (user.role === 'instructor' && course.created_by_user_id === user.id) return true
        if (!course.is_published) return false
        return user.role === 'student' || user.role === 'instructor'
    },

    canEdit(user, course) {
        if (!user) return false
        if (!user.is_active) return false
        if (user.role === 'admin') return true
        return user.role === 'instructor' && course.created_by_user_id === user.id
    },

    canDelete(user, course) {
        if (!user) return false
        if (!user.is_active) return false
        if (user.role === 'admin') return true
        return user.role === 'instructor' && course.created_by_user_id === user.id
    },

    canPublish(user, course) {
        if (!user) return false
        if (!user.is_active) return false
        if (user.role === 'admin') return true
        return user.role === 'instructor' && course.created_by_user_id === user.id
    },

    canEnroll(user, course, existingEnrollment) {
        if (!user) return false
        if (!user.is_active) return false
        if (user.role === 'admin') return false // NOTICE: Maybe change
        if (!course.is_published) return false
        if (existingEnrollment) return false
        return user.role === 'student' || user.role === 'instructor'
    },

    canUnenroll(user, enrollment) {
        if (!user) return false
        if (!user.is_active) return false
        if (user.role === 'admin') return true
        return enrollment.user_id === user.id
    },
}