const EventDivision = require("../models/EventDivision");
const Event = require("../models/Event");
const WorkspaceMember = require("../models/WorkspaceMember");
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

const populateDivision = (query) => {
  return query
    .populate("members.userId", "name email avatar")
    .populate("createdBy", "name email avatar");
};

/**
 * Sync event.participants from all division members.
 * Aggregates unique userIds across all non-deleted divisions
 * and updates the event document.
 */
const syncEventParticipants = async (eventId, workspaceId) => {
  const divisions = await EventDivision.find({
    eventId,
    workspaceId,
  }).lean();

  const userIdSet = new Set();
  for (const div of divisions) {
    for (const m of div.members) {
      userIdSet.add(m.userId.toString());
    }
  }

  const participantIds = Array.from(userIdSet);

  await Event.findByIdAndUpdate(eventId, {
    participants: participantIds,
  });

  emitToWorkspace(workspaceId.toString(), "event:updated", {
    eventId,
    changes: { participants: participantIds },
  });
};

// ──────────────────────────────────────────────
// GET /api/workspaces/:id/events/:eventId/divisions
// ──────────────────────────────────────────────
exports.listDivisions = catchAsync(async (req, res, next) => {
  const { eventId } = req.params;
  const workspace = req.workspace;

  const event = await Event.findOne({
    _id: eventId,
    workspaceId: workspace._id,
  });
  if (!event) {
    return next(new AppError("Event tidak ditemukan", 404));
  }

  const divisions = await populateDivision(
    EventDivision.find({ eventId: event._id, workspaceId: workspace._id }),
  )
    .sort({ order: 1, createdAt: 1 })
    .lean();

  res.status(200).json({
    status: "success",
    data: { divisions },
  });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/events/:eventId/divisions
// ──────────────────────────────────────────────
exports.createDivision = catchAsync(async (req, res, next) => {
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

  const { name, description, color, order } = req.body;

  if (!name || !name.trim()) {
    return next(new AppError("Nama divisi harus diisi", 400));
  }

  const maxOrder = await EventDivision.findOne({
    eventId: event._id,
    workspaceId: workspace._id,
  })
    .sort({ order: -1 })
    .select("order")
    .lean();

  const division = await EventDivision.create({
    eventId: event._id,
    workspaceId: workspace._id,
    name: name.trim(),
    description: (description || "").trim(),
    color: color || null,
    members: [],
    order: order !== undefined ? order : (maxOrder?.order ?? -1) + 1,
    createdBy: userId,
  });

  const populated = await populateDivision(
    EventDivision.findById(division._id),
  ).lean();

  emitToWorkspace(workspace._id.toString(), "event:division:created", {
    eventId: event._id,
    division: populated,
    userId,
  });

  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "event_division.created",
    targetType: "event",
    targetId: event._id,
    targetName: event.title,
    details: { field: "division", newValue: division.name },
  });

  EmbeddingService.upsert({
    workspaceId: workspace._id,
    sourceType: "division",
    sourceId: division._id,
    content: EmbeddingService._buildDivisionContent(populated, event.title),
    metadata: {
      title: division.name,
      sourceUrl: `/workspace/${workspace._id}/events/${event._id}`,
    },
  }).catch(() => {});

  res.status(201).json({
    status: "success",
    data: { division: populated },
  });
});

// ──────────────────────────────────────────────
// PUT /api/workspaces/:id/events/:eventId/divisions/:divisionId
// ──────────────────────────────────────────────
exports.updateDivision = catchAsync(async (req, res, next) => {
  const { eventId, divisionId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const event = await Event.findOne({
    _id: eventId,
    workspaceId: workspace._id,
  });
  if (!event) {
    return next(new AppError("Event tidak ditemukan", 404));
  }

  const division = await EventDivision.findOne({
    _id: divisionId,
    eventId: event._id,
    workspaceId: workspace._id,
  });
  if (!division) {
    return next(new AppError("Divisi tidak ditemukan", 404));
  }

  const { name, description, color, order } = req.body;

  if (name !== undefined) {
    if (!name.trim()) {
      return next(new AppError("Nama divisi tidak boleh kosong", 400));
    }
    division.name = name.trim();
  }
  if (description !== undefined) {
    division.description = description.trim();
  }
  if (color !== undefined) {
    division.color = color;
  }
  if (order !== undefined) {
    division.order = order;
  }

  await division.save();

  const populated = await populateDivision(
    EventDivision.findById(division._id),
  ).lean();

  emitToWorkspace(workspace._id.toString(), "event:division:updated", {
    eventId: event._id,
    division: populated,
    userId,
  });

  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "event_division.updated",
    targetType: "event",
    targetId: event._id,
    targetName: event.title,
    details: { field: "division", newValue: division.name },
  });

  EmbeddingService.upsert({
    workspaceId: workspace._id,
    sourceType: "division",
    sourceId: division._id,
    content: EmbeddingService._buildDivisionContent(populated, event.title),
    metadata: {
      title: division.name,
      sourceUrl: `/workspace/${workspace._id}/events/${event._id}`,
    },
  }).catch(() => {});

  res.status(200).json({
    status: "success",
    data: { division: populated },
  });
});

