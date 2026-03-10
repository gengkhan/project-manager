const mongoose = require("mongoose");

// ── Embedding (Vector Store untuk RAG) ──────────────
const embeddingSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    sourceType: {
      type: String,
      required: true,
      enum: [
        "task",
        "event",
        "event_note",
        "division",
        "comment",
        "activity",
        "member",
        "spreadsheet",
        "board",
        "label",
      ],
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    chunkIndex: {
      type: Number,
      default: 0,
    },
    content: {
      type: String,
      required: true,
    },
    embedding: {
      type: [Number],
      required: true,
      validate: {
        validator: function (v) {
          return v.length === 768;
        },
        message: "Embedding harus memiliki 768 dimensi",
      },
    },
    metadata: {
      title: { type: String, default: null },
      status: { type: String, default: null },
      assignees: { type: [String], default: [] },
      priority: { type: String, default: null },
      sourceUrl: { type: String, default: null },
    },
  },
  {
    timestamps: true,
  },
);

// ── Indexes ─────────────────────────────────────────
// Compound unique index untuk upsert
embeddingSchema.index(
  { workspaceId: 1, sourceType: 1, sourceId: 1, chunkIndex: 1 },
  { unique: true },
);
// Untuk batch re-index query
embeddingSchema.index({ workspaceId: 1, updatedAt: 1 });

module.exports = mongoose.model("Embedding", embeddingSchema);
