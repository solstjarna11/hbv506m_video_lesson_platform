// CRUD operations for "courses" table.

// All queries are parameterized (?). Defense against injection (A05).

const db = require('./index');

function getAllCourses() {
  return db.prepare('SELECT * FROM courses ORDER BY id DESC').all();
}

function getCourseById(id) {
  return db.prepare('SELECT * FROM courses WHERE id = ?').get(id);
}

function getPublishedCourses() {
  return db.prepare('SELECT * FROM courses WHERE is_published = 1 ORDER BY id DESC').all();
}

function setPublished(id, is_published) {
  const stmt = db.prepare(`
    UPDATE courses
    SET is_published = ?, updated_at = datetime('now')
    WHERE id = ?
  `);
  return stmt.run(is_published ? 1 : 0, id).changes;
}

function createCourse({ title, description, created_by_user_id }) {
  const stmt = db.prepare(`
    INSERT INTO courses (title, description, created _by_user_id)
    VALUES (?, ?, ?)
  `);
  const result = stmt.run(title, description, created_by_user_id ?? null);
  return result.lastInsertRowid;
}

function updateCourse(id, { title, description }) {
  const stmt = db.prepare(`
    UPDATE courses
    SET title = ?, description = ?, updated_at = datetime('now')
    WHERE id = ?
  `);
  return stmt.run(title, description, id).changes;
}

function deleteCourse(id) {
  return db.prepare('DELETE FROM courses WHERE id = ?').run(id).changes;
}

module.exports = {
  getAllCourses,
  getCourseById,
  getPublishedCourses,
  setPublished,
  createCourse,
  updateCourse,
  deleteCourse,
};
