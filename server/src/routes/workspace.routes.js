const express = require("express");
const router = express.Router();
const workspaceController = require("../controllers/workspace.controller");
const auth = require("../middlewares/auth");
const { workspaceMember, canManageMember } = require("../middlewares/rbac");

// Semua route memerlukan autentikasi
router.use(auth);

// ── Workspace CRUD ──────────────────────────────────────
router.get("/", workspaceController.listWorkspaces);
router.post("/", workspaceController.createWorkspace);

// ── Join via link / invitation (harus di atas /:id routes) ──
router.post("/join/invite", workspaceController.joinViaInvitation);
router.post("/join/:inviteCode", workspaceController.joinViaLink);

// ── Workspace detail & update ───────────────────────────
router.get("/:id", workspaceMember(), workspaceController.getWorkspace);
router.put(
  "/:id",
  workspaceMember("owner", "admin"),
  workspaceController.updateWorkspace,
);
router.delete(
  "/:id",
  workspaceMember("owner"),
  workspaceController.deleteWorkspace,
);

// ── Archive / Unarchive ─────────────────────────────────
router.post(
  "/:id/archive",
  workspaceMember("owner", "admin"),
  workspaceController.archiveWorkspace,
);
router.post(
  "/:id/unarchive",
  workspaceMember("owner", "admin"),
  workspaceController.unarchiveWorkspace,
);

// ── Members ─────────────────────────────────────────────
router.get(
  "/:id/members/search",
  workspaceMember(),
  workspaceController.searchMembers,
);
router.get("/:id/members", workspaceMember(), workspaceController.listMembers);

// ── Invite ──────────────────────────────────────────────
router.post(
  "/:id/invite",
  workspaceMember("owner", "admin"),
  workspaceController.inviteMembers,
);
router.post(
  "/:id/invite-link/regenerate",
  workspaceMember("owner", "admin"),
  workspaceController.regenerateInviteLink,
);

// ── Member profile & stats ───────────────────────────────
router.get(
  "/:id/members/:userId/profile",
  workspaceMember(),
  workspaceController.getMemberProfile,
);
router.get(
  "/:id/members/:userId/stats",
  workspaceMember(),
  workspaceController.getMemberStats,
);

// ── Member management ───────────────────────────────────
router.put(
  "/:id/members/:userId/role",
  workspaceMember("owner", "admin"),
  canManageMember,
  workspaceController.changeMemberRole,
);
router.delete(
  "/:id/members/:userId",
  workspaceMember("owner", "admin"),
  canManageMember,
  workspaceController.removeMember,
);

// ── Leave & Transfer ────────────────────────────────────
router.post(
  "/:id/leave",
  workspaceMember(),
  workspaceController.leaveWorkspace,
);
router.post(
  "/:id/transfer-ownership",
  workspaceMember("owner"),
  workspaceController.transferOwnership,
);

module.exports = router;
