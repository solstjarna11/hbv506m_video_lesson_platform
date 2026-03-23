// Authorization resource loaders - middleware to load resources based on route params for use in authorization checks.

const coursesRepo = require('../../db/coursesRepo');
const lessonsRepo = require('../../db/lessonsRepo');
const enrollmentsRepo = require('../../db/enrollmentsRepo'); // for optional ABAC-ish enrollment loading
const usersRepo = require('../../db/usersRepo');

const AppError = require('../errors/AppError');
const { badRequestError, notFoundError } = require('../errors/httpErrors');

function loadCourse(param = 'id') {
  return function (req, res, next) {
    const id = Number.parseInt(req.params[param], 10);

    if (!Number.isFinite(id)) {
      return next(
        badRequestError('The request was invalid.', {
          reason: 'invalid_route_param',
          param,
          providedValue: req.params[param],
        })
      );
    }

    const course = coursesRepo.getCourseById(id);

    if (!course) {
      return next(
        notFoundError('The requested course was not found.', {
          resourceType: 'course',
          resourceId: id,
        })
      );
    }

    req.resource = req.resource || {};
    req.resource.course = course;
    next();
  };
}

function loadLesson(param = 'id') {
  return function (req, res, next) {
    const id = Number.parseInt(req.params[param], 10);

    if (!Number.isFinite(id)) {
      return next(
        badRequestError('The request was invalid.', {
          reason: 'invalid_route_param',
          param,
          providedValue: req.params[param],
        })
      );
    }

    const lesson = lessonsRepo.getLessonById(id);

    if (!lesson) {
      return next(
        notFoundError('The requested lesson was not found.', {
          resourceType: 'lesson',
          resourceId: id,
        })
      );
    }

    req.resource = req.resource || {};
    req.resource.lesson = lesson;
    next();
  };
}

// relationship loader for student access (ABAC-ish)
function loadEnrollmentFromCourse() {
  return function (req, res, next) {
    const userId = req.user?.id;
    const courseId = req.resource?.course?.id;

    req.resource = req.resource || {};
    req.resource.enrollment = null;

    if (!userId || !courseId) return next();

    try {
      req.resource.enrollment = enrollmentsRepo.getEnrollment(userId, courseId) || null;
    } catch (_) {
      // ignore DB errors, treat as no enrollment
    }

    next();
  };
}

function loadCourseFromQuery(queryKey = 'course_id') {
  return function (req, res, next) {
    const id = Number.parseInt(req.query[queryKey], 10);

    if (!Number.isFinite(id)) {
      return next(
        badRequestError('The request was invalid.', {
          reason: 'invalid_query_param',
          queryKey,
          providedValue: req.query[queryKey],
        })
      );
    }

    const course = coursesRepo.getCourseById(id);

    if (!course) {
      return next(
        notFoundError('The requested course was not found.', {
          resourceType: 'course',
          resourceId: id,
        })
      );
    }

    req.resource = req.resource || {};
    req.resource.course = course;
    next();
  };
}

function loadCourseFromBody(bodyKey = 'course_id') {
  return function (req, res, next) {
    const id = Number.parseInt(req.body[bodyKey], 10);

    if (!Number.isFinite(id)) {
      return next(
        badRequestError('The request was invalid.', {
          reason: 'invalid_body_field',
          bodyKey,
          providedValue: req.body[bodyKey],
        })
      );
    }

    const course = coursesRepo.getCourseById(id);

    if (!course) {
      return next(
        notFoundError('The requested course was not found.', {
          resourceType: 'course',
          resourceId: id,
        })
      );
    }

    req.resource = req.resource || {};
    req.resource.course = course;
    next();
  };
}

// Helper: after loadLesson('id'), load the course for that lesson
function loadCourseFromLessonResource() {
  return function (req, res, next) {
    const lesson = req.resource?.lesson;

    if (!lesson) {
      return next(
        new AppError({
          message: 'Lesson resource missing before loading course',
          statusCode: 500,
          code: 'LESSON_RESOURCE_MISSING',
          publicMessage: 'Something went wrong. Please try again later.',
          eventType: 'server_error',
          severity: 'error',
          isOperational: false,
          metadata: {
            reason: 'load_course_from_lesson_without_lesson',
          },
        })
      );
    }

    const course = coursesRepo.getCourseById(lesson.course_id);

    if (!course) {
      return next(
        notFoundError('The requested course was not found.', {
          resourceType: 'course',
          resourceId: lesson.course_id,
        })
      );
    }

    req.resource = req.resource || {};
    req.resource.course = course;
    next();
  };
}

function loadUser(param = 'id') {
  return function (req, res, next) {
    const id = Number.parseInt(req.params[param], 10);

    if (!Number.isFinite(id)) {
      return next(
        badRequestError('The request was invalid.', {
          reason: 'invalid_route_param',
          param,
          providedValue: req.params[param],
        })
      );
    }

    const user = usersRepo.getUserById(id);

    if (!user) {
      return next(
        notFoundError('The requested user was not found.', {
          resourceType: 'user',
          resourceId: id,
        })
      );
    }

    req.resource = req.resource || {};
    req.resource.user = user;
    next();
  };
}

module.exports = {
  loadCourse,
  loadLesson,
  loadEnrollmentFromCourse,
  loadCourseFromQuery,
  loadCourseFromBody,
  loadCourseFromLessonResource,
  loadUser,
};