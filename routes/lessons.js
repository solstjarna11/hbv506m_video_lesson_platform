var express = require('express');
var router = express.Router();

// AuthZ
const { authorize } = require('../utils/authz/authorize');
const ABILITIES = require('../utils/authz/abilities');
const {
  loadLesson,
  loadCourseFromQuery,
  loadCourseFromBody,
  loadCourseFromLessonResource,
  loadEnrollmentFromCourse,
} = require('../utils/authz/loaders');

// Repos
const lessonsRepo = require('../db/lessonsRepo');

// Utils
const { safeAuditLog } = require('../utils/auditLogger');
const coursePolicy = require('../utils/policies/coursePolicy'); // for includeUnpublished decision

// --------------------------------------
// GET /lessons?course_id=1  (list lessons for a course)
// --------------------------------------
router.get(
  '/',
  loadCourseFromQuery('course_id'),
  loadEnrollmentFromCourse(),
  authorize(ABILITIES.LESSON_LIST),
  function (req, res, next) {
    try {
      res.locals.pageCss = '/stylesheets/pages/courses.css';

      const course = req.resource.course;

      // Only instructors/admins who can edit/own should see drafts.
      const includeUnpublished = coursePolicy.canEdit(req.user, course)

      const lessons = lessonsRepo.getLessonsByCourseId(course.id, { includeUnpublished });
      res.render('lessons/index', { course, lessons });
    } catch (err) {
      next(err);
    }
  }
);

// --------------------------------------
// GET /lessons/new?course_id=1 (create form)
// --------------------------------------
router.get(
  '/new',
  loadCourseFromQuery('course_id'),
  authorize(ABILITIES.LESSON_CREATE),
  function (req, res, next) {
    try {
      res.locals.pageCss = '/stylesheets/pages/courses.css';

      const course = req.resource.course;

      res.render('lessons/new', {
        course,
        form: { title: '', description: '', video_url: '', position: 0, is_published: 0 },
        error: null,
      });
    } catch (err) {
      next(err);
    }
  }
);

// --------------------------------------
// POST /lessons  (create action)
// --------------------------------------
router.post(
  '/',
  loadCourseFromBody('course_id'),
  authorize(ABILITIES.LESSON_CREATE),
  function (req, res, next) {
    try {
      const course = req.resource.course;

      const title = (req.body.title || '').trim();
      const description = (req.body.description || '').trim() || null;
      const video_url = (req.body.video_url || '').trim() || null;
      const position = parseInt(req.body.position, 10);
      const is_published = req.body.is_published === '1' ? 1 : 0;

      if (!title) {
        res.locals.pageCss = '/stylesheets/pages/courses.css';
        return res.status(400).render('lessons/new', {
          course,
          form: {
            title,
            description: description || '',
            video_url: video_url || '',
            position: Number.isFinite(position) ? position : 0,
            is_published,
          },
          error: 'Title is required.',
        });
      }

      const newID = lessonsRepo.createLesson({
        course_id: course.id,
        title,
        description,
        video_url,
        position: Number.isFinite(position) ? position : 0,
        is_published,
      });

      safeAuditLog(req, {
        event_type: 'lesson_created',
        severity: 'info',
        actor_user_id: req.user?.id ?? null,
        message: `Lesson created in course ${course.id} (lessonID: ${newID}) ${title}`,
        metadata: { course_id: course.id, lesson_id: newID, title },
      });

      res.redirect(`/lessons?course_id=${course.id}`);
    } catch (err) {
      next(err);
    }
  }
);

// --------------------------------------
// GET /lessons/:id (lesson detail)
// --------------------------------------
router.get(
  '/:id',
  loadLesson('id'),
  loadCourseFromLessonResource(),
  loadEnrollmentFromCourse(),
  authorize(ABILITIES.LESSON_VIEW),
  function (req, res, next) {
    try {
      res.locals.pageCss = '/stylesheets/pages/courses.css';
      const lesson = req.resource.lesson;
      const course = req.resource.course;
      res.render('lessons/show', { lesson, course });
    } catch (err) {
      next(err);
    }
  }
);

// --------------------------------------
// GET /lessons/:id/edit
// --------------------------------------
router.get(
  '/:id/edit',
  loadLesson('id'),
  loadCourseFromLessonResource(),
  authorize(ABILITIES.LESSON_EDIT),
  function (req, res, next) {
    try {
      res.locals.pageCss = '/stylesheets/pages/courses.css';
      const lesson = req.resource.lesson;
      const course = req.resource.course;

      res.render('lessons/edit', {
        course,
        lesson,
        form: {
          title: lesson.title || '',
          description: lesson.description || '',
          video_url: lesson.video_url || '',
          position: lesson.position ?? 0,
          is_published: lesson.is_published ?? 0,
        },
        error: null,
      });
    } catch (err) {
      next(err);
    }
  }
);

// --------------------------------------
// POST /lessons/:id (update)
// --------------------------------------
router.post(
  '/:id',
  loadLesson('id'),
  loadCourseFromLessonResource(),
  authorize(ABILITIES.LESSON_EDIT),
  function (req, res, next) {
    try {
      const lesson = req.resource.lesson;
      const course = req.resource.course;

      const title = (req.body.title || '').trim();
      const description = (req.body.description || '').trim() || null;
      const video_url = (req.body.video_url || '').trim() || null;
      const position = parseInt(req.body.position, 10);
      const is_published = req.body.is_published === '1' ? 1 : 0;

      if (!title) {
        res.locals.pageCss = '/stylesheets/pages/courses.css';
        return res.status(400).render('lessons/edit', {
          course,
          lesson,
          form: {
            title,
            description: description || '',
            video_url: video_url || '',
            position: Number.isFinite(position) ? position : (lesson.position ?? 0),
            is_published,
          },
          error: 'Title is required.',
        });
      }

      lessonsRepo.updateLesson(lesson.id, {
        title,
        description,
        video_url,
        position: Number.isFinite(position) ? position : (lesson.position ?? 0),
        is_published,
      });

      safeAuditLog(req, {
        event_type: 'lesson_updated',
        severity: 'info',
        actor_user_id: req.user?.id ?? null,
        message: `Lesson updated (ID: ${lesson.id}): ${title}`,
        metadata: { lesson_id: lesson.id, course_id: course.id, title },
      });

      res.redirect(`/lessons?course_id=${course.id}`);
    } catch (err) {
      next(err);
    }
  }
);

// --------------------------------------
// POST /lessons/:id/delete
// --------------------------------------
router.post(
  '/:id/delete',
  loadLesson('id'),
  loadCourseFromLessonResource(),
  authorize(ABILITIES.LESSON_DELETE),
  function (req, res, next) {
    try {
      const lesson = req.resource.lesson;
      const course = req.resource.course;

      lessonsRepo.deleteLesson(lesson.id);

      safeAuditLog(req, {
        event_type: 'lesson_deleted',
        severity: 'warn',
        actor_user_id: req.user?.id ?? null,
        message: `Lesson deleted (ID: ${lesson.id}): ${lesson.title}`,
        metadata: { lesson_id: lesson.id, course_id: course.id, title: lesson.title },
      });

      res.redirect(`/lessons?course_id=${course.id}`);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;