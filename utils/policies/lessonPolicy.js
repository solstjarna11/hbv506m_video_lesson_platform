// @ts-nocheck
module.exports = {
    canCreate(user, course) {
        if (!user) return false;
        if (!user.is_active) return false;
        if (!course) return false;
        if (user.role === 'admin') return true;

        // Instructors can create lessons only for courses they own
        return user.role === 'instructor' && course.created_by_user_id === user.id;
    },
    
    canView(user, course, lesson, enrollment) {
        if (!user) return false;
        if (!user.is_active) return false;
        if (!course || !lesson) return false;
        if (user.role === 'admin') return true;

        // Course owner (instructor) can view everything in their own course (including drafts)
        if (user.role === 'instructor' && course.created_by_user_id === user.id) return true;

        // Otherwise: published course + published lesson + active enrollment
        if (!course.is_published) return false;
        if (!lesson.is_published) return false;

        return ((user.role === 'student' || user.role === 'instructor') && enrollment?.status === 'active');
    },

    canEdit(user, course, lesson) {
        if (!user) return false;
        if (!user.is_active) return false;
        if (!course || !lesson) return false;
        if (user.role === 'admin') return true;

        // Instructors can edit lessons only for courses they own
        return user.role === 'instructor' && course.created_by_user_id === user.id;
    },

    canDelete(user, course, lesson) {
        if (!user) return false;
        if (!user.is_active) return false;
        if (!course || !lesson) return false;
        if (user.role === 'admin') return true;

        // Instructors can delete lessons only for courses they own
        return user.role === 'instructor' && course.created_by_user_id === user.id;
    },

    canViewProgress(user, progressRecord) {
        if (!user) return false;
        if (!user.is_active) return false;
        if (!progressRecord) return false;
        if (user.role === 'admin') return true;

        // Users can view their own progress
        return progressRecord.user_id === user.id;
    },

    canUpdateProgress(user, progressRecord) {
        if (!user) return false;
        if (!user.is_active) return false;
        if (!progressRecord) return false;
        if (user.role === 'admin') return true;

        // Users can update their own progress only
        return progressRecord.user_id === user.id;
    },
}