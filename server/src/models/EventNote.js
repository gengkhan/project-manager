const mongoose = require("mongoose");

const eventNoteSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: [200, "Judul catatan maksimal 200 karakter"],
      default: "",
    },
    content: {
      type: String,
      required: [true, "Isi catatan harus diisi"],
    },
    mentions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        name: String,
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// ── Indexes ─────────────────────────────────────────
eventNoteSchema.index({ eventId: 1, isDeleted: 1, createdAt: -1 });
eventNoteSchema.index({ workspaceId: 1, createdAt: -1 });

// ── Pre-find: exclude soft-deleted ──────────────────
eventNoteSchema.pre(/^find/, function (next) {
  if (this.getQuery().isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

module.exports = mongoose.model("EventNote", eventNoteSchema);