// ──────────────────────────────────────────────
// DELETE /api/workspaces/:id/events/:eventId/divisions/:divisionId
// ──────────────────────────────────────────────
exports.deleteDivision = catchAsync(async (req, res, next) => {
  const { eventId, divisionId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const event = await Event.findOne({
    _id: eventId,
    workspaceId: workspace._id,
  });
  if (!event) {
    return next(new AppError("Event tidak ditemukan", 404));
  }

  const division = await EventDivision.findOne({
    _id: divisionId,
    eventId: event._id,
    workspaceId: workspace._id,
  });
  if (!division) {
    return next(new AppError("Divisi tidak ditemukan", 404));
  }

  division.isDeleted = true;
  division.deletedAt = new Date();
  await division.save();

  await syncEventParticipants(event._id, workspace._id);

  emitToWorkspace(workspace._id.toString(), "event:division:deleted", {
    eventId: event._id,
    divisionId: division._id,
    userId,
  });

  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "event_division.deleted",
    targetType: "event",
    targetId: event._id,
    targetName: event.title,
    details: { field: "division", newValue: division.name },
  });

  EmbeddingService.remove({
    sourceType: "division",
    sourceId: division._id,
    workspaceId: workspace._id,
  }).catch(() => {});

  res.status(200).json({
    status: "success",
    message: "Divisi berhasil dihapus",
  });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/events/:eventId/divisions/:divisionId/members
// ──────────────────────────────────────────────
exports.addMember = catchAsync(async (req, res, next) => {
  const { eventId, divisionId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const event = await Event.findOne({
    _id: eventId,
    workspaceId: workspace._id,
  });
  if (!event) {
    return next(new AppError("Event tidak ditemukan", 404));
  }

  const division = await EventDivision.findOne({
    _id: divisionId,
    eventId: event._id,
    workspaceId: workspace._id,
  });
  if (!division) {
    return next(new AppError("Divisi tidak ditemukan", 404));
  }

  const { memberId, role } = req.body;

  if (!memberId) {
    return next(new AppError("ID member harus diisi", 400));
  }

  const membership = await WorkspaceMember.findMembership(
    workspace._id,
    memberId,
  );
  if (!membership) {
    return next(new AppError("User bukan member workspace ini", 400));
  }

  const alreadyInDivision = division.members.some(
    (m) => m.userId.toString() === memberId,
  );
  if (alreadyInDivision) {
    return next(new AppError("User sudah menjadi anggota divisi ini", 400));
  }

  division.members.push({
    userId: memberId,
    role: role || "member",
  });
  await division.save();

  await syncEventParticipants(event._id, workspace._id);

  const populated = await populateDivision(
    EventDivision.findById(division._id),
  ).lean();

  const addedMember = populated.members.find(
    (m) => (m.userId?._id || m.userId).toString() === memberId,
  );

  emitToWorkspace(workspace._id.toString(), "event:division:member:added", {
    eventId: event._id,
    divisionId: division._id,
    member: addedMember,
    division: populated,
    userId,
  });

  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "event_division.member_added",
    targetType: "event",
    targetId: event._id,
    targetName: event.title,
    details: {
      field: "division_member",
      newValue: `${addedMember?.userId?.name || memberId} → ${division.name}`,
    },
  });

  if (memberId !== userId) {
    await NotificationService.create({
      workspaceId: workspace._id,
      recipientId: memberId,
      actorId: userId,
      type: "assign_task",
      targetType: "event",
      targetId: event._id,
      message: `Menambahkan kamu ke divisi "${division.name}" di event: ${event.title}`,
      url: `/workspace/${workspace._id}/events/${event._id}`,
    });
  }

  EmbeddingService.upsert({
    workspaceId: workspace._id,
    sourceType: "division",
    sourceId: division._id,
    content: EmbeddingService._buildDivisionContent(populated, event.title),
    metadata: {
      title: division.name,
      sourceUrl: `/workspace/${workspace._id}/events/${event._id}`,
    },
  }).catch(() => {});

  res.status(200).json({
    status: "success",
    data: { division: populated },
  });
});

