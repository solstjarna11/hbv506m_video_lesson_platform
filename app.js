require('dotenv').config();

const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const fs = require('fs');
const session = require('express-session');
const csurf = require('csurf'); // anti csrf middleware


let indexRouter = require('./routes/index');
let usersRouter = require('./routes/users');
let authRouter = require('./routes/auth');
let coursesRouter = require('./routes/courses');
let lessonsRouter = require('./routes/lessons');
let adminRouter = require('./routes/admin');

const usersRepo = require('./db/usersRepo'); // for session hydration

const adminPolicy = require('./utils/policies/adminPolicy');

const requireAuth = require('./utils//middleware/requireAuth');
let expressLayouts = require('express-ejs-layouts');
const { safeAuditLog } = require('./utils/auditLogger');

function createApp({ sessionStore } = {}) {
  const app = express();

  // defaults for views
  app.use((req, res, next) => {
    res.locals.title = 'Video Lesson Platform';
    res.locals.pageCss = null;
    next();
  });

  app.use(expressLayouts);
  app.set('layout', 'layout');

  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'ejs');
  
  app.set('trust proxy', 'loopback'); // trusts 127.0.0.1 / ::1 only
  // --------------------------
  // Logging
  // --------------------------
  const defaultLogFile = path.join(__dirname, 'logs', 'app.log');
  const logFilePath = process.env.LOG_PATH || defaultLogFile;
  fs.mkdirSync(path.dirname(logFilePath), { recursive: true });

  const accessLogStream = fs.createWriteStream(logFilePath, { flags: 'a' });
  app.use(logger('combined', { stream: accessLogStream }));
  app.use(logger('dev'));

  // --------------------------
  // Parsers / static
  // --------------------------
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, 'public')));

  // --------------------------
  // Session middleware (store injected)
  // --------------------------
  const sessionOptions = {
    secret: process.env.SESSION_SECRET || 'dev-only-secret-change-me',
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24,
    },
  };

  if (sessionStore) {
    sessionOptions.store = sessionStore;
  }

  app.use(session(sessionOptions));

  // anti csrf middlware
  const csrfProtection = csurf();
  app.use(csrfProtection);

  // --------------------------
  // User session hydration middleware
  // Must be after session middleware and before any route that needs req.user
  // --------------------------
  // On each request, if there's a userId in the session, 
  // we fetch the latest user data from the DB and attach it to req.user 
  // and res.locals.user for use in routes and views.
  // -------------------------- 
  app.use((req, res, next) => {
    const userId = req.session?.userId; 

    if (!userId) {
      req.user = null;
      res.locals.user = null;
      res.locals.canAdmin = false;
      return next();
    }

    const user = usersRepo.getUserById(userId);

    // user deleted or disabled -> kill session
    if (!user || user.is_active !== 1) {
      req.session.destroy(() => {});
      req.user = null;
      res.locals.user = null;
      res.locals.canAdmin = false;
      return res.redirect('/auth/login');
    }

    req.user = user;        // DB-fresh user row
    res.locals.user = user; // views
    res.locals.canAdmin = adminPolicy.canAccess(user); // centralized admin capability flag
    return next();
  });


  app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
  });

  // --------------------------
  // Routes
  // --------------------------
  // Public routes
  app.use('/', indexRouter);
  app.use('/auth', authRouter);
  
  // All routes below require authentication, enforced by requireAuth middleware
  app.use('/users', requireAuth, usersRouter);
  app.use('/courses', requireAuth, coursesRouter);
  app.use('/lessons', requireAuth, lessonsRouter);
  app.use('/admin', requireAuth, adminRouter);


  app.use(function (req, res, next) {
    res.locals.message = 'Page not found.'
    res.locals.status = 404
    res.status(404).render('error')
  });

  // CSRF error handler
  app.use((err, req, res, next) => {
    console.error(err);
    if (err.code === 'EBADCSRFTOKEN') {
      safeAuditLog(req, {
        event_type: 'csrf_violation',
        severity: 'warn',
        actor_user_id: req.user?.id ?? null,
        message: 'Invalid or missing CSRF token',
      });

      res.locals.message = 'Invalid form submission. Please try again.';
      res.locals.status = 403
      return res.status(403).render('error');
    }
    next(err);
  });

  app.use(function (err, req, res, next) {
    safeAuditLog(req, {
      event_type: 'server_error',
      severity: 'error',
      actor_user_id: req.user?.id ?? null,
      message: `Unhandled server error: ${err.message}`,
      metadata_json: JSON.stringify({ stack: err.stack })
    })

    res.locals.message = 'An unexpected error occurred. Please try again later.'
    res.locals.status = err.status || 500;
    res.status(err.status || 500);
    res.render('error');
  });

  return app;
}

module.exports = { createApp };