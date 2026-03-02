// Routes for managing courses

var express = require('express');
var router = express.Router();

// Authorization
const { authorize } = require('../utils/authz/authorize');
const { loadCourse } = require('../utils/authz/loaders');
const { loadEnrollmentFromCourse } = require('../utils/authz/loaders');
const ABILITIES = require('../utils/authz/abilities');

// Repositories
const coursesRepo = require('../db/coursesRepo');
const lessonsRepo = require('../db/lessonsRepo');
const auditLogsRepo = require('../db/auditLogsRepo');
const enrollmentsRepo = require('../db/enrollmentsRepo');

// Utils
const { safeAuditLog } = require('../utils/auditLogger');

const coursePolicy = require('../utils/policies/coursePolicy');
const lessonPolicy = require('../utils/policies/lessonPolicy');

// GET /courses - list courses
router.get('/', function (req, res, next) {
  try {
    res.locals.pageCss = '/stylesheets/pages/courses.css';

    // Admins/Instructors can view unpublished courses. Students only published courses.
    const canManage = req.user.role === 'admin' || req.user.role === 'instructor';
    const courses = canManage ? coursesRepo.getAllCourses() : coursesRepo.getPublishedCourses();
    res.render('courses/index', { 
      courses,
      canCreate: coursePolicy.canCreate(req.user)
    });
  } catch (err) {
    next(err);
  }
});

// GET /courses/new - show create form
router.get('/new', 
  authorize(ABILITIES.COURSE_CREATE), // only users with course:create can access this route
  function (req, res, next) {
  try {
    res.locals.pageCss = '/stylesheets/pages/courses.css';
    res.render('courses/new', { form: { title: '', description: '' }, error: null });
  } catch (err) {
    next(err);
  }
});