// ──────────────────────────────────────────────
// PUT /api/workspaces/:id/events/:eventId/divisions/:divisionId/members/:userId
// ──────────────────────────────────────────────
exports.updateMemberRole = catchAsync(async (req, res, next) => {
  const { eventId, divisionId, userId: targetUserId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const event = await Event.findOne({
    _id: eventId,
    workspaceId: workspace._id,
  });
  if (!event) {
    return next(new AppError("Event tidak ditemukan", 404));
  }

  const division = await EventDivision.findOne({
    _id: divisionId,
    eventId: event._id,
    workspaceId: workspace._id,
  });
  if (!division) {
    return next(new AppError("Divisi tidak ditemukan", 404));
  }

  const memberEntry = division.members.find(
    (m) => m.userId.toString() === targetUserId,
  );
  if (!memberEntry) {
    return next(new AppError("User bukan anggota divisi ini", 400));
  }

  const { role } = req.body;
  if (!role || !["leader", "member"].includes(role)) {
    return next(new AppError("Role harus 'leader' atau 'member'", 400));
  }

  memberEntry.role = role;
  await division.save();

  const populated = await populateDivision(
    EventDivision.findById(division._id),
  ).lean();

  const updatedMember = populated.members.find(
    (m) => (m.userId?._id || m.userId).toString() === targetUserId,
  );

  emitToWorkspace(workspace._id.toString(), "event:division:member:updated", {
    eventId: event._id,
    divisionId: division._id,
    member: updatedMember,
    division: populated,
    userId,
  });

  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "event_division.member_updated",
    targetType: "event",
    targetId: event._id,
    targetName: event.title,
    details: {
      field: "division_member_role",
      newValue: `${updatedMember?.userId?.name || targetUserId} → ${role} di ${division.name}`,
    },
  });

  EmbeddingService.upsert({
    workspaceId: workspace._id,
    sourceType: "division",
    sourceId: division._id,
    content: EmbeddingService._buildDivisionContent(populated, event.title),
    metadata: {
      title: division.name,
      sourceUrl: `/workspace/${workspace._id}/events/${event._id}`,
    },
  }).catch(() => {});

  res.status(200).json({
    status: "success",
    data: { division: populated },
  });
});

