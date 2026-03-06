const mongoose = require("mongoose");
const Event = require("../models/Event");
const Task = require("../models/Task");
const SpreadsheetWorkbook = require("../models/SpreadsheetWorkbook");
const WorkspaceMember = require("../models/WorkspaceMember");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const ActivityLogService = require("../services/activityLog.service");
const NotificationService = require("../services/notification.service");

// Helper: get Socket.io instance (safe)
const getIO = () => {
  try {
    return require("../config/socket").getIO();
  } catch {
    return null;
  }
};

// Helper: emit event to workspace room
const emitEventEvent = (workspaceId, event, data) => {
  const io = getIO();
  if (io) {
    io.to(`workspace:${workspaceId}`).emit(event, data);
  }
};

// Helper: populate event fields
const populateEvent = (query) => {
  return query
    .populate("participants", "name email avatar")
    .populate("createdBy", "name email avatar");
};

// ──────────────────────────────────────────────
// GET /api/workspaces/:id/events — Daftar event
// ──────────────────────────────────────────────
exports.listEvents = catchAsync(async (req, res) => {
  const { id: workspaceId } = req.params;
  const {
    status,
    participant,
    startDateFrom,
    startDateTo,
    keyword,
    sortBy = "startDate",
    sortOrder = "desc",
    page = 1,
    limit = 50,
  } = req.query;

  // Build filter
  const filter = { workspaceId };

  // Status filter (supports comma-separated for multiselect)
  if (status) {
    const statuses = status.split(",").filter(Boolean);
    if (statuses.length > 0) {
      filter.status = { $in: statuses };
    }
  }

  // Participant filter
  if (participant) {
    filter.participants = participant;
  }

  // Date range filter
  if (startDateFrom || startDateTo) {
    filter.startDate = {};
    if (startDateFrom) filter.startDate.$gte = new Date(startDateFrom);
    if (startDateTo) filter.startDate.$lte = new Date(startDateTo);
  }

  // Keyword search (title)
  if (keyword) {
    filter.title = { $regex: keyword, $options: "i" };
  }

  // Sort
  const allowedSortFields = [
    "startDate",
    "endDate",
    "title",
    "status",
    "createdAt",
  ];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : "startDate";
  const sort = { [sortField]: sortOrder === "asc" ? 1 : -1 };

  // Pagination
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [events, total] = await Promise.all([
    populateEvent(Event.find(filter))
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Event.countDocuments(filter),
  ]);

  // Attach task counts for each event
  const eventIds = events.map((e) => e._id);
  const taskCounts = await Task.aggregate([
    {
      $match: {
        eventId: { $in: eventIds },
        isDeleted: { $ne: true },
      },
    },
    {
      $group: {
        _id: "$eventId",
        count: { $sum: 1 },
      },
    },
  ]);
  const taskCountMap = {};
  taskCounts.forEach((tc) => {
    taskCountMap[tc._id.toString()] = tc.count;
  });

  const eventsWithCounts = events.map((e) => ({
    ...e,
    taskCount: taskCountMap[e._id.toString()] || 0,
  }));

  res.status(200).json({
    status: "success",
    data: {
      events: eventsWithCounts,
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
// POST /api/workspaces/:id/events — Buat event
// ──────────────────────────────────────────────
exports.createEvent = catchAsync(async (req, res, next) => {
  const workspace = req.workspace;
  const userId = req.user.id;

  const {
    title,
    description,
    startDate,
    endDate,
    color,
    status,
    participants,
  } = req.body;

  if (!title || !title.trim()) {
    return next(new AppError("Judul event harus diisi", 400));
  }

  if (!startDate) {
    return next(new AppError("Tanggal mulai harus diisi", 400));
  }

  if (!endDate) {
    return next(new AppError("Tanggal selesai harus diisi", 400));
  }

  if (new Date(endDate) < new Date(startDate)) {
    return next(
      new AppError(
        "Tanggal selesai harus sama atau setelah tanggal mulai",
        400,
      ),
    );
  }

  // Validate participants are workspace members
  if (participants && participants.length > 0) {
    const validMembers = await WorkspaceMember.find({
      workspaceId: workspace._id,
      userId: { $in: participants },
    }).select("userId");
    if (validMembers.length !== participants.length) {
      return next(
        new AppError("Beberapa peserta bukan member workspace ini", 400),
      );
    }
  }

  const event = await Event.create({
    workspaceId: workspace._id,
    title: title.trim(),
    description: description || "",
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    color: color || "#8B5CF6",
    status: status || "upcoming",
    participants: participants || [],
    createdBy: userId,
  });

  // Auto-create default FortuneSheet workbook for this event
  // Using native sheet structure: https://ruilisi.github.io/fortune-sheet-docs/guide/sheet.html
  // await SpreadsheetWorkbook.create({
  //   eventId: event._id,
  //   data: [
  //     {
  //       name: "Sheet 1",
  //       id: new mongoose.Types.ObjectId().toString(), // local sheet id
  //       status: 1,
  //       celldata: [{ r: 0, c: 0, v: null }],
  //     },
  //   ],
  //   version: 1,
  //   updatedBy: userId,
  // });

  // Populate for response
  const populatedEvent = await populateEvent(Event.findById(event._id)).lean();

  // Emit Socket.io event
  emitEventEvent(workspace._id.toString(), "event:created", {
    event: populatedEvent,
    userId,
  });

  // Activity log
  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "event.created",
    targetType: "event",
    targetId: event._id,
    targetName: event.title,
  });

  // ── Trigger Notifications ──
  const eventUrl = `/workspace/${workspace._id}/events/${event._id}`;

  // 1. Participant Notification (for all participants except creator)
  if (participants && participants.length > 0) {
    const participantIds = participants.filter(
      (id) => id.toString() !== userId,
    );
    if (participantIds.length > 0) {
      await NotificationService.createForMany({
        workspaceId: workspace._id,
        recipientIds: participantIds,
        actorId: userId,
        type: "assign_task", // Reusing 'assign_task' or could ideally use 'event_invite'
        targetType: "event",
        targetId: event._id,
        message: `Kamu diundang ke event: ${event.title}`,
        url: eventUrl,
      });
    }
  }

  // 2. Mention Notification (from description)
  if (description) {
    try {
      const descObj = JSON.parse(description);
      if (
        descObj &&
        Array.isArray(descObj.mentions) &&
        descObj.mentions.length > 0
      ) {
        const mentionedUserIds = descObj.mentions.map((m) => m.userId);
        await NotificationService.createForMany({
          workspaceId: workspace._id,
          recipientIds: mentionedUserIds,
          actorId: userId,
          type: "mention",
          targetType: "event",
          targetId: event._id,
          message: `menyebut kamu di deskripsi event "${event.title}"`,
          url: eventUrl,
        });
      }
    } catch (err) {
      // Ignore JSON parse errors
    }
  }

  res.status(201).json({
    status: "success",
    data: { event: populatedEvent },
  });
});

// ──────────────────────────────────────────────
// GET /api/workspaces/:id/events/:eventId — Detail
// ──────────────────────────────────────────────
exports.getEvent = catchAsync(async (req, res, next) => {
  const { eventId } = req.params;
  const workspace = req.workspace;

  const event = await populateEvent(
    Event.findOne({
      _id: eventId,
      workspaceId: workspace._id,
    }),
  ).lean();

  if (!event) {
    return next(new AppError("Event tidak ditemukan", 404));
  }

  // Attach task count
  const taskCount = await Task.countDocuments({
    eventId: event._id,
    isDeleted: { $ne: true },
  });

  res.status(200).json({
    status: "success",
    data: { event: { ...event, taskCount } },
  });
});

// ──────────────────────────────────────────────
// PUT /api/workspaces/:id/events/:eventId — Update
// ──────────────────────────────────────────────
exports.updateEvent = catchAsync(async (req, res, next) => {
  const { eventId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const event = await Event.findOne({
    _id: eventId,
    workspaceId: workspace._id,
  });

  if (!event) {
    return next(new AppError("Event tidak ditemukan", 404));
  }

  // Backup original state
  const oldDescription = event.description;

  const { title, description, startDate, endDate, color, status } = req.body;

  // Title
  if (title !== undefined) {
    if (!title.trim()) {
      return next(new AppError("Judul event tidak boleh kosong", 400));
    }
    event.title = title.trim();
  }

  // Description
  if (description !== undefined) {
    event.description = description;
  }

  // Dates
  if (startDate !== undefined) {
    event.startDate = new Date(startDate);
  }
  if (endDate !== undefined) {
    event.endDate = new Date(endDate);
  }

  // Validate dates after updates
  if (event.endDate < event.startDate) {
    return next(
      new AppError(
        "Tanggal selesai harus sama atau setelah tanggal mulai",
        400,
      ),
    );
  }

  // Color
  if (color !== undefined) {
    event.color = color;
  }

  // Status
  if (status !== undefined) {
    if (!["upcoming", "ongoing", "completed"].includes(status)) {
      return next(new AppError("Status tidak valid", 400));
    }
    event.status = status;
  }

  await event.save();

  // Populate for response
  const populatedEvent = await populateEvent(Event.findById(event._id)).lean();

  // Attach task count
  const taskCount = await Task.countDocuments({
    eventId: event._id,
    isDeleted: { $ne: true },
  });

  // Emit Socket.io event
  emitEventEvent(workspace._id.toString(), "event:updated", {
    event: { ...populatedEvent, taskCount },
    userId,
  });

  // Activity log
  const changedFields = [];
  if (title !== undefined) changedFields.push("title");
  if (description !== undefined) changedFields.push("description");
  if (startDate !== undefined) changedFields.push("startDate");
  if (endDate !== undefined) changedFields.push("endDate");
  if (color !== undefined) changedFields.push("color");
  if (status !== undefined) changedFields.push("status");
  if (changedFields.length > 0) {
    ActivityLogService.log({
      workspaceId: workspace._id,
      actorId: userId,
      action: "event.updated",
      targetType: "event",
      targetId: event._id,
      targetName: event.title,
      details: { field: changedFields.join(", ") },
    });
  }

  // ── Trigger Notifications ──
  // Mention Notification (from new description)
  if (description !== undefined && description !== oldDescription) {
    try {
      const newDescObj = JSON.parse(description);
      const oldDescObj = oldDescription
        ? JSON.parse(oldDescription)
        : { mentions: [] };

      const newMentions = Array.isArray(newDescObj.mentions)
        ? newDescObj.mentions.map((m) => m.userId.toString())
        : [];
      const oldMentions = Array.isArray(oldDescObj.mentions)
        ? oldDescObj.mentions.map((m) => m.userId.toString())
        : [];

      const newlyMentionedUserIds = newMentions.filter(
        (id) => !oldMentions.includes(id),
      );

      if (newlyMentionedUserIds.length > 0) {
        await NotificationService.createForMany({
          workspaceId: workspace._id,
          recipientIds: newlyMentionedUserIds,
          actorId: userId,
          type: "mention",
          targetType: "event",
          targetId: event._id,
          message: `menyebut kamu di deskripsi event "${event.title}"`,
          url: `/workspace/${workspace._id}/events/${event._id}`,
        });
      }
    } catch (err) {
      // Ignore JSON parse errors
    }
  }

  res.status(200).json({
    status: "success",
    data: { event: { ...populatedEvent, taskCount } },
  });
});

// ──────────────────────────────────────────────
// DELETE /api/workspaces/:id/events/:eventId — Soft delete
// ──────────────────────────────────────────────
exports.deleteEvent = catchAsync(async (req, res, next) => {
  const { eventId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;
  const memberRole = req.workspaceMember.role;

  const event = await Event.findOne({
    _id: eventId,
    workspaceId: workspace._id,
  });

  if (!event) {
    return next(new AppError("Event tidak ditemukan", 404));
  }

  // Permission check: creator, admin, or owner
  const isCreator = event.createdBy.toString() === userId;
  const isAdminOrOwner = ["owner", "admin"].includes(memberRole);

  if (!isCreator && !isAdminOrOwner) {
    return next(
      new AppError("Kamu tidak memiliki izin untuk menghapus event ini", 403),
    );
  }

  // Soft delete event
  event.isDeleted = true;
  event.deletedAt = new Date();
  await event.save();

  // Nullify eventId on all related tasks
  await Task.updateMany(
    { eventId: event._id, isDeleted: { $ne: true } },
    { $set: { eventId: null } },
  );

  // Emit Socket.io event
  emitEventEvent(workspace._id.toString(), "event:deleted", {
    eventId: event._id,
    userId,
  });

  // Activity log
  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "event.deleted",
    targetType: "event",
    targetId: event._id,
    targetName: event.title,
  });

  res.status(200).json({
    status: "success",
    message: "Event berhasil dihapus",
  });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/events/:eventId/participants — Tambah peserta
// ──────────────────────────────────────────────
exports.addParticipant = catchAsync(async (req, res, next) => {
  const { eventId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const { participantId } = req.body;

  if (!participantId) {
    return next(new AppError("ID peserta harus diisi", 400));
  }

  const event = await Event.findOne({
    _id: eventId,
    workspaceId: workspace._id,
  });

  if (!event) {
    return next(new AppError("Event tidak ditemukan", 404));
  }

  // Validate participant is a workspace member
  const membership = await WorkspaceMember.findMembership(
    workspace._id,
    participantId,
  );
  if (!membership) {
    return next(new AppError("User bukan member workspace ini", 400));
  }

  // Check already a participant
  const alreadyParticipant = event.participants.some(
    (p) => p.toString() === participantId,
  );
  if (alreadyParticipant) {
    return next(new AppError("User sudah menjadi peserta event ini", 400));
  }

  event.participants.push(participantId);
  await event.save();

  // Populate for response
  const populatedEvent = await populateEvent(Event.findById(event._id)).lean();

  // Emit Socket.io event
  emitEventEvent(workspace._id.toString(), "event:participant:added", {
    eventId: event._id,
    participantId,
    event: populatedEvent,
    userId,
  });

  // Activity log
  const participantUser = populatedEvent.participants?.find(
    (p) => p._id.toString() === participantId,
  );
  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "event.participant_added",
    targetType: "event",
    targetId: event._id,
    targetName: event.title,
    details: { newValue: participantUser?.name || participantId },
  });

  // ── Trigger Notification ──
  if (participantId !== userId) {
    await NotificationService.create({
      workspaceId: workspace._id,
      recipientId: participantId,
      actorId: userId,
      type: "assign_task",
      targetType: "event",
      targetId: event._id,
      message: `Menambahkan kamu ke event: ${event.title}`,
      url: `/workspace/${workspace._id}/events/${event._id}`,
    });
  }

  res.status(200).json({
    status: "success",
    data: { event: populatedEvent },
  });
});

// ──────────────────────────────────────────────
// DELETE /api/workspaces/:id/events/:eventId/participants/:userId — Hapus peserta
// ──────────────────────────────────────────────
exports.removeParticipant = catchAsync(async (req, res, next) => {
  const { eventId, userId: targetUserId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const event = await Event.findOne({
    _id: eventId,
    workspaceId: workspace._id,
  });

  if (!event) {
    return next(new AppError("Event tidak ditemukan", 404));
  }

  const isParticipant = event.participants.some(
    (p) => p.toString() === targetUserId,
  );
  if (!isParticipant) {
    return next(new AppError("User bukan peserta event ini", 400));
  }

  event.participants = event.participants.filter(
    (p) => p.toString() !== targetUserId,
  );
  await event.save();

  // Populate for response
  const populatedEvent = await populateEvent(Event.findById(event._id)).lean();

  // Emit Socket.io event
  emitEventEvent(workspace._id.toString(), "event:participant:removed", {
    eventId: event._id,
    participantId: targetUserId,
    event: populatedEvent,
    userId,
  });

  // Activity log
  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "event.participant_removed",
    targetType: "event",
    targetId: event._id,
    targetName: event.title,
  });

  // ── Trigger Notification ──
  if (targetUserId !== userId) {
    await NotificationService.create({
      workspaceId: workspace._id,
      recipientId: targetUserId,
      actorId: userId,
      type: "assign_task",
      targetType: "event",
      targetId: event._id,
      message: `Mengeluarkan kamu dari event: ${event.title}`,
      url: `/workspace/${workspace._id}/events/${event._id}`,
    });
  }

  res.status(200).json({
    status: "success",
    data: { event: populatedEvent },
  });
});

// ──────────────────────────────────────────────
// GET /api/workspaces/:id/events/:eventId/tasks — Task terkait
// ──────────────────────────────────────────────
exports.getEventTasks = catchAsync(async (req, res, next) => {
  const { eventId } = req.params;
  const workspace = req.workspace;

  const event = await Event.findOne({
    _id: eventId,
    workspaceId: workspace._id,
  });

  if (!event) {
    return next(new AppError("Event tidak ditemukan", 404));
  }

  const tasks = await Task.find({
    eventId: event._id,
    workspaceId: workspace._id,
  })
    .populate("assignees", "name email avatar")
    .populate("labels", "name color")
    .populate("createdBy", "name email avatar")
    .sort({ columnId: 1, columnOrder: 1 })
    .lean();

  res.status(200).json({
    status: "success",
    data: { tasks },
  });
});
