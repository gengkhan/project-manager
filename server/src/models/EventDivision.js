const mongoose = require("mongoose");

// ── Event Division ──────────────────────────────────
const eventDivisionSchema = new mongoose.Schema(
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
    name: {
      type: String,
      required: [true, "Nama divisi harus diisi"],
      trim: true,
      maxlength: [100, "Nama divisi maksimal 100 karakter"],
    },
    description: {
      type: String,
      default: "",
      maxlength: [500, "Deskripsi divisi maksimal 500 karakter"],
    },
    color: {
      type: String,
      default: null,
      match: [
        /^#([0-9A-Fa-f]{6})$/,
        "Format warna harus hex (contoh: #FF5733)",
      ],
    },
    members: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        role: {
          type: String,
          enum: {
            values: ["leader", "member"],
            message: "Role harus salah satu dari: leader, member",
          },
          default: "member",
        },
      },
    ],
    order: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
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
eventDivisionSchema.index({ eventId: 1, isDeleted: 1 });
eventDivisionSchema.index({ workspaceId: 1, eventId: 1 });
eventDivisionSchema.index({ "members.userId": 1 });

// ── Pre-find: exclude soft-deleted ──────────────────
eventDivisionSchema.pre(/^find/, function (next) {
  if (this.getQuery().isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

module.exports = mongoose.model("EventDivision", eventDivisionSchema);
