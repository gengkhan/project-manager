const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // null for system generated notifications
    },
    type: {
      type: String,
      required: true,
      enum: [
        "mention",
        "assign_task",
        "due_date",
        "new_comment",
        "new_member",
        "event_start",
        "task_update",
      ],
    },
    targetType: {
      type: String,
      required: true,
      enum: ["task", "event", "workspace", "comment"],
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// ── Indexes ─────────────────────────────────────────
// Query for listing a user's notifications, newest first
notificationSchema.index({ recipientId: 1, createdAt: -1 });

// Query for counting unread notifications
notificationSchema.index({ recipientId: 1, isRead: 1 });

module.exports = mongoose.model("Notification", notificationSchema);
