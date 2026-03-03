const db = require("./index");

function getUserByEmail(email) {
    const normalizedEmail = (email || "").trim().toLowerCase(); // Normalize email to prevent duplicates due to case or whitespace
    return db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail)
}

function getUserById(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id)
}

function createUser({ email, password_hash, display_name}) {
    const normalizedEmail = (email || "").trim().toLowerCase(); // Normalize email to prevent duplicates due to case or whitespace
    const existing = getUserByEmail(normalizedEmail)
    if (existing) {
        throw new Error("Registration failed."); // Don't reveal that the email is already registered for better security.
    }
    const result = db.prepare(`
        INSERT INTO users (email, password_hash, display_name)
        VALUES (?, ?, ?)
    `).run(normalizedEmail, password_hash, display_name || null)
    
    return getUserById(result.lastInsertRowid);
}

function updatePassword(id, password_hash) {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(password_hash, id)
}

function deleteUser(id) {
  return db.prepare('DELETE FROM users WHERE id = ?').run(id).changes;
}

// Record a failed login attempt for the user with the given email. 
// If the number of failed attempts exceeds maxAttempts, set a lockout until a future time.
function recordFailedLogin(email, { maxAttempts = 5, lockMinutes = 15 } = {}) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const user = getUserByEmail(normalizedEmail);
  if (!user) return;

  const nextAttempts = (user.failed_login_attempts || 0) + 1;

  let lockUntil = user.lock_until;
  if (nextAttempts >= maxAttempts) {
    lockUntil = Date.now() + lockMinutes * 60 * 1000; 
  }

  db.prepare(`
    UPDATE users
    SET failed_login_attempts = ?, lock_until = ?
    WHERE email = ?
  `).run(nextAttempts, lockUntil ?? null, normalizedEmail);
}

// Clear failed login attempts and lockout status after a successful login.
function clearLoginFailures(userId) {
  db.prepare(`
    UPDATE users
    SET failed_login_attempts = 0, lock_until = NULL
    WHERE id = ?
  `).run(userId);
}

function updateUser(id, { display_name, email, role, is_active } = {}) {
  const fields = [];
  const values = [];

  if (display_name !== undefined) {
    fields.push('display_name = ?');
    values.push(display_name);
  }
  if (email !== undefined) {
    fields.push('email = ?');
    values.push(email);
  }
  if (role !== undefined) {
    fields.push('role = ?');
    values.push(role);
  }
  if (is_active !== undefined) {
    fields.push('is_active = ?');
    values.push(is_active ? 1 : 0);
  }

  if (!fields.length) return 0; // nothing to update

  const stmt = db.prepare(`
    UPDATE users
    SET ${fields.join(', ')}, updated_at = datetime('now')
    WHERE id = ?
  `);
  values.push(id);
  return stmt.run(...values).changes;
}

module.exports = {
    getUserByEmail,
    getUserById,
    createUser,
    updatePassword,
    deleteUser,
    recordFailedLogin,
    clearLoginFailures,
    updateUser
}