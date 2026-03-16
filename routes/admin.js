var express = require("express");
var router = express.Router();
const os = require('os');
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const { accessLogPath } = require("../utils/logging/fileStreams");

const auditLogsRepo = require("../db/auditLogsRepo");
const { safeAuditLog } = require("../utils/auditLogger");
const { authorize } = require("../utils/authz/authorize");
const ABILITIES = require("../utils/authz/abilities");
const usersRepo = require("../db/usersRepo");
const { loadUser } = require("../utils/authz/loaders");

function sanitizeQueryString(value, maxLength = 100) {
  if (typeof value !== "string") return "";

  return value
    .trim()
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, maxLength);
}

function sanitizeQueryInt(value, fallback = null, min = 0, max = 1000) {
  const parsed = parseInt(value, 10);

  if (!Number.isFinite(parsed)) return fallback;

  if (parsed < min) return min;
  if (parsed > max) return max;

  return parsed;
}

function tailFile(filePath, maxLines = 100, maxBytes = 64 * 1024) {
  if (!fs.existsSync(filePath)) return null;

  const stats = fs.statSync(filePath);
  const start = Math.max(0, stats.size - maxBytes);
  const length = stats.size - start;

  const fd = fs.openSync(filePath, "r");

  try {
    const buffer = Buffer.alloc(length);
    fs.readSync(fd, buffer, 0, length, start);

    const content = buffer.toString("utf8");
    const lines = content.split("\n");

    return lines.slice(-maxLines).join("\n");
  } finally {
    fs.closeSync(fd);
  }
}

// GET /admin/monitor - monitoring page
router.get(
  "/monitor",
  authorize(ABILITIES.ADMIN_PANEL),
  function (req, res, next) {
    res.locals.pageCss = "/stylesheets/pages/admin.css";

    safeAuditLog(req, {
      event_type: "admin_monitor_view",
      severity: "info",
      actor_user_id: req.user.id,
      message: "Admin monitoring page accessed",
    });

    // Latest audit logs from DB
    let latestLogs = [];

    // dynamic query search filters
    const filters = {
      severity: sanitizeQueryString(req.query.severity, 30),
      event_type: sanitizeQueryString(req.query.event_type, 50),

      actor_user_id: sanitizeQueryInt(
        req.query.actor_user_id,
        null,
        1,
        1000000,
      ),

      q: sanitizeQueryString(req.query.q, 100),

      from: sanitizeQueryString(req.query.from, 30),
      to: sanitizeQueryString(req.query.to, 30),

      limit: sanitizeQueryInt(req.query.limit, 50, 1, 200),
    };
    try {
      latestLogs = auditLogsRepo.searchLogs(filters);
    } catch (e) {
      // If DB logging isn't used yet, don't crash the page
      latestLogs = [];
    }

    // Tail file log (optional)
    const logPath = accessLogPath;
    const fileLogTail = tailFile(logPath, 120);

    // OS Uptime command
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
        filters,
      });
    });
  },
);

router.get(
  "/user-search",
  authorize(ABILITIES.USER_LIST),
  function (req, res, next) {
    try {
      const userId = parseInt(req.query.id, 10);
      if (!Number.isFinite(userId))
        return res.status(400).send("Invalid user ID");

      const userFound = usersRepo.getUserById(userId);
      if (!userFound) return res.status(404).send("User not found");

      res.redirect(`/users/${userId}`);
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
