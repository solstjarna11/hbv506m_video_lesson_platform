// Seed the database with initial data, bypassing application layer logic where appropriate.
// Operates at infrastructure level for direct DB manipulation.

const db = require('./index');
const coursesRepo = require('./coursesRepo');

console.log('Seeding database...');

// -------------------------
// USERS
// -------------------------
const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (email, role, display_name)
  VALUES (?, ?, ?)
`);

insertUser.run('admin@example.com', 'admin', 'Admin User');
insertUser.run('student@example.com', 'student', 'Student User');

const adminUser = db.prepare(
  'SELECT id FROM users WHERE email = ?'
).get('admin@example.com');

const normalUser = db.prepare(
  'SELECT id FROM users WHERE email = ?'
).get('student@example.com');

// -------------------------
// COURSES (using our repo)
// -------------------------
let course1Id = db
  .prepare('SELECT id FROM courses WHERE title = ?')
  .get('Introduction to Web Security')?.id;

if (!course1Id) {
  course1Id = coursesRepo.createCourse({
    title: 'Introduction to Web Security',
    description: 'Learn the basics of web application security and common vulnerabilities.',
    is_published: 1,
    created_by_user_id: adminUser.id,
  });
}

let course2Id = db
  .prepare('SELECT id FROM courses WHERE title = ?')
  .get('Secure Backend Development')?.id;

if (!course2Id) {
  course2Id = coursesRepo.createCourse({
    title: 'Secure Backend Development',
    description: 'Building secure Node.js and Express applications.',
    is_published: 1,
    created_by_user_id: adminUser.id,
  });
}

// -------------------------
// LESSONS
// -------------------------
const insertLesson = db.prepare(`
  INSERT OR IGNORE INTO lessons
    (course_id, title, description, video_url, position, is_published)
  VALUES (?, ?, ?, ?, ?, ?)
`);

insertLesson.run(
  course1Id,
  'What is Web Security?',
  'Overview of common threats and attack surfaces.',
  'https://example.com/video1',
  1,
  1
);

insertLesson.run(
  course1Id,
  'OWASP Top 10 Overview',
  'Introduction to the OWASP Top 10 vulnerabilities.',
  'https://example.com/video2',
  2,
  1
);

insertLesson.run(
  course2Id,
  'Secure Express Setup',
  'Hardening an Express.js application.',
  'https://example.com/video3',
  1,
  1
);

insertLesson.run(
  course2Id,
  'Injection Attacks',
  'Understanding SQL and command injection.',
  'https://example.com/video4',
  2,
  1
);

// -------------------------
// ENROLLMENTS
// -------------------------
db.prepare(`
  INSERT OR IGNORE INTO enrollments (user_id, course_id)
  VALUES (?, ?)
`).run(normalUser.id, course1Id);

// -------------------------
// LESSON PROGRESS
// -------------------------
const lessonIds = db.prepare(`
  SELECT id FROM lessons WHERE course_id = ?
`).all(course1Id);

const insertProgress = db.prepare(`
  INSERT OR IGNORE INTO lesson_progress
    (user_id, lesson_id, status, progress_seconds, completed_at)
  VALUES (?, ?, ?, ?, ?)
`);

if (lessonIds.length > 0) {
  insertProgress.run(
    normalUser.id,
    lessonIds[0].id,
    'completed',
    300,
    new Date().toISOString()
  );
}

if (lessonIds.length > 1) {
  insertProgress.run(
    normalUser.id,
    lessonIds[1].id,
    'in_progress',
    120,
    null
  );
}

// -------------------------
// AUDIT LOGS
// -------------------------
const insertAuditLog = db.prepare(`
  INSERT INTO audit_logs
    (event_type, severity, actor_user_id, message)
  VALUES (?, ?, ?, ?)
`);

insertAuditLog.run(
  'seed',
  'info',
  adminUser.id,
  'Initial database seed completed'
);

insertAuditLog.run(
  'course_created',
  'info',
  adminUser.id,
  'Sample courses created during seed'
);

console.log('Database seeding complete');
