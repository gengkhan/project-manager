const mongoose = require("mongoose");
const Task = require("../models/Task");
const WorkspaceLabel = require("../models/WorkspaceLabel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const {
  hasCircularDependency,
  getDoneColumnIds,
  isValidColumn,
  getNextColumnOrder,
} = require("../services/task.service");
const ActivityLogService = require("../services/activityLog.service");

// Helper: get Socket.io instance (safe)
const getIO = () => {
  try {
    return require("../config/socket").getIO();
  } catch {
    return null;
  }
};

// Helper: emit task event to workspace room
const emitTaskEvent = (workspaceId, event, data) => {
  const io = getIO();
  if (io) {
    io.to(`workspace:${workspaceId}`).emit(event, data);
  }
};

// ──────────────────────────────────────────────
// GET /api/workspaces/:id/tasks — Daftar task
// ──────────────────────────────────────────────
exports.listTasks = catchAsync(async (req, res) => {
  const { id: workspaceId } = req.params;
  const {
    columnId,
    assignee,
    label,
    priority,
    eventId,
    dueDateFrom,
    dueDateTo,
    keyword,
    isArchived,
    sortBy = "createdAt",
    sortOrder = "desc",
    page = 1,
    limit = 50,
  } = req.query;

  // Build filter
  const filter = { workspaceId };

  if (columnId) filter.columnId = columnId;
  if (assignee) filter.assignees = assignee;
  if (label) filter.labels = label;
  if (priority) filter.priority = priority;
  if (eventId) filter.eventId = eventId;

  // Archive filter (default: non-archived)
  if (isArchived === "true") {
    filter.isArchived = true;
  } else if (isArchived === "all") {
    // Show all
  } else {
    filter.isArchived = { $ne: true };
  }

  // Due date range
  if (dueDateFrom || dueDateTo) {
    filter.dueDate = {};
    if (dueDateFrom) filter.dueDate.$gte = new Date(dueDateFrom);
    if (dueDateTo) filter.dueDate.$lte = new Date(dueDateTo);
  }

  // Keyword search (title)
  if (keyword) {
    filter.title = { $regex: keyword, $options: "i" };
  }

  // Sort
  const allowedSortFields = [
    "createdAt",
    "updatedAt",
    "dueDate",
    "priority",
    "title",
    "columnOrder",
  ];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
  const sort = { [sortField]: sortOrder === "asc" ? 1 : -1 };

  // Pagination
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .populate("assignees", "name email avatar")
      .populate("watchers", "name email avatar")
      .populate("labels", "name color")
      .populate("createdBy", "name email avatar")
      .populate("blockedBy", "title columnId isArchived")
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Task.countDocuments(filter),
  ]);

  res.status(200).json({
    status: "success",
    data: {
      tasks,
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
// POST /api/workspaces/:id/tasks — Buat task
// ──────────────────────────────────────────────
exports.createTask = catchAsync(async (req, res, next) => {
  const workspace = req.workspace;
  const userId = req.user.id;

  const {
    title,
    description,
    columnId,
    assignees,
    startDate,
    dueDate,
    priority,
    labels,
    eventId,
    subtasks,
    blockedBy,
  } = req.body;

  if (!title || !title.trim()) {
    return next(new AppError("Judul task harus diisi", 400));
  }

  // Validate columnId
  const targetColumnId = columnId || workspace.kanbanColumns[0]?._id;
  if (!targetColumnId || !isValidColumn(workspace, targetColumnId)) {
    return next(new AppError("Kolom kanban tidak valid", 400));
  }

  // Validate labels exist in workspace
  if (labels && labels.length > 0) {
    const validLabels = await WorkspaceLabel.find({
      _id: { $in: labels },
      workspaceId: workspace._id,
    }).select("_id");
    if (validLabels.length !== labels.length) {
      return next(
        new AppError("Beberapa label tidak ditemukan di workspace ini", 400),
      );
    }
  }

  // Validate blockedBy (no circular — new task has no dependents yet, just validate they exist)
  if (blockedBy && blockedBy.length > 0) {
    const validDeps = await Task.find({
      _id: { $in: blockedBy },
      workspaceId: workspace._id,
    }).select("_id");
    if (validDeps.length !== blockedBy.length) {
      return next(
        new AppError("Beberapa dependency task tidak ditemukan", 400),
      );
    }
  }

  // Calculate order
  const columnOrder = await getNextColumnOrder(workspace._id, targetColumnId);

  // Process subtasks with order
  const processedSubtasks = subtasks
    ? subtasks.map((st, idx) => ({
        title: st.title,
        isCompleted: st.isCompleted || false,
        assignee: st.assignee || null,
        order: idx,
      }))
    : [];

  const task = await Task.create({
    workspaceId: workspace._id,
    title: title.trim(),
    description: description || "",
    columnId: targetColumnId,
    columnOrder,
    assignees: assignees || [],
    watchers: [userId], // Creator auto-watches
    startDate: startDate || null,
    dueDate: dueDate || null,
    priority: priority || "medium",
    labels: labels || [],
    eventId: eventId || null,
    subtasks: processedSubtasks,
    blockedBy: blockedBy || [],
    createdBy: userId,
  });

  // Populate for response
  const populatedTask = await Task.findById(task._id)
    .populate("assignees", "name email avatar")
    .populate("watchers", "name email avatar")
    .populate("labels", "name color")
    .populate("createdBy", "name email avatar")
    .populate("blockedBy", "title columnId")
    .lean();

  // Emit Socket.io event
  emitTaskEvent(workspace._id.toString(), "task:created", {
    task: populatedTask,
    userId,
  });

  // Activity log
  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "task.created",
    targetType: "task",
    targetId: task._id,
    targetName: task.title,
  });

  res.status(201).json({
    status: "success",
    data: { task: populatedTask },
  });
});

// ──────────────────────────────────────────────
// GET /api/workspaces/:id/tasks/:taskId — Detail
// ──────────────────────────────────────────────
exports.getTask = catchAsync(async (req, res, next) => {
  const { taskId } = req.params;
  const workspace = req.workspace;

  const task = await Task.findOne({
    _id: taskId,
    workspaceId: workspace._id,
  })
    .populate("assignees", "name email avatar")
    .populate("watchers", "name email avatar")
    .populate("labels", "name color")
    .populate("createdBy", "name email avatar")
    .populate("blockedBy", "title columnId isArchived")
    .populate("subtasks.assignee", "name email avatar")
    .populate("attachments.uploadedBy", "name email avatar")
    .lean();

  if (!task) {
    return next(new AppError("Task tidak ditemukan", 404));
  }

  res.status(200).json({
    status: "success",
    data: { task },
  });
});

// ──────────────────────────────────────────────
// PUT /api/workspaces/:id/tasks/:taskId — Update
// ──────────────────────────────────────────────
exports.updateTask = catchAsync(async (req, res, next) => {
  const { taskId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const task = await Task.findOne({
    _id: taskId,
    workspaceId: workspace._id,
  });

  if (!task) {
    return next(new AppError("Task tidak ditemukan", 404));
  }

  const {
    title,
    description,
    columnId,
    columnOrder,
    assignees,
    startDate,
    dueDate,
    priority,
    labels,
    eventId,
    subtasks,
    blockedBy,
  } = req.body;

  // Track if column changed (for "moved" event)
  const oldColumnId = task.columnId?.toString();
  let columnChanged = false;

  // Title
  if (title !== undefined) {
    if (!title.trim()) {
      return next(new AppError("Judul task tidak boleh kosong", 400));
    }
    task.title = title.trim();
  }

  // Description
  if (description !== undefined) {
    task.description = description;
  }

  // Column (status change)
  if (columnId !== undefined) {
    if (!isValidColumn(workspace, columnId)) {
      return next(new AppError("Kolom kanban tidak valid", 400));
    }
    if (columnId.toString() !== oldColumnId) {
      task.columnId = columnId;
      columnChanged = true;
      // If moving to a new column without explicit order, put at end
      if (columnOrder === undefined) {
        task.columnOrder = await getNextColumnOrder(workspace._id, columnId);
      }
    }
  }

  // Column order
  if (columnOrder !== undefined) {
    task.columnOrder = columnOrder;
  }

  // Assignees
  if (assignees !== undefined) {
    task.assignees = assignees;
  }

  // Dates
  if (startDate !== undefined) task.startDate = startDate || null;
  if (dueDate !== undefined) task.dueDate = dueDate || null;

  // Priority
  if (priority !== undefined) {
    if (!["low", "medium", "high", "critical"].includes(priority)) {
      return next(new AppError("Prioritas tidak valid", 400));
    }
    task.priority = priority;
  }

  // Labels
  if (labels !== undefined) {
    if (labels.length > 0) {
      const validLabels = await WorkspaceLabel.find({
        _id: { $in: labels },
        workspaceId: workspace._id,
      }).select("_id");
      if (validLabels.length !== labels.length) {
        return next(new AppError("Beberapa label tidak ditemukan", 400));
      }
    }
    task.labels = labels;
  }

  // Event
  if (eventId !== undefined) {
    task.eventId = eventId || null;
  }

  // Subtasks
  if (subtasks !== undefined) {
    task.subtasks = subtasks.map((st, idx) => ({
      _id: st._id || new mongoose.Types.ObjectId(),
      title: st.title,
      isCompleted: st.isCompleted || false,
      assignee: st.assignee || null,
      order: st.order !== undefined ? st.order : idx,
    }));
  }

  // Dependencies
  if (blockedBy !== undefined) {
    if (blockedBy.length > 0) {
      // Validate they exist in same workspace
      const validDeps = await Task.find({
        _id: { $in: blockedBy },
        workspaceId: workspace._id,
      }).select("_id");
      if (validDeps.length !== blockedBy.length) {
        return next(
          new AppError("Beberapa dependency task tidak ditemukan", 400),
        );
      }

      // Check circular dependency
      const isCircular = await hasCircularDependency(taskId, blockedBy);
      if (isCircular) {
        return next(new AppError("Circular dependency terdeteksi", 400));
      }
    }
    task.blockedBy = blockedBy;
  }

  await task.save();

  // Populate for response
  const populatedTask = await Task.findById(task._id)
    .populate("assignees", "name email avatar")
    .populate("watchers", "name email avatar")
    .populate("labels", "name color")
    .populate("createdBy", "name email avatar")
    .populate("blockedBy", "title columnId")
    .lean();

  // Emit Socket.io event
  const eventName = columnChanged ? "task:moved" : "task:updated";
  emitTaskEvent(workspace._id.toString(), eventName, {
    task: populatedTask,
    userId,
    ...(columnChanged && {
      fromColumnId: oldColumnId,
      toColumnId: columnId.toString(),
    }),
  });

  // Activity log — determine what changed
  if (columnChanged) {
    const newColName =
      workspace.kanbanColumns?.find(
        (c) => c._id.toString() === columnId.toString(),
      )?.name || columnId.toString();
    ActivityLogService.log({
      workspaceId: workspace._id,
      actorId: userId,
      action: "task.moved",
      targetType: "task",
      targetId: task._id,
      targetName: task.title,
      details: { field: "columnId", newValue: newColName },
    });
  } else {
    // Generic update log
    const changedFields = [];
    if (title !== undefined) changedFields.push("title");
    if (description !== undefined) changedFields.push("description");
    if (priority !== undefined) changedFields.push("priority");
    if (dueDate !== undefined) changedFields.push("dueDate");
    if (assignees !== undefined) changedFields.push("assignees");
    if (labels !== undefined) changedFields.push("labels");
    if (subtasks !== undefined) changedFields.push("subtasks");
    if (changedFields.length > 0) {
      ActivityLogService.log({
        workspaceId: workspace._id,
        actorId: userId,
        action: "task.updated",
        targetType: "task",
        targetId: task._id,
        targetName: task.title,
        details: { field: changedFields.join(", ") },
      });
    }
  }

  res.status(200).json({
    status: "success",
    data: { task: populatedTask },
  });
});

// ──────────────────────────────────────────────
// DELETE /api/workspaces/:id/tasks/:taskId — Soft delete
// ──────────────────────────────────────────────
exports.deleteTask = catchAsync(async (req, res, next) => {
  const { taskId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;
  const memberRole = req.workspaceMember.role;

  const task = await Task.findOne({
    _id: taskId,
    workspaceId: workspace._id,
  });

  if (!task) {
    return next(new AppError("Task tidak ditemukan", 404));
  }

  // Permission check: creator, admin, or owner
  const isCreator = task.createdBy.toString() === userId;
  const isAdminOrOwner = ["owner", "admin"].includes(memberRole);

  if (!isCreator && !isAdminOrOwner) {
    return next(
      new AppError("Kamu tidak memiliki izin untuk menghapus task ini", 403),
    );
  }

  task.isDeleted = true;
  task.deletedAt = new Date();
  await task.save();

  // Emit Socket.io event
  emitTaskEvent(workspace._id.toString(), "task:deleted", {
    taskId: task._id,
    userId,
  });

  // Activity log
  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "task.deleted",
    targetType: "task",
    targetId: task._id,
    targetName: task.title,
  });

  res.status(200).json({
    status: "success",
    message: "Task berhasil dihapus",
  });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/tasks/:taskId/archive
// ──────────────────────────────────────────────
exports.archiveTask = catchAsync(async (req, res, next) => {
  const { taskId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const task = await Task.findOne({
    _id: taskId,
    workspaceId: workspace._id,
  });

  if (!task) {
    return next(new AppError("Task tidak ditemukan", 404));
  }

  if (task.isArchived) {
    return next(new AppError("Task sudah diarsipkan", 400));
  }

  task.isArchived = true;
  task.archivedAt = new Date();
  await task.save();

  emitTaskEvent(workspace._id.toString(), "task:archived", {
    taskId: task._id,
    isArchived: true,
    userId,
  });

  // Activity log
  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "task.archived",
    targetType: "task",
    targetId: task._id,
    targetName: task.title,
  });

  res.status(200).json({
    status: "success",
    message: "Task berhasil diarsipkan",
  });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/tasks/:taskId/unarchive
// ──────────────────────────────────────────────
exports.unarchiveTask = catchAsync(async (req, res, next) => {
  const { taskId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const task = await Task.findOne({
    _id: taskId,
    workspaceId: workspace._id,
  });

  if (!task) {
    return next(new AppError("Task tidak ditemukan", 404));
  }

  if (!task.isArchived) {
    return next(new AppError("Task tidak sedang diarsipkan", 400));
  }

  task.isArchived = false;
  task.archivedAt = null;
  await task.save();

  emitTaskEvent(workspace._id.toString(), "task:archived", {
    taskId: task._id,
    isArchived: false,
    userId,
  });

  // Activity log
  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "task.unarchived",
    targetType: "task",
    targetId: task._id,
    targetName: task.title,
  });

  res.status(200).json({
    status: "success",
    message: "Task berhasil diunarsipkan",
  });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/tasks/archive-done — Bulk
// ──────────────────────────────────────────────
exports.bulkArchiveDone = catchAsync(async (req, res) => {
  const workspace = req.workspace;
  const userId = req.user.id;

  const doneColumnIds = getDoneColumnIds(workspace);

  if (doneColumnIds.length === 0) {
    return res.status(200).json({
      status: "success",
      data: { archivedCount: 0 },
      message: "Tidak ada kolom 'Done' ditemukan",
    });
  }

  const result = await Task.updateMany(
    {
      workspaceId: workspace._id,
      columnId: { $in: doneColumnIds },
      isArchived: { $ne: true },
      isDeleted: { $ne: true },
    },
    {
      $set: { isArchived: true, archivedAt: new Date() },
    },
  );

  emitTaskEvent(workspace._id.toString(), "task:bulk-archived", {
    columnIds: doneColumnIds.map((id) => id.toString()),
    archivedCount: result.modifiedCount,
    userId,
  });

  res.status(200).json({
    status: "success",
    data: { archivedCount: result.modifiedCount },
    message: `${result.modifiedCount} task berhasil diarsipkan`,
  });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/tasks/:taskId/watch
// ──────────────────────────────────────────────
exports.watchTask = catchAsync(async (req, res, next) => {
  const { taskId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const task = await Task.findOne({
    _id: taskId,
    workspaceId: workspace._id,
  });

  if (!task) {
    return next(new AppError("Task tidak ditemukan", 404));
  }

  const alreadyWatching = task.watchers.some((w) => w.toString() === userId);

  if (alreadyWatching) {
    return res.status(200).json({
      status: "success",
      message: "Kamu sudah menjadi watcher task ini",
    });
  }

  task.watchers.push(userId);
  await task.save();

  res.status(200).json({
    status: "success",
    message: "Berhasil menjadi watcher task ini",
  });
});

// ──────────────────────────────────────────────
// DELETE /api/workspaces/:id/tasks/:taskId/watch
// ──────────────────────────────────────────────
exports.unwatchTask = catchAsync(async (req, res, next) => {
  const { taskId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const task = await Task.findOne({
    _id: taskId,
    workspaceId: workspace._id,
  });

  if (!task) {
    return next(new AppError("Task tidak ditemukan", 404));
  }

  task.watchers = task.watchers.filter((w) => w.toString() !== userId);
  await task.save();

  res.status(200).json({
    status: "success",
    message: "Berhasil berhenti menjadi watcher",
  });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/tasks/:taskId/attachments
// ──────────────────────────────────────────────
exports.uploadAttachment = catchAsync(async (req, res, next) => {
  const { taskId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  if (!req.file) {
    return next(new AppError("File harus disertakan", 400));
  }

  const task = await Task.findOne({
    _id: taskId,
    workspaceId: workspace._id,
  });

  if (!task) {
    return next(new AppError("Task tidak ditemukan", 404));
  }

  // TODO: Upload ke Puter.js dan dapatkan URL
  // Untuk sementara, simpan sebagai base64 data URL atau placeholder
  const attachment = {
    fileName: req.file.originalname,
    fileUrl: `placeholder://${workspace._id}/${taskId}/${req.file.originalname}`,
    fileType: req.file.mimetype,
    fileSize: req.file.size,
    uploadedBy: userId,
    uploadedAt: new Date(),
  };

  task.attachments.push(attachment);
  await task.save();

  const savedAttachment = task.attachments[task.attachments.length - 1];

  emitTaskEvent(workspace._id.toString(), "task:updated", {
    taskId: task._id,
    userId,
  });

  // Activity log
  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "task.attachment_added",
    targetType: "task",
    targetId: task._id,
    targetName: task.title,
    details: { field: "attachment", newValue: req.file.originalname },
  });

  res.status(201).json({
    status: "success",
    data: { attachment: savedAttachment },
  });
});

// ──────────────────────────────────────────────
// DELETE /api/workspaces/:id/tasks/:taskId/attachments/:attachmentId
// ──────────────────────────────────────────────
exports.deleteAttachment = catchAsync(async (req, res, next) => {
  const { taskId, attachmentId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const task = await Task.findOne({
    _id: taskId,
    workspaceId: workspace._id,
  });

  if (!task) {
    return next(new AppError("Task tidak ditemukan", 404));
  }

  const attachmentIndex = task.attachments.findIndex(
    (a) => a._id.toString() === attachmentId,
  );

  if (attachmentIndex === -1) {
    return next(new AppError("Lampiran tidak ditemukan", 404));
  }

  // TODO: Hapus file dari Puter.js
  // const attachment = task.attachments[attachmentIndex];
  // await puterService.deleteFile(attachment.fileUrl);

  task.attachments.splice(attachmentIndex, 1);
  await task.save();

  emitTaskEvent(workspace._id.toString(), "task:updated", {
    taskId: task._id,
    userId,
  });

  // Activity log
  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "task.attachment_removed",
    targetType: "task",
    targetId: task._id,
    targetName: task.title,
  });

  res.status(200).json({
    status: "success",
    message: "Lampiran berhasil dihapus",
  });
});
