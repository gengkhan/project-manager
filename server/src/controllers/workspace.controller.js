const mongoose = require("mongoose");
const Workspace = require("../models/Workspace");
const WorkspaceMember = require("../models/WorkspaceMember");
const WorkspaceInvitation = require("../models/WorkspaceInvitation");
const User = require("../models/User");
const emailService = require("../services/email.service");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const ActivityLogService = require("../services/activityLog.service");

// ──────────────────────────────────────────────
// GET /api/workspaces — Daftar workspace user
// ──────────────────────────────────────────────
exports.listWorkspaces = catchAsync(async (req, res) => {
  const userId = req.user.id;

  // Ambil semua membership user
  const memberships = await WorkspaceMember.find({ userId }).lean();
  const workspaceIds = memberships.map((m) => m.workspaceId);

  // Ambil workspace details
  const workspaces = await Workspace.find({
    _id: { $in: workspaceIds },
  }).lean();

  // Gabungkan data membership + workspace
  const result = workspaces.map((ws) => {
    const membership = memberships.find(
      (m) => m.workspaceId.toString() === ws._id.toString(),
    );
    return {
      ...ws,
      role: membership?.role,
      joinedAt: membership?.joinedAt,
    };
  });

  // Hitung member count per workspace (batch)
  const memberCounts = await WorkspaceMember.aggregate([
    { $match: { workspaceId: { $in: workspaceIds } } },
    { $group: { _id: "$workspaceId", count: { $sum: 1 } } },
  ]);

  const memberCountMap = {};
  memberCounts.forEach((mc) => {
    memberCountMap[mc._id.toString()] = mc.count;
  });

  const enriched = result.map((ws) => ({
    ...ws,
    memberCount: memberCountMap[ws._id.toString()] || 0,
  }));

  // Pisahkan active & archived
  const active = enriched.filter((ws) => !ws.isArchived);
  const archived = enriched.filter((ws) => ws.isArchived);

  res.status(200).json({
    status: "success",
    data: {
      active,
      archived,
    },
  });
});

// ──────────────────────────────────────────────
// POST /api/workspaces — Buat workspace baru
// ──────────────────────────────────────────────
exports.createWorkspace = catchAsync(async (req, res, next) => {
  const { name, description, logo } = req.body;
  const userId = req.user.id;

  if (!name || !name.trim()) {
    return next(new AppError("Nama workspace harus diisi", 400));
  }

  if (name.length > 50) {
    return next(new AppError("Nama workspace maksimal 50 karakter", 400));
  }

  // Buat workspace
  const workspace = await Workspace.create({
    name: name.trim(),
    description: description?.trim() || "",
    logo: logo || null,
    ownerId: userId,
  });

  // Buat membership owner
  await WorkspaceMember.create({
    workspaceId: workspace._id,
    userId,
    role: "owner",
    joinedAt: new Date(),
  });

  res.status(201).json({
    status: "success",
    data: {
      workspace,
    },
  });
});

// ──────────────────────────────────────────────
// GET /api/workspaces/:id — Detail workspace
// ──────────────────────────────────────────────
exports.getWorkspace = catchAsync(async (req, res) => {
  const workspace = req.workspace; // dari RBAC middleware
  const memberCount = await WorkspaceMember.countMembers(workspace._id);

  res.status(200).json({
    status: "success",
    data: {
      workspace: {
        ...workspace.toObject(),
        memberCount,
        role: req.workspaceMember.role,
      },
    },
  });
});

// ──────────────────────────────────────────────
// PUT /api/workspaces/:id — Update workspace
// ──────────────────────────────────────────────
exports.updateWorkspace = catchAsync(async (req, res, next) => {
  const { name, description, logo, kanbanColumns } = req.body;
  const workspace = req.workspace;

  if (name !== undefined) {
    if (!name.trim()) {
      return next(new AppError("Nama workspace tidak boleh kosong", 400));
    }
    if (name.length > 50) {
      return next(new AppError("Nama workspace maksimal 50 karakter", 400));
    }
    workspace.name = name.trim();
  }

  if (description !== undefined) {
    if (description.length > 500) {
      return next(new AppError("Deskripsi maksimal 500 karakter", 400));
    }
    workspace.description = description.trim();
  }

  if (logo !== undefined) {
    workspace.logo = logo;
  }

  if (kanbanColumns !== undefined) {
    if (!Array.isArray(kanbanColumns) || kanbanColumns.length === 0) {
      return next(new AppError("Harus ada minimal 1 kolom kanban", 400));
    }
    // Validasi dan reorder
    workspace.kanbanColumns = kanbanColumns.map((col, index) => ({
      _id: col._id || new mongoose.Types.ObjectId(),
      name: col.name?.trim() || `Column ${index + 1}`,
      color: col.color || "#6B7280",
      order: index,
    }));
  }

  await workspace.save();

  // Activity log
  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: req.user.id,
    action: "workspace.updated",
    targetType: "workspace",
    targetId: workspace._id,
    targetName: workspace.name,
  });

  res.status(200).json({
    status: "success",
    data: { workspace },
  });
});

