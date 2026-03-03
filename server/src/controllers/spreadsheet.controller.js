const mongoose = require("mongoose");
const SpreadsheetSheetData = require("../models/SpreadsheetSheetData");
const SpreadsheetWorkbook = require("../models/SpreadsheetWorkbook");
const Event = require("../models/Event");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const { applyOp } = require("../utils/applyOp");

// Helper: get Socket.io instance (safe)
const getIO = () => {
  try {
    return require("../config/socket").getIO();
  } catch {
    return null;
  }
};

// Helper: emit to workbook room (per event)
const emitWorkbookEvent = (eventId, event, data) => {
  const io = getIO();
  if (io) {
    io.to(`workbook:${eventId}`).emit(event, data);
  }
};

// Helper: verify event belongs to workspace
const verifyEvent = async (eventId, workspaceId) => {
  const event = await Event.findOne({ _id: eventId, workspaceId });
  return event;
};

// ════════════════════════════════════════════════
// MIGRATION: Legacy SpreadsheetWorkbook → per-sheet docs
// ════════════════════════════════════════════════

async function migrateFromLegacyWorkbook(eventId) {
  const legacy = await SpreadsheetWorkbook.findOne({ eventId }).lean();
  if (!legacy || !Array.isArray(legacy.data) || legacy.data.length === 0) {
    return false;
  }

  // Check if we already have per-sheet docs for this event
  const existingCount = await SpreadsheetSheetData.countDocuments({ eventId });
  if (existingCount > 0) {
    return true; // Already migrated
  }

  // Insert each sheet as its own document
  const docs = legacy.data.map((sheet) => {
    const { _id, ...rest } = sheet; // Remove any stale _id
    return {
      eventId,
      id: sheet.id || sheet.index || String(mongoose.Types.ObjectId()),
      name: sheet.name || "Sheet1",
      celldata: sheet.celldata || [],
      order: sheet.order ?? 0,
      row: sheet.row || 84,
      column: sheet.column || 60,
      status: sheet.status ?? 0,
      config: sheet.config || {},
      ...rest,
    };
  });

  await SpreadsheetSheetData.insertMany(docs, { ordered: false }).catch(
    (err) => {
      // Ignore duplicate key errors (in case of race condition)
      if (err.code !== 11000) throw err;
    },
  );

  return true;
}

// ════════════════════════════════════════════════
// GET WORKBOOK — Returns all sheets for an event
// ════════════════════════════════════════════════

exports.getWorkbook = catchAsync(async (req, res, next) => {
  const { eventId } = req.params;
  const workspace = req.workspace;

  const event = await verifyEvent(eventId, workspace._id);
  if (!event) return next(new AppError("Event tidak ditemukan", 404));

  // Try migration from legacy blob if no per-sheet docs exist
  let sheets = await SpreadsheetSheetData.find({ eventId })
    .sort({ order: 1 })
    .lean();

  if (sheets.length === 0) {
    await migrateFromLegacyWorkbook(eventId);
    sheets = await SpreadsheetSheetData.find({ eventId })
      .sort({ order: 1 })
      .lean();
  }

  // If still no sheets, create a default one
  if (sheets.length === 0) {
    const defaultSheet = await SpreadsheetSheetData.create({
      eventId,
      id: String(new mongoose.Types.ObjectId()),
      name: "Sheet1",
      celldata: [{ r: 0, c: 0, v: null }],
      order: 0,
      row: 84,
      column: 60,
      status: 1,
      config: {},
    });
    sheets = [defaultSheet.toObject()];
  }

  // Clean up MongoDB _id from response (fortune-sheet expects `id` not `_id`)
  const data = sheets.map((s) => {
    const { _id, __v, eventId: _eid, createdAt, updatedAt, ...rest } = s;
    return rest;
  });

  res.status(200).json({
    status: "success",
    data: { workbook: { eventId, data } },
  });
});

// ════════════════════════════════════════════════
// APPLY OPS — Persist ops and broadcast
// ════════════════════════════════════════════════

