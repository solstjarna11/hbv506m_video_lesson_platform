var express = require("express");
var router = express.Router();

const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const { accessLogPath } = require('../utils/logging/fileStreams');


const auditLogsRepo = require("../db/auditLogsRepo");
const { safeAuditLog } = require("../utils/auditLogger");
const { authorize } = require("../utils/authz/authorize");
const ABILITIES = require("../utils/authz/abilities");
const usersRepo = require("../db/usersRepo");
const { loadUser } = require("../utils/authz/loaders");

function tailFile(filePath, maxLines = 100) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  return lines.slice(Math.max(0, lines.length - maxLines)).join("\n");
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
      severity: req.query.severity || "",
      event_type: req.query.event_type || "",
      actor_user_id: Number.isFinite(parseInt(req.query.actor_user_id, 10))
        ? parseInt(req.query.actor_user_id, 10)
        : null,
      q: req.query.q || "",
      from: req.query.from || "",
      to: req.query.to || "",
      limit: Number.isFinite(parseInt(req.query.limit, 10))
        ? parseInt(req.query.limit, 10)
        : 50,
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
