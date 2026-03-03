const mongoose = require("mongoose");

/**
 * SpreadsheetSheetData
 *
 * Stores each fortune-sheet sheet as its own document,
 * following the fortune-sheet collaboration pattern (backend-demo).
 *
 * One document per sheet, keyed by { eventId, id }.
 * Cell data is stored in `celldata` array format (sparse).
 */
const spreadsheetSheetDataSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },

    // fortune-sheet sheet id (string)
    id: {
      type: String,
      required: true,
    },

    name: {
      type: String,
      default: "Sheet1",
    },

    // Sparse cell data: [{ r, c, v }]
    celldata: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },

    order: {
      type: Number,
      default: 0,
    },

    row: {
      type: Number,
      default: 84,
    },

    column: {
      type: Number,
      default: 60,
    },

    // Active sheet (1) or not (0)
    status: {
      type: Number,
      default: 0,
    },

    // All other fortune-sheet config (columnlen, rowlen, merge, etc.)
    config: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Additional fortune-sheet properties stored as-is
    pivotTable: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    isPivotTable: {
      type: Boolean,
      default: false,
    },
    luckysheet_conditionformat_save: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
    },
    calcChain: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
    },
    defaultColWidth: {
      type: Number,
      default: undefined,
    },
    defaultRowHeight: {
      type: Number,
      default: undefined,
    },
    showGridLines: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
    },
    images: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
    },
    dataVerification: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
    },
    hyperlink: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
    },
    frozen: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
    },
    filter: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
    },
    filter_select: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
    },
    zoomRatio: {
      type: Number,
      default: undefined,
    },
    color: {
      type: String,
      default: undefined,
    },
    hide: {
      type: Number,
      default: undefined,
    },
  },
  {
    timestamps: true,
    strict: false, // Allow any additional fortune-sheet properties
  },
);

// Compound unique index: one sheet id per event
spreadsheetSheetDataSchema.index({ eventId: 1, id: 1 }, { unique: true });
spreadsheetSheetDataSchema.index({ eventId: 1, order: 1 });

module.exports = mongoose.model(
  "SpreadsheetSheetData",
  spreadsheetSheetDataSchema,
);
