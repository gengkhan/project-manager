const ActivityLog = require("../models/ActivityLog");
const catchAsync = require("../utils/catchAsync");

// ──────────────────────────────────────────────
// GET /api/workspaces/:id/activity — Activity log workspace
// ──────────────────────────────────────────────
exports.getWorkspaceActivity = catchAsync(async (req, res) => {
  const { id: workspaceId } = req.params;
  const {
    page = 1,
    limit = 20,
    actorId,
    action,
    targetType,
    startDate,
    endDate,
  } = req.query;

  const filter = { workspaceId };

  if (actorId) filter.actorId = actorId;
  if (action) filter.action = action;
  if (targetType) filter.targetType = targetType;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [logs, total] = await Promise.all([
    ActivityLog.find(filter)
      .populate("actorId", "name email avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    ActivityLog.countDocuments(filter),
  ]);

  res.status(200).json({
    status: "success",
    data: {
      activities: logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    },
  });
});

// ──────────────────────────────────────────────
// GET /api/workspaces/:id/tasks/:taskId/activity
// ──────────────────────────────────────────────
exports.getTaskActivity = catchAsync(async (req, res) => {
  const { taskId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const filter = {
    targetType: "task",
    targetId: taskId,
  };

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [logs, total] = await Promise.all([
    ActivityLog.find(filter)
      .populate("actorId", "name email avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    ActivityLog.countDocuments(filter),
  ]);

  res.status(200).json({
    status: "success",
    data: {
      activities: logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    },
  });
});

// ──────────────────────────────────────────────
// GET /api/workspaces/:id/events/:eventId/activity
// ──────────────────────────────────────────────
exports.getEventActivity = catchAsync(async (req, res) => {
  const { id: workspaceId, eventId } = req.params;
  const { page = 1, limit = 20, targetType: filterType } = req.query;

  // Event activity includes both event and its spreadsheet logs
  const filter = {
    workspaceId,
    $or: [
      { targetType: "event", targetId: eventId },
      { targetType: "spreadsheet", "details.contextId": eventId },
    ],
  };

  // Optional: filter only event or spreadsheet
  if (filterType === "event") {
    delete filter.$or;
    filter.targetType = "event";
    filter.targetId = eventId;
  } else if (filterType === "spreadsheet") {
    delete filter.$or;
    filter.targetType = "spreadsheet";
    filter["details.contextId"] = eventId;
  }

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [logs, total] = await Promise.all([
    ActivityLog.find(filter)
      .populate("actorId", "name email avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    ActivityLog.countDocuments(filter),
  ]);

  res.status(200).json({
    status: "success",
    data: {
      activities: logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    },
  });
});

// ──────────────────────────────────────────────
// GET /api/workspaces/:id/members/:userId/activity
// ──────────────────────────────────────────────
exports.getUserActivity = catchAsync(async (req, res) => {
  const { id: workspaceId, userId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const filter = {
    workspaceId,
    actorId: userId,
  };

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [logs, total] = await Promise.all([
    ActivityLog.find(filter)
      .populate("actorId", "name email avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    ActivityLog.countDocuments(filter),
  ]);

  res.status(200).json({
    status: "success",
    data: {
      activities: logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    },
  });
});
