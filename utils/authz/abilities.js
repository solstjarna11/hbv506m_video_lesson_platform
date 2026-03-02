// Define abilities/permissions as constants to avoid typos and ensure consistency across the app.

module.exports = {
  // courses
  COURSE_VIEW: 'course:view',
  COURSE_CREATE: 'course:create',
  COURSE_EDIT: 'course:edit',
  COURSE_DELETE: 'course:delete',
  COURSE_PUBLISH: 'course:publish',
  COURSE_ENROLL: 'course:enroll',
  COURSE_UNENROLL: 'course:unenroll',

  // lessons
  LESSON_VIEW: 'lesson:view',
  LESSON_CREATE: 'lesson:create',
  LESSON_EDIT: 'lesson:edit',
  LESSON_DELETE: 'lesson:delete',
  LESSON_LIST: 'lesson:list',

  // admin
  ADMIN_PANEL: 'admin:panel',
};