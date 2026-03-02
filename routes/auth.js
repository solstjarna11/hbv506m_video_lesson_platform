const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const passwordPolicy = require('../utils/passwordPolicy');
const loginRateLimit = require('../utils/loginRateLimit');
const registerRateLimit = require('../utils/registerRateLimit');

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
    // Prevent session fixation by regenerating the session on successful registration.
    req.session.regenerate((err) => {
      if (err) return res.status(500).send('Session error');
      req.session.userId = user.id;
      res.redirect('/');
    });
  } catch (err) {
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

    // Prevent session fixation by regenerating the session on successful login.
    req.session.regenerate((err) => {
      if (err) {
        return res.status(500).send('Session error');
      }
      req.session.userId = user.id;
      res.redirect('/');
    });

  } catch (err) {
    return res.status(400).render('auth/login', {
      title: 'Login',
      pageCss: '/stylesheets/pages/register.css',
      errors: [err.message],
      form: { email: req.body.email || '' }
    });
  }
});

router.post('/logout', async (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).send('Logout unsuccessful')
    }

    res.clearCookie('connect.sid', { path: '/' });
    res.redirect('/auth/login')
  })
});

module.exports = router;