const EventNote = require("../models/EventNote");
const Event = require("../models/Event");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const ActivityLogService = require("../services/activityLog.service");
const NotificationService = require("../services/notification.service");
const EmbeddingService = require("../services/embedding.service");

const getIO = () => {
  try {
    return require("../config/socket").getIO();
  } catch {
    return null;
  }
};

const emitToWorkspace = (workspaceId, event, data) => {
  const io = getIO();
  if (io) {
    io.to(`workspace:${workspaceId}`).emit(event, data);
  }
};

const populateNote = (query) => {
  return query.populate("authorId", "name email avatar");
};

const extractMentionsFromContent = (content) => {
  if (!content) return [];
  try {
    const blocks = JSON.parse(content);
    if (!Array.isArray(blocks)) return [];
    const mentions = [];
    const traverse = (items) => {
      for (const item of items) {
        if (item.type === "mention" && item.props?.userId) {
          if (!mentions.some((m) => m.userId === item.props.userId)) {
            mentions.push({
              userId: item.props.userId,
              name: item.props.name || "Unknown",
            });
          }
        }
        if (item.content && Array.isArray(item.content)) {
          traverse(item.content);
        }
        if (item.children && Array.isArray(item.children)) {
          traverse(item.children);
        }
      }
    };
    traverse(blocks);
    return mentions;
  } catch {
    return [];
  }
};

