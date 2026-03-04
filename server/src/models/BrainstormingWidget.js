const mongoose = require("mongoose");

// ── Brainstorming Widget ────────────────────────────
const brainstormingWidgetSchema = new mongoose.Schema(
  {
    boardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BrainstormingBoard",
      required: true,
    },
    type: {
      type: String,
      enum: {
        values: ["task", "mindmap", "diagram", "image", "text"],
        message:
          "Tipe widget harus salah satu dari: task, mindmap, image, text",
      },
      required: [true, "Tipe widget harus diisi"],
    },
    x: {
      type: Number,
      default: 0,
    },
    y: {
      type: Number,
      default: 0,
    },
    width: {
      type: Number,
      default: 300,
    },
    height: {
      type: Number,
      default: 200,
    },
    zIndex: {
      type: Number,
      default: 0,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    isCollapsed: {
      type: Boolean,
      default: false,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// ── Indexes ─────────────────────────────────────────
brainstormingWidgetSchema.index({ boardId: 1 });

module.exports = mongoose.model(
  "BrainstormingWidget",
  brainstormingWidgetSchema,
);