// GET /courses/:id/edit - show edit form
// Must be before /:id route! 
router.get('/:id/edit', 
  loadCourse('id'), // loads course into req.resource.course or 404 if not found
  authorize(ABILITIES.COURSE_EDIT), // only users with course:edit on this course can access
  function (req, res, next) {
  try {
    res.locals.pageCss = '/stylesheets/pages/courses.css';

    const course = req.resource.course; // no need to fetch again from db, loader already did that

    res.render('courses/edit', {
      course,
      form: {
        title: course.title || '',
        description: course.description || '',
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});


// GET /courses/:id - course detail page (with lessons). 
// Must be after /new route!
router.get('/:id', 
  loadCourse('id'), // loads course into req.resource.course or 404 if not found
  loadEnrollmentFromCourse(),
  authorize(ABILITIES.COURSE_VIEW), // only users with course:view on this course can access  
  function (req, res, next) {
  try {
    res.locals.pageCss = '/stylesheets/pages/courses.css';

    const course = req.resource.course; // no need to fetch again from db, loader already did that
    const enrollment = req.resource.enrollment;

    const includeUnpublished = coursePolicy.canEdit(req.user, course); // owner/admin can see unpublished.
    const lessons = lessonsRepo.getLessonsByCourseId(course.id, { includeUnpublished }); 

    const canEnroll = coursePolicy.canEnroll(req.user, course, enrollment);
    const canUnenroll = !!enrollment && coursePolicy.canUnenroll(req.user, enrollment);
    const canEditCourse = coursePolicy.canEdit(req.user, course);
    const canPublishCourse = coursePolicy.canPublish(req.user, course);
    const canCreateLesson = canEditCourse || lessonPolicy.canCreate(req.user, course)
    
    res.render('courses/show', { course, lessons, enrollment, canEnroll, canUnenroll, canEditCourse, canPublishCourse, canCreateLesson });

  } catch (err) {
    next(err);
  }
});

// POST /courses - create course
router.post('/', 
  authorize(ABILITIES.COURSE_CREATE), // only users with course:create can access this route
  function (req, res, next) {
  try {
    const title = (req.body.title || '').trim();
    const description = (req.body.description || '').trim();

    // Very basic validation for now
    if (!title || !description) {
      res.locals.pageCss = '/stylesheets/pages/courses.css';
      return res.status(400).render('courses/new', {
        form: { title, description },
        error: 'Title and description are required.',
      });
    }

    // Create new course with newID for logging purposes.
    const newId = coursesRepo.createCourse({ title, description, created_by_user_id: req.user.id, });

    // Log audit event (non-blocking)
    safeAuditLog(req,{
        event_type: 'course_created',
        severity: 'info',
        actor_user_id: req.user?.id ?? null, // no auth yet
        message: `Course created: ${title}`,
        metadata: { course_id: newId }
    });

    res.redirect('/courses');

  } catch (err) {
    next(err);
  }
});


// POST /courses/:id - update course
router.post('/:id', 
  loadCourse('id'), // loads course into req.resource.course or 404 if not found
  authorize(ABILITIES.COURSE_EDIT), // only users with course:edit on this course can access
  function (req, res, next) {
  try {
    const course = req.resource.course; // no need to fetch again from db, loader already did that

    const title = (req.body.title || '').trim();
    const description = (req.body.description || '').trim();

    if (!title || !description) {
      res.locals.pageCss = '/stylesheets/pages/courses.css';
      return res.status(400).render('courses/edit', {
        course: course,
        form: { title, description },
        error: 'Title and description are required.',
      });
    }

    coursesRepo.updateCourse(course.id, { title, description });
    
    // Log audit event (non-blocking)
    safeAuditLog(req, { 
        event_type: 'course_updated',
        severity: 'info',
        actor_user_id: req.user?.id ?? null,
        message: `Course updated: ${title}`,
        metadata: { course_id: course.id }
    });
    
    res.redirect(`/courses/${course.id}`);
  } catch (err) {
    next(err);
  }
});


// POST /courses/:id/publish-toggle - publish/unpublish
router.post(
  '/:id/publish-toggle',
  loadCourse('id'),
  authorize(ABILITIES.COURSE_PUBLISH),
  (req, res, next) => {
    try {
      const course = req.resource.course;
      const nextVal = course.is_published ? 0 : 1;

      coursesRepo.setPublished(course.id, nextVal);

      safeAuditLog(req, {
        event_type: 'course_publish_toggled',
        severity: 'info',
        actor_user_id: req.user.id,
        message: `Course publish toggled to ${nextVal} for: ${course.title}`,
        metadata: { course_id: course.id, is_published: nextVal },
      });

      res.redirect(`/courses/${course.id}`);
    } catch (err) {
      next(err);
    }
  }
);

// POST /courses/:id/delete - delete course
router.post('/:id/delete', 
  loadCourse('id'), // loads course into req.resource.course or 404 if not found
  authorize(ABILITIES.COURSE_DELETE), // only users with course:delete on this course can access
  function (req, res, next) {
  try {
    const course = req.resource.course; // no need to fetch again from db, loader already did that

    coursesRepo.deleteCourse(course.id);

    // Log audit event (non-blocking)
    safeAuditLog(req, {
        event_type: 'course_deleted',
        severity: 'warn',
        actor_user_id: req.user?.id ?? null,
        message: `Course deleted: ${course.title}`,
        metadata: { course_id: course.id }
    });

    res.redirect('/courses');

  } catch (err) {
    next(err);
  }
});



// POST /courses/:id/enroll
router.post(
  '/:id/enroll',
  loadCourse('id'),
  loadEnrollmentFromCourse(),
  authorize(ABILITIES.COURSE_ENROLL),
  (req, res, next) => {
    try {
      enrollmentsRepo.enrollUserInCourse(req.user.id, req.resource.course.id);

      safeAuditLog(req, {
        event_type: 'course_enrolled',
        severity: 'info',
        actor_user_id: req.user.id,
        message: `User enrolled in course: ${req.resource.course.title}`,
        metadata: { course_id: req.resource.course.id },
      });

      res.redirect(`/courses/${req.resource.course.id}`);
    } catch (err) {
      next(err);
    }
  }
);

// POST /courses/:id/unenroll
router.post(
  '/:id/unenroll',
  loadCourse('id'),
  loadEnrollmentFromCourse(),
  authorize(ABILITIES.COURSE_UNENROLL),
  (req, res, next) => {
    try {
      enrollmentsRepo.cancelEnrollment(req.user.id, req.resource.course.id);

      safeAuditLog(req, {
        event_type: 'course_unenrolled',
        severity: 'info',
        actor_user_id: req.user.id,
        message: `User unenrolled from course: ${req.resource.course.title}`,
        metadata: { course_id: req.resource.course.id },
      });

      res.redirect(`/courses/${req.resource.course.id}`);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
