var express = require('express');
var router = express.Router();

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const auditLogsRepo = require('../db/auditLogsRepo');
const { safeAuditLog } = require('../utils/auditLogger');
const { authorize } = require('../utils/authz/authorize');
const ABILITIES = require('../utils/authz/abilities');
const usersRepo = require('../db/usersRepo');
const { loadUser } = require('../utils/authz/loaders');

function tailFile(filePath, maxLines = 100) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  return lines.slice(Math.max(0, lines.length - maxLines)).join('\n');
}

// GET /admin/monitor - monitoring page
router.get('/monitor', authorize(ABILITIES.ADMIN_PANEL), function (req, res, next) {
  try {
    res.locals.pageCss = '/stylesheets/pages/admin.css';

    let latestLogs = [];
    try {
      latestLogs = auditLogsRepo.getLatestLogs({ limit: 50 });
    } catch (err) {
      safeAuditLog(req, {
        event_type: 'server_error',
        severity: 'error',
        actor_user_id: req.user.id,
        message: `Failed to retrieve audit logs: ${err.message}`,
        metadata_json: JSON.stringify({ stack: err.stack }),
      });
    }

    // Tail file log (optional)
    const logPath = process.env.LOG_PATH || path.join(__dirname, '..', 'logs', 'app.log');
    let fileLogTail = null;
    try {
      fileLogTail = tailFile(logPath, 120);
    } catch (err) {
      safeAuditLog(req, {
        event_type: 'server_error',
        severity: 'warn',
        actor_user_id: req.user.id,
        message: `Failed to tail log file: ${err.message}`,
        metadata_json: JSON.stringify({ stack: err.stack }),
      });
    }

    // OS Uptime command 
    exec('uptime', { timeout: 1500 }, (err, stdout, stderr) => {
      if (err) {
        safeAuditLog(req, {
          event_type: 'server_error',
          severity: 'warn',
          actor_user_id: req.user.id,
          message: `uptime command failed: ${err.message}`,
          metadata_json: JSON.stringify({ stack: err.stack }),
        })
      }

      const uptimeOutput = err
        ? 'System status unavailable.'
        : (stdout || stderr || '').trim();

      safeAuditLog(req, {
        event_type: 'admin_monitor_view',
        severity: 'info',
        actor_user_id: req.user.id,
        message: 'Admin monitoring page accessed'
      })

      res.render('admin/monitor', {
        uptimeOutput,
        latestLogs,
        fileLogTail,
        searchError: req.query.error || null,
      });
    });
  } catch (err) {
    next(err)
  }
});

router.get('/user-search', authorize(ABILITIES.USER_LIST), function (req, res, next) {
  try {
    const userId = parseInt(req.query.id, 10);
    if (!Number.isFinite(userId)) {
      return res.redirect('/admin/monitor?error=invalid_id');
    }

    const userFound = usersRepo.getUserById(userId);
    if (!userFound) {
      return res.redirect('/admin/monitor?error=user_not_found');
    }

    res.redirect(`/users/${userId}`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
