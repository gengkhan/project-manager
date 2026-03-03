const express = require("express");
const router = express.Router({ mergeParams: true });
const spreadsheetController = require("../controllers/spreadsheet.controller");
const { workspaceMember } = require("../middlewares/rbac");

// All routes already have auth middleware from parent (event.routes.js)
const canEdit = workspaceMember("owner", "admin", "member");
const canView = workspaceMember();

// ── Workbook (FortuneSheet op-based) ─────────────
router.get("/workbook", canView, spreadsheetController.getWorkbook);
router.post("/workbook/ops", canEdit, spreadsheetController.applyOps);

// ── Export ────────────────────────────────────────
router.get("/:sheetId/export/csv", canView, spreadsheetController.exportCSV);
router.get("/export/xlsx", canView, spreadsheetController.exportXLSX);

module.exports = router;
