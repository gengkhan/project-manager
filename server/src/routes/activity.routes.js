const express = require("express");
const router = express.Router({ mergeParams: true });
const activityController = require("../controllers/activity.controller");
const auth = require("../middlewares/auth");
const { workspaceMember } = require("../middlewares/rbac");

// Semua route memerlukan autentikasi + membership workspace
// Semua member (termasuk guest) bisa melihat activity log
router.use(auth);

// ── Workspace Activity ──────────────────────────────
router.get("/", workspaceMember(), activityController.getWorkspaceActivity);

// ── Task Activity ───────────────────────────────────
router.get(
  "/tasks/:taskId",
  workspaceMember(),
  activityController.getTaskActivity,
);

// ── Event Activity ──────────────────────────────────
router.get(
  "/events/:eventId",
  workspaceMember(),
  activityController.getEventActivity,
);

// ── User Activity ───────────────────────────────────
router.get(
  "/members/:userId",
  workspaceMember(),
  activityController.getUserActivity,
);

module.exports = router;