exports.applyOps = catchAsync(async (req, res, next) => {
  const { eventId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const event = await verifyEvent(eventId, workspace._id);
  if (!event) return next(new AppError("Event tidak ditemukan", 404));

  const { ops } = req.body;
  if (!Array.isArray(ops) || ops.length === 0) {
    return next(new AppError("ops harus berupa array", 400));
  }

  // Apply ops to MongoDB
  await applyOp(SpreadsheetSheetData, eventId, ops);

  // Broadcast to other users in the workbook room
  emitWorkbookEvent(eventId.toString(), "workbook:op", {
    eventId,
    ops,
    userId,
  });

  res.status(200).json({
    status: "success",
    message: "Ops applied",
  });
});

// ════════════════════════════════════════════════
// EXPORT
// ════════════════════════════════════════════════

// GET /sheets/:sheetId/export/csv — Export CSV
exports.exportCSV = catchAsync(async (req, res, next) => {
  const { eventId, sheetId } = req.params;
  const workspace = req.workspace;

  const event = await verifyEvent(eventId, workspace._id);
  if (!event) return next(new AppError("Event tidak ditemukan", 404));

  // Look up from per-sheet docs first
  let sheet = await SpreadsheetSheetData.findOne({
    eventId,
    id: sheetId,
  }).lean();

  // Fallback: try legacy workbook blob
  if (!sheet) {
    const workbook = await SpreadsheetWorkbook.findOne({ eventId }).lean();
    sheet =
      workbook?.data?.find((s) => String(s.id) === String(sheetId)) || null;
  }

  if (!sheet) {
    return next(new AppError("Sheet tidak ditemukan", 404));
  }

  const escapeCSV = (val) => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const matrix = sheetToMatrix(sheet);
  const csv = matrix.map((row) => row.map(escapeCSV).join(",")).join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${encodeURIComponent(sheet.name || "sheet")}.csv"`,
  );
  res.status(200).send("\uFEFF" + csv);
});

// GET /sheets/export/xlsx — Export all sheets to Excel
exports.exportXLSX = catchAsync(async (req, res, next) => {
  const { eventId } = req.params;
  const workspace = req.workspace;

  const event = await verifyEvent(eventId, workspace._id);
  if (!event) return next(new AppError("Event tidak ditemukan", 404));

  let ExcelJS;
  try {
    ExcelJS = require("exceljs");
  } catch {
    return next(
      new AppError(
        "Export Excel tidak tersedia (exceljs belum terinstall)",
        500,
      ),
    );
  }

  // Get sheets from per-sheet docs
  let sheets = await SpreadsheetSheetData.find({ eventId })
    .sort({ order: 1 })
    .lean();

  // Fallback: legacy workbook blob
  if (sheets.length === 0) {
    const workbookDoc = await SpreadsheetWorkbook.findOne({ eventId }).lean();
    sheets = Array.isArray(workbookDoc?.data)
      ? [...workbookDoc.data].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      : [];
  }

  if (sheets.length === 0) {
    return next(new AppError("Tidak ada sheet untuk diexport", 404));
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Project Manager";
  workbook.created = new Date();

  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name || "Sheet");
    const matrix = sheetToMatrix(sheet);

    matrix.forEach((row) => worksheet.addRow(row));

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE8E8E8" },
    };
  }

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${encodeURIComponent(event.title)}_spreadsheet.xlsx"`,
  );

  await workbook.xlsx.write(res);
  res.end();
});

// ── Helpers ─────────────────────────────────────────

function sheetToMatrix(sheet) {
  if (Array.isArray(sheet.data)) {
    return sheet.data.map((row) =>
      Array.isArray(row) ? row.map(extractCellValue) : [],
    );
  }

  const celldata = Array.isArray(sheet.celldata) ? sheet.celldata : [];

  let maxR = 0;
  let maxC = 0;
  for (const c of celldata) {
    if (typeof c?.r === "number") maxR = Math.max(maxR, c.r);
    if (typeof c?.c === "number") maxC = Math.max(maxC, c.c);
  }

  const rowCount = Math.max(
    typeof sheet.row === "number" ? sheet.row : 0,
    maxR + 1,
    1,
  );
  const colCount = Math.max(
    typeof sheet.column === "number" ? sheet.column : 0,
    maxC + 1,
    1,
  );

  const matrix = Array.from({ length: rowCount }, () =>
    Array.from({ length: colCount }, () => ""),
  );

  for (const cell of celldata) {
    if (typeof cell?.r !== "number" || typeof cell?.c !== "number") continue;
    if (cell.r < 0 || cell.c < 0) continue;
    if (cell.r >= rowCount || cell.c >= colCount) continue;
    matrix[cell.r][cell.c] = extractCellValue(cell.v);
  }

  // Trim trailing empty rows
  while (
    matrix.length > 1 &&
    matrix[matrix.length - 1].every((v) => v === "")
  ) {
    matrix.pop();
  }

  return matrix;
}

function extractCellValue(v) {
  if (v === null || v === undefined) return "";
  if (typeof v !== "object") return v;
  if (v.v !== undefined && v.v !== null) return v.v;
  if (v.m !== undefined && v.m !== null) return v.m;
  return "";
}
