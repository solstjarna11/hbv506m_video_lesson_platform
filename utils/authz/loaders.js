// Authorization resource loaders - middleware to load resources based on route params for use in authorization checks.

const coursesRepo = require('../../db/coursesRepo');
const lessonsRepo = require('../../db/lessonsRepo');
const enrollmentsRepo = require('../../db/enrollmentsRepo'); // for optional ABAC-ish enrollment loading

function loadCourse(param = 'id') {
  return function (req, res, next) {
    const id = parseInt(req.params[param], 10);
    if (!Number.isFinite(id)) return res.status(400).send('Invalid id');

    const course = coursesRepo.getCourseById(id);
    if (!course) return res.status(404).send('Course not found');

    req.resource = req.resource || {};
    req.resource.course = course;
    next();
  };
}

function loadLesson(param = 'id') {
  return function (req, res, next) {
    const id = parseInt(req.params[param], 10);
    if (!Number.isFinite(id)) return res.status(400).send('Invalid id');

    const lesson = lessonsRepo.getLessonById(id);
    if (!lesson) return res.status(404).send('Lesson not found');

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

module.exports = {
  loadCourse,
  loadLesson,
  loadEnrollmentFromCourse,
};