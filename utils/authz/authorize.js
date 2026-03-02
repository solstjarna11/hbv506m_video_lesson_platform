// utils/authz/authorize.js

const coursePolicy = require('../policies/coursePolicy');
const lessonPolicy = require('../policies/lessonPolicy');

const ABILITIES = require('./abilities');

function forbidden(res) {
  return res.status(403).send('Forbidden');
}

/**
 * authorize(ability)
 *
 * Expects req.user (set by requireAuth or global hydration)
 * and optionally req.resource.{course,lesson,enrollment}
 */
function authorize(ability) {
  return function (req, res, next) {
    const user = req.user;
    const course = req.resource?.course;
    const lesson = req.resource?.lesson;
    const enrollment = req.resource?.enrollment;

    // deny-by-default
    let allowed = false;

    switch (ability) {
      // Courses
      case ABILITIES.COURSE_VIEW:
        if (!course) return forbidden(res);
        allowed = coursePolicy.canView(user, course);
        break;

      case ABILITIES.COURSE_CREATE:
        allowed = coursePolicy.canCreate(user);
        break;

      case ABILITIES.COURSE_EDIT:
        if (!course) return forbidden(res);
        allowed = coursePolicy.canEdit(user, course);
        break;

      case ABILITIES.COURSE_DELETE:
        if (!course) return forbidden(res);
        allowed = coursePolicy.canDelete(user, course);
        break;

      case ABILITIES.COURSE_PUBLISH:
        if (!course) return forbidden(res);
        allowed = coursePolicy.canPublish(user, course);
        break;

      // Lessons (these likely need course + enrollment)
      case ABILITIES.LESSON_VIEW:
        if (!course || !lesson) return forbidden(res);
        allowed = lessonPolicy.canView(user, course, lesson, enrollment);
        break;

      // Add more as we complete TODOs
      case ABILITIES.LESSON_CREATE:
        if (!course) return forbidden(res);
        allowed = lessonPolicy.canCreate(user, course);
        break;

      case ABILITIES.LESSON_EDIT:
        if (!course || !lesson) return forbidden(res);
        allowed = lessonPolicy.canEdit(user, course, lesson);
        break;

      case ABILITIES.LESSON_DELETE:
        if (!course || !lesson) return forbidden(res);
        allowed = lessonPolicy.canDelete(user, course, lesson);
        break;

      case ABILITIES.LESSON_LIST:
        if (!course) return forbidden(res);
        // Listing is essentially "can view lessons in this course"
        allowed =
          (user?.is_active &&
            (user.role === 'admin' ||
              (user.role === 'instructor' && course.created_by_user_id === user.id) ||
              (course.is_published && enrollment?.status === 'active')));
        break;
        

      default:
        allowed = false;
    }

    if (!allowed) return forbidden(res);
    return next();
  };
}

module.exports = { authorize };