// Operations for "enrollments" table.
// All queries are parameterized (?). Defense against injection (A05).

const db = require("./index");

function enrollUserInCourse(userId, courseId) {
  // Idempotent: if already enrollment remains active; cancelled enrollment is reactivated.
  const stmt = db.prepare(`
    INSERT INTO enrollments (user_id, course_id, status)
    VALUES (?, ?, 'active')
    ON CONFLICT(user_id, course_id) DO UPDATE SET
      status = 'active',
      cancelled_at = NULL,
      enrolled_at = datetime('now')
  `);

  return stmt.run(userId, courseId).changes; // 1 if inserted, 0 if already existed
}

function cancelEnrollment(userId, courseId) {
  const stmt = db.prepare(`
    UPDATE enrollments
    SET status = 'cancelled',
        cancelled_at = datetime('now')
    WHERE user_id = ? AND course_id = ? AND status = 'active'
  `);

  return stmt.run(userId, courseId).changes;
}

function isUserEnrolled(userId, courseId) {
  const row = db
    .prepare(
      `
      SELECT 1
      FROM enrollments
      WHERE user_id = ? AND course_id = ? AND status = 'active'
      LIMIT 1
    `
    )
    .get(userId, courseId);

  return !!row;
}

function getEnrolledCoursesForUser(userId) {
  return db
    .prepare(
      `
      SELECT c.*
      FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      WHERE e.user_id = ? AND e.status = 'active'
      ORDER BY e.enrolled_at DESC
    `
    )
    .all(userId);
}

function getEnrollment(userId, courseId) {
  return db.prepare(`
    SELECT *
    FROM enrollments
    WHERE user_id = ? AND course_id = ?
    LIMIT 1
  `).get(userId, courseId);
}

module.exports = {
  enrollUserInCourse,
  cancelEnrollment,
  isUserEnrolled,
  getEnrolledCoursesForUser,
  getEnrollment,
};
