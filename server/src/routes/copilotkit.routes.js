const express = require("express");
const router = express.Router({ mergeParams: true });
const copilotkitController = require("../controllers/copilotkit.controller");
const auth = require("../middlewares/auth");
const { workspaceMember, requireRole } = require("../middlewares/rbac");
const { aiChatLimiter } = require("../middlewares/rateLimiter");

router.use(auth);

// Copilot endpoint is protected, and limited to workspace members
router.use(requireRole("admin", "owner", "member"));
router.use(aiChatLimiter);

// Runtime handles both GET (e.g. schema/health) and POST (chat); accept all methods
router.all("/", copilotkitController.handleCopilotRequest);

module.exports = router;
