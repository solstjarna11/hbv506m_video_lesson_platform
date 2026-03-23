const express = require("express");
const router = express.Router();
const { exec } = require("node:child_process");
const fs = require("node:fs");

const { accessLogPath, errorLogPath } = require("../utils/logging/fileStreams");
const { badRequestError, notFoundError } = require("../utils/errors/httpErrors");
const auditLogsRepo = require("../db/auditLogsRepo");
const { safeAuditLog } = require("../utils/auditLogger");
const { authorize } = require("../utils/authz/authorize");
const ABILITIES = require("../utils/authz/abilities");
const usersRepo = require("../db/usersRepo");

// Helpers
function sanitizeQueryString(value, maxLength = 100) {
  if (typeof value !== "string") return "";

  return value
    .trim()
    .replaceAll(/[\r\n\t]+/g, " ")
    .slice(0, maxLength);
}

function sanitizeQueryInt(value, fallback = null, min = 0, max = 1000) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < min) return min;
  if (parsed > max) return max;

  return parsed;
}

function resolveLogPath(logType) {
  switch (logType) {
    case "error":
      return { logType: "error", logPath: errorLogPath };
    case "access":
    default:
      return { logType: "access", logPath: accessLogPath };
  }
}

function tailFile(filePath, maxLines = 100, maxBytes = 64 * 1024) {
  try {
    if (!fs.existsSync(filePath)) return null;

    const stats = fs.statSync(filePath);
    const start = Math.max(0, stats.size - maxBytes);
    const length = stats.size - start;

    const fd = fs.openSync(filePath, "r");

    try {
      const buffer = Buffer.alloc(length);
      fs.readSync(fd, buffer, 0, length, start);

      let content = buffer.toString("utf8");

      // If we started in the middle of the file, the first line may be partial.
      if (start > 0) {
        const firstNewlineIndex = content.indexOf("\n");
        if (firstNewlineIndex !== -1) {
          content = content.slice(firstNewlineIndex + 1);
        }
      }

      const lines = content.split("\n").filter(Boolean);
      return lines.slice(-maxLines).join("\n");
    } finally {
      fs.closeSync(fd);
    }
  } catch (_) {
    return null;
  }
}

// GET /admin/monitor - monitoring page
router.get("/monitor", authorize(ABILITIES.ADMIN_PANEL), function (req, res, next) {
  try {
    res.locals.pageCss = "/stylesheets/pages/admin.css";

    safeAuditLog(req, {
      event_type: "admin_monitor_view",
      severity: "info",
      actor_user_id: req.user.id,
      message: "Admin monitoring page accessed",
    });

    const filters = {
      severity: sanitizeQueryString(req.query.severity, 30),
      event_type: sanitizeQueryString(req.query.event_type, 50),
      actor_user_id: sanitizeQueryInt(req.query.actor_user_id, null, 1, 1000000),
      q: sanitizeQueryString(req.query.q, 100),
      from: sanitizeQueryString(req.query.from, 30),
      to: sanitizeQueryString(req.query.to, 30),
      limit: sanitizeQueryInt(req.query.limit, 50, 1, 200),
    };

    let latestLogs = [];
    try {
      latestLogs = auditLogsRepo.searchLogs(filters);
    } catch (_) {
      latestLogs = [];
    }

    const requestedLogType = sanitizeQueryString(req.query.log_type, 20);
    const { logType, logPath } = resolveLogPath(requestedLogType);
    const fileLogTail = tailFile(logPath, 120, 64 * 1024);

    // Intentionally retained for now pending course clarification about command-execution testing.
    exec("uptime", { timeout: 1500 }, (err, stdout, stderr) => {
      if (err) {
        return next(err);
      }

      const uptimeOutput = (stdout || stderr || "").trim();

      return res.render("admin/monitor", {
        uptimeOutput,
        latestLogs,
        fileLogTail,
        logPath,
        logType,
        filters,
      });
    });
  } catch (err) {
    next(err);
  }
});

router.get("/user-search", authorize(ABILITIES.USER_LIST), function (req, res, next) {
  try {
    const userId = Number.parseInt(req.query.id, 10);

    if (!Number.isFinite(userId)) {
      return next(
        badRequestError("The request was invalid.", {
          reason: "invalid_user_id",
          providedValue: req.query.id,
        })
      );
    }

    const userFound = usersRepo.getUserById(userId);

    if (!userFound) {
      return next(
        notFoundError("The requested user was not found.", {
          resourceType: "user",
          resourceId: userId,
        })
      );
    }

    return res.redirect(`/users/${userId}`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;