// ──────────────────────────────────────────────
// GET /api/workspaces/:id/events/:eventId/notes
// ──────────────────────────────────────────────
exports.listNotes = catchAsync(async (req, res, next) => {
  const { eventId } = req.params;
  const workspace = req.workspace;

  const event = await Event.findOne({
    _id: eventId,
    workspaceId: workspace._id,
  });
  if (!event) {
    return next(new AppError("Event tidak ditemukan", 404));
  }

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
  const skip = (page - 1) * limit;

  const filter = { eventId: event._id, workspaceId: workspace._id };

  const [notes, total] = await Promise.all([
    populateNote(EventNote.find(filter))
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    EventNote.countDocuments(filter),
  ]);

  res.status(200).json({
    status: "success",
    data: {
      notes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/events/:eventId/notes
// ──────────────────────────────────────────────
exports.createNote = catchAsync(async (req, res, next) => {
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

  const { title, content } = req.body;
  if (!content || !content.trim()) {
    return next(new AppError("Isi catatan harus diisi", 400));
  }

  const mentions = extractMentionsFromContent(content);

  const note = await EventNote.create({
    eventId: event._id,
    workspaceId: workspace._id,
    authorId: userId,
    title: (title || "").trim(),
    content,
    mentions,
  });

  const populated = await populateNote(EventNote.findById(note._id)).lean();

  emitToWorkspace(workspace._id.toString(), "event:note:created", {
    eventId: event._id,
    note: populated,
    userId,
  });

  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "event_note.created",
    targetType: "event",
    targetId: event._id,
    targetName: event.title,
    details: { field: "note", newValue: note.title || "Catatan baru" },
  });

  if (mentions.length > 0) {
    const mentionedIds = mentions
      .map((m) => m.userId)
      .filter((id) => id.toString() !== userId);
    if (mentionedIds.length > 0) {
      await NotificationService.createForMany({
        workspaceId: workspace._id,
        recipientIds: mentionedIds,
        actorId: userId,
        type: "mention",
        targetType: "event",
        targetId: event._id,
        message: `menyebut kamu di catatan event "${event.title}"`,
        url: `/workspace/${workspace._id}/events/${event._id}`,
      });
    }
  }

  EmbeddingService.upsert({
    workspaceId: workspace._id,
    sourceType: "event_note",
    sourceId: note._id,
    content: EmbeddingService._buildEventNoteContent(note, event.title),
    metadata: {
      title: note.title || "Catatan",
      sourceUrl: `/workspace/${workspace._id}/events/${event._id}`,
    },
  }).catch(() => {});

  res.status(201).json({
    status: "success",
    data: { note: populated },
  });
});

// ──────────────────────────────────────────────
// GET /api/workspaces/:id/events/:eventId/notes/:noteId
// ──────────────────────────────────────────────
exports.getNote = catchAsync(async (req, res, next) => {
  const { eventId, noteId } = req.params;
  const workspace = req.workspace;

  const note = await populateNote(
    EventNote.findOne({
      _id: noteId,
      eventId,
      workspaceId: workspace._id,
    }),
  ).lean();

  if (!note) {
    return next(new AppError("Catatan tidak ditemukan", 404));
  }

  res.status(200).json({
    status: "success",
    data: { note },
  });
});

// ──────────────────────────────────────────────
// PUT /api/workspaces/:id/events/:eventId/notes/:noteId
// ──────────────────────────────────────────────
exports.updateNote = catchAsync(async (req, res, next) => {
  const { eventId, noteId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;
  const memberRole = req.workspaceMember.role;

  const note = await EventNote.findOne({
    _id: noteId,
    eventId,
    workspaceId: workspace._id,
  });
  if (!note) {
    return next(new AppError("Catatan tidak ditemukan", 404));
  }

  const isAuthor = note.authorId.toString() === userId;
  const isAdminOrOwner = ["owner", "admin"].includes(memberRole);
  if (!isAuthor && !isAdminOrOwner) {
    return next(
      new AppError("Kamu tidak memiliki izin untuk mengedit catatan ini", 403),
    );
  }

  const { title, content } = req.body;
  const oldMentionIds = note.mentions.map((m) => m.userId.toString());

  if (title !== undefined) {
    note.title = title.trim();
  }
  if (content !== undefined) {
    if (!content.trim()) {
      return next(new AppError("Isi catatan tidak boleh kosong", 400));
    }
    note.content = content;
    note.mentions = extractMentionsFromContent(content);
  }

  await note.save();

  const populated = await populateNote(EventNote.findById(note._id)).lean();

  const event = await Event.findById(eventId).select("title").lean();

  emitToWorkspace(workspace._id.toString(), "event:note:updated", {
    eventId,
    note: populated,
    userId,
  });

  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "event_note.updated",
    targetType: "event",
    targetId: eventId,
    targetName: event?.title || "",
    details: { field: "note", newValue: note.title || "Catatan" },
  });

  if (content !== undefined) {
    const newMentionIds = note.mentions.map((m) => m.userId.toString());
    const newlyMentioned = newMentionIds.filter(
      (id) => !oldMentionIds.includes(id) && id !== userId,
    );
    if (newlyMentioned.length > 0) {
      await NotificationService.createForMany({
        workspaceId: workspace._id,
        recipientIds: newlyMentioned,
        actorId: userId,
        type: "mention",
        targetType: "event",
        targetId: eventId,
        message: `menyebut kamu di catatan event "${event?.title || ""}"`,
        url: `/workspace/${workspace._id}/events/${eventId}`,
      });
    }
  }

  EmbeddingService.upsert({
    workspaceId: workspace._id,
    sourceType: "event_note",
    sourceId: note._id,
    content: EmbeddingService._buildEventNoteContent(
      note,
      event?.title || "",
    ),
    metadata: {
      title: note.title || "Catatan",
      sourceUrl: `/workspace/${workspace._id}/events/${eventId}`,
    },
  }).catch(() => {});

  res.status(200).json({
    status: "success",
    data: { note: populated },
  });
});

// ──────────────────────────────────────────────
// DELETE /api/workspaces/:id/events/:eventId/notes/:noteId
// ──────────────────────────────────────────────
exports.deleteNote = catchAsync(async (req, res, next) => {
  const { eventId, noteId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;
  const memberRole = req.workspaceMember.role;

  const note = await EventNote.findOne({
    _id: noteId,
    eventId,
    workspaceId: workspace._id,
  });
  if (!note) {
    return next(new AppError("Catatan tidak ditemukan", 404));
  }

  const isAuthor = note.authorId.toString() === userId;
  const isAdminOrOwner = ["owner", "admin"].includes(memberRole);
  if (!isAuthor && !isAdminOrOwner) {
    return next(
      new AppError("Kamu tidak memiliki izin untuk menghapus catatan ini", 403),
    );
  }

  note.isDeleted = true;
  note.deletedAt = new Date();
  await note.save();

  const event = await Event.findById(eventId).select("title").lean();

  emitToWorkspace(workspace._id.toString(), "event:note:deleted", {
    eventId,
    noteId: note._id,
    userId,
  });

  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "event_note.deleted",
    targetType: "event",
    targetId: eventId,
    targetName: event?.title || "",
    details: { field: "note", newValue: note.title || "Catatan" },
  });

  EmbeddingService.remove({
    sourceType: "event_note",
    sourceId: note._id,
    workspaceId: workspace._id,
  }).catch(() => {});

  res.status(200).json({
    status: "success",
    message: "Catatan berhasil dihapus",
  });
});
