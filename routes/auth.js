const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const passwordPolicy = require('../utils/passwordPolicy');
const loginRateLimit = require('../utils/loginRateLimit');
const registerRateLimit = require('../utils/registerRateLimit');
const { safeAuditLog } = require('../utils/auditLogger');

/* GET register page. */
router.get('/register', function(req, res, next) {
  res.render('auth/register', {
    title: 'Register',
    pageCss: '/stylesheets/pages/register.css',
    errors:[],
    form: {email: '', display_name: ''}
  });
});

/* GET login page. */
router.get('/login', function(req, res, next) {
  res.render('auth/login', {
    title: 'Login',
    pageCss: '/stylesheets/pages/register.css',
    errors: [],
    form: {email: ''}
  });
});

/* POST register page. */
// Ensure passwordPolicy and registerRateLimit middleware are applied to the registration route to enforce security measures.
router.post('/register', registerRateLimit, passwordPolicy, async (req, res) => {
  try {
    if (req.passwordPolicyErrors?.length) {
      return res.status(400).render('auth/register', {
        title: 'Register',
        pageCss: '/stylesheets/pages/register.css',
        errors: req.passwordPolicyErrors,
        form: { email: req.body.email || '', display_name: req.body.display_name || ''}
      });
    }
    const user = await authService.register(req.body)

    safeAuditLog(req, {
      event_type: 'register_success',
      severity: 'info',
      actor_user_id: user.id,
      message: `New user registered: ${user.display_name}`,
    });

    // Prevent session fixation by regenerating the session on successful registration.
    req.session.regenerate((err) => {
      if (err) return res.status(500).send('Session error');
      req.session.userId = user.id;
      res.redirect('/');
    });
  } catch (err) {
    safeAuditLog(req, {
      event_type: 'register_failure',
      severity: 'warn',
      actor_user_id: null,
      message: `Registration failed`,
    });

    return res.status(400).render('auth/register', {
      title: 'Register',
      pageCss: '/stylesheets/pages/register.css',
      errors: [err.message],
      form: { email: req.body.email || '', display_name: req.body.display_name || ''}
    });
  }
});

/* POST login page. */
router.post('/login', loginRateLimit, async (req, res) => {
  try {
    const user = await authService.login(req.body);

    safeAuditLog(req, {
      event_type: 'login_success',
      severity: 'info',
      actor_user_id: user.id,
      message: `Successful login: ${user.display_name}`,
    });

    // Prevent session fixation by regenerating the session on successful login.
    req.session.regenerate((err) => {
      if (err) {
        return res.status(500).send('Session error');
      }
      req.session.userId = user.id;
      res.redirect('/');
    });

  } catch (err) {
    safeAuditLog(req, {
      event_type: 'login_failure',
      severity: 'warn',
      actor_user_id: null,
      message: `Login attempt failed: ${err.message}`,
    });

    return res.status(400).render('auth/login', {
      title: 'Login',
      pageCss: '/stylesheets/pages/register.css',
      errors: [err.message],
      form: { email: req.body.email || '' }
    });
  }
});

router.post('/logout', async (req, res) => {
  const userId = req.user?.id ?? null

  req.session.destroy(err => {
    if (err) {
      return res.status(500).send('Logout unsuccessful')
    }

    safeAuditLog(req, {
      event_type: 'logout',
      severity: 'info',
      actor_user_id: userId,
      message: 'User logged out',
    });

    res.clearCookie('connect.sid', { path: '/' });
    res.redirect('/auth/login')
  })
});

module.exports = router;