// ──────────────────────────────────────────────
// DELETE /api/workspaces/:id/events/:eventId/divisions/:divisionId/members/:userId
// ──────────────────────────────────────────────
exports.removeMember = catchAsync(async (req, res, next) => {
  const { eventId, divisionId, userId: targetUserId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const event = await Event.findOne({
    _id: eventId,
    workspaceId: workspace._id,
  });
  if (!event) {
    return next(new AppError("Event tidak ditemukan", 404));
  }

  const division = await EventDivision.findOne({
    _id: divisionId,
    eventId: event._id,
    workspaceId: workspace._id,
  });
  if (!division) {
    return next(new AppError("Divisi tidak ditemukan", 404));
  }

  const memberIdx = division.members.findIndex(
    (m) => m.userId.toString() === targetUserId,
  );
  if (memberIdx === -1) {
    return next(new AppError("User bukan anggota divisi ini", 400));
  }

  division.members.splice(memberIdx, 1);
  await division.save();

  await syncEventParticipants(event._id, workspace._id);

  const populated = await populateDivision(
    EventDivision.findById(division._id),
  ).lean();

  emitToWorkspace(workspace._id.toString(), "event:division:member:removed", {
    eventId: event._id,
    divisionId: division._id,
    memberId: targetUserId,
    division: populated,
    userId,
  });

  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "event_division.member_removed",
    targetType: "event",
    targetId: event._id,
    targetName: event.title,
    details: { field: "division_member", newValue: division.name },
  });

  if (targetUserId !== userId) {
    await NotificationService.create({
      workspaceId: workspace._id,
      recipientId: targetUserId,
      actorId: userId,
      type: "assign_task",
      targetType: "event",
      targetId: event._id,
      message: `Mengeluarkan kamu dari divisi "${division.name}" di event: ${event.title}`,
      url: `/workspace/${workspace._id}/events/${event._id}`,
    });
  }

  EmbeddingService.upsert({
    workspaceId: workspace._id,
    sourceType: "division",
    sourceId: division._id,
    content: EmbeddingService._buildDivisionContent(populated, event.title),
    metadata: {
      title: division.name,
      sourceUrl: `/workspace/${workspace._id}/events/${event._id}`,
    },
  }).catch(() => {});

  res.status(200).json({
    status: "success",
    data: { division: populated },
  });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/events/:eventId/divisions/:divisionId/members/:userId/move
// ──────────────────────────────────────────────
exports.moveMember = catchAsync(async (req, res, next) => {
  const { eventId, divisionId, userId: targetUserId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const { targetDivisionId } = req.body;

  if (!targetDivisionId) {
    return next(new AppError("ID divisi tujuan harus diisi", 400));
  }

  if (divisionId === targetDivisionId) {
    return next(new AppError("Divisi asal dan tujuan sama", 400));
  }

  const event = await Event.findOne({
    _id: eventId,
    workspaceId: workspace._id,
  });
  if (!event) {
    return next(new AppError("Event tidak ditemukan", 404));
  }

  const [sourceDivision, targetDivision] = await Promise.all([
    EventDivision.findOne({
      _id: divisionId,
      eventId: event._id,
      workspaceId: workspace._id,
    }),
    EventDivision.findOne({
      _id: targetDivisionId,
      eventId: event._id,
      workspaceId: workspace._id,
    }),
  ]);

  if (!sourceDivision) {
    return next(new AppError("Divisi asal tidak ditemukan", 404));
  }
  if (!targetDivision) {
    return next(new AppError("Divisi tujuan tidak ditemukan", 404));
  }

  const memberIdx = sourceDivision.members.findIndex(
    (m) => m.userId.toString() === targetUserId,
  );
  if (memberIdx === -1) {
    return next(new AppError("User bukan anggota divisi asal", 400));
  }

  const alreadyInTarget = targetDivision.members.some(
    (m) => m.userId.toString() === targetUserId,
  );
  if (alreadyInTarget) {
    return next(
      new AppError("User sudah menjadi anggota divisi tujuan", 400),
    );
  }

  const memberData = sourceDivision.members[memberIdx];
  sourceDivision.members.splice(memberIdx, 1);
  targetDivision.members.push({
    userId: memberData.userId,
    role: memberData.role,
  });

  await Promise.all([sourceDivision.save(), targetDivision.save()]);

  await syncEventParticipants(event._id, workspace._id);

  const [populatedSource, populatedTarget] = await Promise.all([
    populateDivision(EventDivision.findById(sourceDivision._id)).lean(),
    populateDivision(EventDivision.findById(targetDivision._id)).lean(),
  ]);

  emitToWorkspace(workspace._id.toString(), "event:division:member:moved", {
    eventId: event._id,
    sourceDivisionId: sourceDivision._id,
    targetDivisionId: targetDivision._id,
    memberId: targetUserId,
    sourceDivision: populatedSource,
    targetDivision: populatedTarget,
    userId,
  });

  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "event_division.member_moved",
    targetType: "event",
    targetId: event._id,
    targetName: event.title,
    details: {
      field: "division_member",
      newValue: `${sourceDivision.name} → ${targetDivision.name}`,
    },
  });

  // Update embeddings for both divisions
  for (const div of [
    { pop: populatedSource, id: sourceDivision._id },
    { pop: populatedTarget, id: targetDivision._id },
  ]) {
    EmbeddingService.upsert({
      workspaceId: workspace._id,
      sourceType: "division",
      sourceId: div.id,
      content: EmbeddingService._buildDivisionContent(div.pop, event.title),
      metadata: {
        title: div.pop.name,
        sourceUrl: `/workspace/${workspace._id}/events/${event._id}`,
      },
    }).catch(() => {});
  }

  res.status(200).json({
    status: "success",
    data: {
      sourceDivision: populatedSource,
      targetDivision: populatedTarget,
    },
  });
});