// ──────────────────────────────────────────────
// DELETE /api/workspaces/:id — Hapus workspace (soft delete)
// ──────────────────────────────────────────────
exports.deleteWorkspace = catchAsync(async (req, res) => {
  const workspace = req.workspace;

  workspace.isDeleted = true;
  workspace.deletedAt = new Date();
  await workspace.save();

  res.status(200).json({
    status: "success",
    message: "Workspace berhasil dihapus",
  });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/archive — Arsipkan
// ──────────────────────────────────────────────
exports.archiveWorkspace = catchAsync(async (req, res) => {
  const workspace = req.workspace;

  workspace.isArchived = true;
  workspace.archivedAt = new Date();
  await workspace.save();

  // Activity log
  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: req.user.id,
    action: "workspace.archived",
    targetType: "workspace",
    targetId: workspace._id,
    targetName: workspace.name,
  });

  res.status(200).json({
    status: "success",
    data: { workspace },
  });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/unarchive — Unarsipkan
// ──────────────────────────────────────────────
exports.unarchiveWorkspace = catchAsync(async (req, res) => {
  const workspace = req.workspace;

  workspace.isArchived = false;
  workspace.archivedAt = null;
  await workspace.save();

  res.status(200).json({
    status: "success",
    data: { workspace },
  });
});

// ──────────────────────────────────────────────
// GET /api/workspaces/:id/members — Daftar member
// ──────────────────────────────────────────────
exports.listMembers = catchAsync(async (req, res) => {
  const workspaceId = req.workspace._id;

  const members = await WorkspaceMember.find({ workspaceId })
    .populate("userId", "name email avatar lastActiveAt")
    .populate("invitedBy", "name")
    .sort({ role: 1, joinedAt: 1 })
    .lean();

  // Transform: flatten user info
  const result = members.map((m) => ({
    _id: m._id,
    userId: m.userId?._id,
    name: m.userId?.name,
    email: m.userId?.email,
    avatar: m.userId?.avatar,
    lastActiveAt: m.userId?.lastActiveAt,
    role: m.role,
    joinedAt: m.joinedAt,
    invitedBy: m.invitedBy?.name || null,
  }));

  res.status(200).json({
    status: "success",
    data: { members: result },
  });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/invite — Undang via email
// ──────────────────────────────────────────────
exports.inviteMembers = catchAsync(async (req, res, next) => {
  const { emails, role, message } = req.body;
  const workspace = req.workspace;
  const inviterId = req.user.id;

  if (
    !emails ||
    (Array.isArray(emails) ? emails.length === 0 : !emails.trim())
  ) {
    return next(new AppError("Email harus diisi", 400));
  }

  // Parse emails (string comma-separated atau array)
  const emailList = Array.isArray(emails)
    ? emails
    : emails
        .split(/[,\n]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e);

  if (emailList.length === 0) {
    return next(new AppError("Minimal 1 email harus diisi", 400));
  }

  if (emailList.length > 20) {
    return next(new AppError("Maksimal 20 email per undangan", 400));
  }

  // Validasi role (tidak boleh owner)
  const validRole = ["admin", "member", "guest"].includes(role)
    ? role
    : "member";

  // Ambil info inviter
  const inviter = await User.findById(inviterId).select("name");

  const results = [];
  const errors = [];

  for (const email of emailList) {
    try {
      // Cek email valid
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        errors.push({ email, reason: "Format email tidak valid" });
        continue;
      }

      // Cek apakah sudah jadi member
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        const existingMember = await WorkspaceMember.findMembership(
          workspace._id,
          existingUser._id,
        );
        if (existingMember) {
          errors.push({ email, reason: "Sudah menjadi member" });
          continue;
        }
      }

      // Buat invitation
      const invitation = await WorkspaceInvitation.createInvitation({
        workspaceId: workspace._id,
        email,
        role: validRole,
        message: message || null,
        invitedBy: inviterId,
      });

      // Kirim email undangan
      const inviteUrl = `${process.env.APP_BASE_URL}/workspaces/join/invite?token=${invitation.token}`;
      try {
        await emailService.sendWorkspaceInvitationEmail(
          email,
          inviter.name,
          workspace.name,
          inviteUrl,
          message,
        );
      } catch (emailErr) {
        // Email gagal tapi invitation tetap dibuat
      }

      results.push({ email, status: "sent" });
    } catch (err) {
      errors.push({ email, reason: "Gagal mengirim undangan" });
    }
  }

  // Activity log for invitations
  if (results.length > 0) {
    for (const r of results) {
      ActivityLogService.log({
        workspaceId: workspace._id,
        actorId: inviterId,
        action: "workspace.member_invited",
        targetType: "workspace",
        targetId: workspace._id,
        targetName: workspace.name,
        details: { newValue: r.email },
      });
    }
  }

  res.status(200).json({
    status: "success",
    data: {
      sent: results,
      errors,
    },
  });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/invite-link/regenerate
// ──────────────────────────────────────────────
exports.regenerateInviteLink = catchAsync(async (req, res) => {
  const workspace = req.workspace;
  await workspace.regenerateInviteCode();

  const inviteLink = `${process.env.APP_BASE_URL}/workspaces/join/${workspace.inviteCode}`;

  res.status(200).json({
    status: "success",
    data: {
      inviteCode: workspace.inviteCode,
      inviteLink,
    },
  });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/join/:inviteCode — Join via link
// ──────────────────────────────────────────────
exports.joinViaLink = catchAsync(async (req, res, next) => {
  const { inviteCode } = req.params;
  const userId = req.user.id;

  const workspace = await Workspace.findOne({ inviteCode });
  if (!workspace) {
    return next(
      new AppError("Tautan undangan tidak valid atau sudah expired", 404),
    );
  }

  // Cek apakah sudah member
  const existingMember = await WorkspaceMember.findMembership(
    workspace._id,
    userId,
  );
  if (existingMember) {
    return res.status(200).json({
      status: "success",
      message: "Kamu sudah menjadi member workspace ini",
      data: { workspace: { _id: workspace._id, name: workspace.name } },
    });
  }

  // Join sebagai member
  await WorkspaceMember.create({
    workspaceId: workspace._id,
    userId,
    role: "member",
    joinedAt: new Date(),
  });

  // Activity log
  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "workspace.member_joined",
    targetType: "workspace",
    targetId: workspace._id,
    targetName: workspace.name,
  });

  res.status(200).json({
    status: "success",
    message: `Berhasil bergabung ke workspace "${workspace.name}"`,
    data: { workspace: { _id: workspace._id, name: workspace.name } },
  });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/join/invite?token=xxx — Join via email invitation
// ──────────────────────────────────────────────
exports.joinViaInvitation = catchAsync(async (req, res, next) => {
  const { token } = req.query;
  const userId = req.user.id;

  if (!token) {
    return next(new AppError("Token undangan diperlukan", 400));
  }

  const invitation = await WorkspaceInvitation.findOne({
    token,
    status: "pending",
    expiresAt: { $gt: new Date() },
  }).populate("workspaceId", "name");

  if (!invitation) {
    return next(new AppError("Undangan tidak valid atau sudah expired", 404));
  }

  const workspace = await Workspace.findById(invitation.workspaceId);
  if (!workspace) {
    return next(new AppError("Workspace tidak ditemukan", 404));
  }

  // Cek apakah sudah member
  const existingMember = await WorkspaceMember.findMembership(
    workspace._id,
    userId,
  );
  if (existingMember) {
    // Update invitation status
    invitation.status = "accepted";
    invitation.acceptedAt = new Date();
    await invitation.save();

    return res.status(200).json({
      status: "success",
      message: "Kamu sudah menjadi member workspace ini",
      data: { workspace: { _id: workspace._id, name: workspace.name } },
    });
  }

  // Join
  await WorkspaceMember.create({
    workspaceId: workspace._id,
    userId,
    role: invitation.role,
    joinedAt: new Date(),
    invitedBy: invitation.invitedBy,
  });

  // Update invitation status
  invitation.status = "accepted";
  invitation.acceptedAt = new Date();
  await invitation.save();

  res.status(200).json({
    status: "success",
    message: `Berhasil bergabung ke workspace "${workspace.name}"`,
    data: { workspace: { _id: workspace._id, name: workspace.name } },
  });
});

// ──────────────────────────────────────────────
// PUT /api/workspaces/:id/members/:userId/role
// ──────────────────────────────────────────────
exports.changeMemberRole = catchAsync(async (req, res, next) => {
  const { role: newRole } = req.body;
  const targetMembership = req.targetMembership;
  const actorMembership = req.workspaceMember;

  if (!newRole) {
    return next(new AppError("Role baru harus diisi", 400));
  }

  if (!["admin", "member", "guest"].includes(newRole)) {
    return next(
      new AppError("Role harus salah satu dari: admin, member, guest", 400),
    );
  }

  // Tidak bisa ubah role sendiri
  if (
    targetMembership.userId.toString() === actorMembership.userId.toString()
  ) {
    return next(new AppError("Tidak bisa mengubah role sendiri", 400));
  }

  targetMembership.role = newRole;
  await targetMembership.save();

  // Activity log
  ActivityLogService.log({
    workspaceId: req.workspace._id,
    actorId: actorMembership.userId,
    action: "workspace.role_changed",
    targetType: "workspace",
    targetId: req.workspace._id,
    targetName: req.workspace.name,
    details: { field: "role", newValue: newRole },
  });

  res.status(200).json({
    status: "success",
    data: { member: targetMembership },
  });
});

// ──────────────────────────────────────────────
// DELETE /api/workspaces/:id/members/:userId — Keluarkan member
// ──────────────────────────────────────────────
exports.removeMember = catchAsync(async (req, res, next) => {
  const targetMembership = req.targetMembership;
  const actorMembership = req.workspaceMember;

  // Tidak bisa keluarkan diri sendiri (pakai leave)
  if (
    targetMembership.userId.toString() === actorMembership.userId.toString()
  ) {
    return next(
      new AppError("Gunakan fitur Leave untuk keluar dari workspace", 400),
    );
  }

  // Tidak bisa keluarkan owner
  if (targetMembership.role === "owner") {
    return next(new AppError("Tidak bisa mengeluarkan Owner", 403));
  }

  await WorkspaceMember.deleteOne({ _id: targetMembership._id });

  // Activity log
  ActivityLogService.log({
    workspaceId: req.workspace._id,
    actorId: actorMembership.userId,
    action: "workspace.member_removed",
    targetType: "workspace",
    targetId: req.workspace._id,
    targetName: req.workspace.name,
  });

  res.status(200).json({
    status: "success",
    message: "Member berhasil dikeluarkan",
  });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/leave — Leave workspace
// ──────────────────────────────────────────────
exports.leaveWorkspace = catchAsync(async (req, res, next) => {
  const membership = req.workspaceMember;

  if (membership.role === "owner") {
    return next(
      new AppError(
        "Owner tidak bisa meninggalkan workspace. Transfer ownership terlebih dahulu.",
        400,
      ),
    );
  }

  await WorkspaceMember.deleteOne({ _id: membership._id });

  // Activity log
  ActivityLogService.log({
    workspaceId: req.workspace._id,
    actorId: req.user.id,
    action: "workspace.member_left",
    targetType: "workspace",
    targetId: req.workspace._id,
    targetName: req.workspace.name,
  });

  res.status(200).json({
    status: "success",
    message: "Berhasil keluar dari workspace",
  });
});

// ──────────────────────────────────────────────
// GET /api/workspaces/:id/members/:userId/profile
// ──────────────────────────────────────────────
exports.getMemberProfile = catchAsync(async (req, res, next) => {
  const workspaceId = req.workspace._id;
  const { userId: targetUserId } = req.params;
  const viewerId = req.user.id;

  // Cek target user ada dan merupakan member
  const membership = await WorkspaceMember.findMembership(
    workspaceId,
    targetUserId,
  );
  if (!membership) {
    return next(new AppError("User bukan member workspace ini", 404));
  }

  // Ambil data user
  const targetUser = await User.findById(targetUserId).select(
    "name email avatar whatsappNumber createdAt",
  );
  if (!targetUser) {
    return next(new AppError("User tidak ditemukan", 404));
  }

  // Cari workspace yang sama-sama diikuti (shared workspaces)
  const viewerMemberships = await WorkspaceMember.find({ userId: viewerId })
    .select("workspaceId")
    .lean();
  const targetMemberships = await WorkspaceMember.find({
    userId: targetUserId,
  })
    .select("workspaceId")
    .lean();

  const viewerWsIds = new Set(
    viewerMemberships.map((m) => m.workspaceId.toString()),
  );
  const sharedWsIds = targetMemberships
    .filter((m) => viewerWsIds.has(m.workspaceId.toString()))
    .map((m) => m.workspaceId);

  const Workspace = require("../models/Workspace");
  const sharedWorkspaces = await Workspace.find({
    _id: { $in: sharedWsIds },
    isDeleted: { $ne: true },
  })
    .select("name logo")
    .lean();

  res.status(200).json({
    status: "success",
    data: {
      profile: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        avatar: targetUser.avatar,
        whatsappRegistered: !!targetUser.whatsappNumber,
        role: membership.role,
        joinedAt: membership.joinedAt,
        sharedWorkspaces,
      },
    },
  });
});

// ──────────────────────────────────────────────
// GET /api/workspaces/:id/members/:userId/stats
// ──────────────────────────────────────────────
exports.getMemberStats = catchAsync(async (req, res, next) => {
  const workspaceId = req.workspace._id;
  const { userId: targetUserId } = req.params;

  // Cek target user adalah member
  const membership = await WorkspaceMember.findMembership(
    workspaceId,
    targetUserId,
  );
  if (!membership) {
    return next(new AppError("User bukan member workspace ini", 404));
  }

  // Stats — akan diisi ketika Task, Event, Comment model sudah ada
  // Untuk sekarang return data placeholder
  const stats = {
    tasksCompleted: 0,
    tasksActive: 0,
    eventsParticipated: 0,
    commentsCreated: 0,
  };

  // Coba hitung jika model sudah ada
  try {
    const Task = mongoose.models.Task;
    if (Task) {
      stats.tasksCompleted = await Task.countDocuments({
        workspaceId,
        assignees: targetUserId,
        status: "done",
        isDeleted: { $ne: true },
      });
      stats.tasksActive = await Task.countDocuments({
        workspaceId,
        assignees: targetUserId,
        status: { $ne: "done" },
        isDeleted: { $ne: true },
      });
    }
  } catch (e) {
    // Model belum ada, gunakan default 0
  }

  try {
    const Event = mongoose.models.Event;
    if (Event) {
      stats.eventsParticipated = await Event.countDocuments({
        workspaceId,
        participants: targetUserId,
        isDeleted: { $ne: true },
      });
    }
  } catch (e) {
    // Model belum ada
  }

  try {
    const Comment = mongoose.models.Comment;
    if (Comment) {
      stats.commentsCreated = await Comment.countDocuments({
        workspaceId,
        userId: targetUserId,
        isDeleted: { $ne: true },
      });
    }
  } catch (e) {
    // Model belum ada
  }

  res.status(200).json({
    status: "success",
    data: { stats },
  });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/transfer-ownership
// ──────────────────────────────────────────────
exports.transferOwnership = catchAsync(async (req, res, next) => {
  const { targetUserId } = req.body;
  const workspace = req.workspace;
  const ownerMembership = req.workspaceMember;

  if (!targetUserId) {
    return next(new AppError("User target harus dipilih", 400));
  }

  // Tidak bisa transfer ke diri sendiri
  if (targetUserId === ownerMembership.userId.toString()) {
    return next(
      new AppError("Tidak bisa transfer ownership ke diri sendiri", 400),
    );
  }

  // Cari target membership
  const targetMembership = await WorkspaceMember.findMembership(
    workspace._id,
    targetUserId,
  );
  if (!targetMembership) {
    return next(new AppError("User bukan member workspace ini", 404));
  }

  // Target harus admin atau member
  if (!["admin", "member"].includes(targetMembership.role)) {
    return next(
      new AppError("Hanya bisa transfer ownership ke Admin atau Member", 400),
    );
  }

  // Transfer: target → owner, current owner → admin
  targetMembership.role = "owner";
  ownerMembership.role = "admin";

  // Update workspace ownerId
  workspace.ownerId = targetUserId;

  await Promise.all([
    targetMembership.save(),
    ownerMembership.save(),
    workspace.save(),
  ]);

  // Activity log
  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: ownerMembership.userId,
    action: "workspace.ownership_transferred",
    targetType: "workspace",
    targetId: workspace._id,
    targetName: workspace.name,
  });

  res.status(200).json({
    status: "success",
    message: "Ownership berhasil ditransfer",
  });
});
