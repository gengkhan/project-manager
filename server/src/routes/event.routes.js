const express = require("express");
const router = express.Router({ mergeParams: true });
const eventController = require("../controllers/event.controller");
const auth = require("../middlewares/auth");
const { workspaceMember } = require("../middlewares/rbac");

// Semua route memerlukan autentikasi + membership workspace
router.use(auth);

// ── List & Create ───────────────────────────────────
router.get("/", workspaceMember(), eventController.listEvents);
router.post(
  "/",
  workspaceMember("owner", "admin", "member"),
  eventController.createEvent,
);

// ── Event detail ────────────────────────────────────
router.get("/:eventId", workspaceMember(), eventController.getEvent);
router.put(
  "/:eventId",
  workspaceMember("owner", "admin", "member"),
  eventController.updateEvent,
);
router.delete(
  "/:eventId",
  workspaceMember("owner", "admin", "member"),
  eventController.deleteEvent,
);

// ── Event Tasks ─────────────────────────────────────
router.get("/:eventId/tasks", workspaceMember(), eventController.getEventTasks);

// ── Spreadsheet (sub-router) ────────────────────────
router.use("/:eventId/sheets", require("./spreadsheet.routes"));

module.exports = router;

