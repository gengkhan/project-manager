const express = require("express");
const router = express.Router({ mergeParams: true });
const embeddingController = require("../controllers/embedding.controller");
const auth = require("../middlewares/auth");
const { requireRole } = require("../middlewares/rbac");

// Semua endpoint memerlukan autentikasi + workspace membership + Admin+
router.use(auth);
router.use(requireRole("owner", "admin"));

// POST /api/workspaces/:id/embeddings/sync — Trigger manual re-index
router.post("/sync", embeddingController.syncEmbeddings);

// GET /api/workspaces/:id/embeddings/stats — Statistik embeddings
router.get("/stats", embeddingController.getEmbeddingStats);

module.exports = router;
