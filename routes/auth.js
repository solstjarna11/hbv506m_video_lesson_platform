const express = require("express");
const router = express.Router();
const authService = require("../services/authService");
const passwordPolicy = require("../utils/passwordPolicy");
const loginRateLimit = require("../utils/loginRateLimit");
const registerRateLimit = require("../utils/registerRateLimit");
const { safeAuditLog } = require("../utils/auditLogger");
const AppError = require("../utils/errors/AppError");

// helper
function getSafeErrorMessage(err) {
  return typeof err?.message === "string" && err.message.trim()
    ? err.message
    : "The request could not be completed.";
}

/* GET register page. */
router.get("/register", function (req, res, next) {
  res.render("auth/register", {
    title: "Register",
    pageCss: "/stylesheets/pages/register.css",
    errors: [],
    form: { email: "", display_name: "" },
  });
});

/* GET login page. */
router.get("/login", function (req, res, next) {
  res.render("auth/login", {
    title: "Login",
    pageCss: "/stylesheets/pages/register.css",
    errors: [],
    form: { email: "" },
  });
});

/* POST register page. */
// Ensure passwordPolicy and registerRateLimit middleware are applied to the registration route to enforce security measures.
router.post(
  "/register",
  registerRateLimit,
  passwordPolicy,
  async (req, res, next) => {
    try {
      if (req.passwordPolicyErrors?.length) {
        return res.status(400).render("auth/register", {
          title: "Register",
          pageCss: "/stylesheets/pages/register.css",
          errors: req.passwordPolicyErrors,
          form: {
            email: req.body.email || "",
            display_name: req.body.display_name || "",
          },
        });
      }
      const user = await authService.register(req.body);

      safeAuditLog(req, {
        event_type: "register_success",
        severity: "info",
        actor_user_id: user.id,
        message: `New user registered: ${user.email}`,
      });

      // Prevent session fixation by regenerating the session on successful registration.
      req.session.regenerate((err) => {
        if (err) {
          return next(
            new AppError({
              message: "Session regeneration failed after registration",
              statusCode: 500,
              code: "SESSION_REGENERATE_FAILED",
              publicMessage: "Something went wrong. Please try again later.",
              eventType: "server_error",
              severity: "error",
              isOperational: false,
              metadata: {
                flow: "register",
              },
            }),
          );
        }
        req.session.userId = user.id;
        res.redirect("/");
      });
    } catch (err) {
      const registerAttemptEmail = req.body.email;
      const safeMessage = getSafeErrorMessage(err);

      safeAuditLog(req, {
        event_type: "register_failure",
        severity: "warn",
        actor_user_id: null,
        message: `Registration for ${registerAttemptEmail} failed`,
      });

      return res.status(400).render("auth/register", {
        title: "Register",
        pageCss: "/stylesheets/pages/register.css",
        errors: [safeMessage],
        form: {
          email: req.body.email || "",
          display_name: req.body.display_name || "",
        },
      });
    }
  },
);

/* POST login page. */
router.post("/login", loginRateLimit, async (req, res, next) => {
  try {
    const user = await authService.login(req.body);

    safeAuditLog(req, {
      event_type: "login_success",
      severity: "info",
      actor_user_id: user.id,
      message: `Successful login: ${user.email}`,
    });

    // Prevent session fixation by regenerating the session on successful login.
    req.session.regenerate((err) => {
      if (err) {
        return next(
          new AppError({
            message: "Session regeneration failed after login",
            statusCode: 500,
            code: "SESSION_REGENERATE_FAILED",
            publicMessage: "Something went wrong. Please try again later.",
            eventType: "server_error",
            severity: "error",
            isOperational: false,
            metadata: {
              flow: "login",
            },
          }),
        );
      }
      req.session.userId = user.id;
      res.redirect("/");
    });
  } catch (err) {
    const loginAttemptEmail = req.body.email;
    const isLockedError =
      err.message === "Account temporarily locked. Try again later.";
    const safeMessage = getSafeErrorMessage(err);

    safeAuditLog(req, {
      event_type: isLockedError ? "account_locked" : "login_failure",
      severity: "warn",
      actor_user_id: null,
      message: `Login attempt for ${loginAttemptEmail} failed: ${safeMessage}`,
    });

    return res.status(400).render("auth/login", {
      title: "Login",
      pageCss: "/stylesheets/pages/register.css",
      errors: [safeMessage],
      form: { email: req.body.email || "" },
    });
  }
});

router.post("/logout", async (req, res, next) => {
  const userId = req.user?.id ?? null;

  req.session.destroy((err) => {
    if (err) {
      return next(
        new AppError({
          message: "Session destruction failed during logout",
          statusCode: 500,
          code: "SESSION_DESTROY_FAILED",
          publicMessage: "Something went wrong. Please try again later.",
          eventType: "server_error",
          severity: "error",
          isOperational: false,
          metadata: {
            flow: "logout",
            userId,
          },
        }),
      );
    }

    safeAuditLog(req, {
      event_type: "logout",
      severity: "info",
      actor_user_id: userId,
      message: "User logged out",
    });

    res.clearCookie("connect.sid", { path: "/" });
    res.redirect("/auth/login");
  });
});

module.exports = router;
