const mongoose = require("mongoose");

// ── Activity Log ────────────────────────────────────
const activityLogSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        // Task
        "task.created",
        "task.updated",
        "task.moved",
        "task.assigned",
        "task.unassigned",
        "task.priority_changed",
        "task.duedate_changed",
        "task.deleted",
        "task.archived",
        "task.unarchived",
        "task.subtask_added",
        "task.subtask_removed",
        "task.subtask_completed",
        "task.attachment_added",
        "task.attachment_removed",
        // Event
        "event.created",
        "event.updated",
        "event.deleted",
        "event.participant_added",
        "event.participant_removed",
        "event.status_changed",
        // Spreadsheet
        "spreadsheet.sheet_created",
        "spreadsheet.sheet_deleted",
        "spreadsheet.sheet_renamed",
        "spreadsheet.column_added",
        "spreadsheet.column_deleted",
        "spreadsheet.column_renamed",
        "spreadsheet.cell_updated",
        // Workspace
        "workspace.updated",
        "workspace.archived",
        "workspace.unarchived",
        "workspace.member_invited",
        "workspace.member_joined",
        "workspace.member_left",
        "workspace.member_removed",
        "workspace.role_changed",
        "workspace.ownership_transferred",
      ],
    },
    targetType: {
      type: String,
      required: true,
      enum: ["task", "event", "spreadsheet", "workspace", "board"],
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    targetName: {
      type: String,
      default: "",
    },
    details: {
      field: { type: String, default: null },
      newValue: { type: String, default: null },
      contextType: { type: String, default: null },
      contextId: { type: mongoose.Schema.Types.ObjectId, default: null },
      contextName: { type: String, default: null },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// ── Indexes ─────────────────────────────────────────
// Query utama: activity log per workspace
activityLogSchema.index({ workspaceId: 1, createdAt: -1 });
// Query per objek: detail task/event
activityLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
// Query per user
activityLogSchema.index({ actorId: 1, createdAt: -1 });
// TTL index: auto-cleanup setelah 1 tahun
activityLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 365 * 24 * 60 * 60 },
);

module.exports = mongoose.model("ActivityLog", activityLogSchema);
