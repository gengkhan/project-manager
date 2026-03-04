const Comment = require("../models/Comment");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const { log: logActivity } = require("../services/activityLog.service");
const { getIO } = require("../config/socket");
const NotificationService = require("../services/notification.service");
const mongoose = require("mongoose");

// ──────────────────────────────────────────────
// GET /api/comments — Daftar komentar
// ──────────────────────────────────────────────
exports.getComments = catchAsync(async (req, res, next) => {
  const { targetType, targetId } = req.query;

  if (!targetType || !targetId) {
    return next(new AppError("targetType dan targetId diperlukan", 400));
  }

  // Ambil komentar utama (parentCommentId = null)
  const rootComments = await Comment.find({
    targetType,
    targetId,
    parentCommentId: null,
  })
    .populate("authorId", "name avatar email")
    .sort({ createdAt: 1 })
    .lean();

  // Ambil semua reply untuk komentar-komentar tersebut
  const rootIds = rootComments.map((c) => c._id);
  const replies = await Comment.find({
    parentCommentId: { $in: rootIds },
  })
    .populate("authorId", "name avatar email")
    .sort({ createdAt: 1 })
    .lean();

  // Gabungkan (1 level nested)
  const commentsWithReplies = rootComments.map((root) => {
    return {
      ...root,
      replies: replies.filter(
        (r) => r.parentCommentId.toString() === root._id.toString(),
      ),
    };
  });

  res.status(200).json({
    status: "success",
    data: {
      comments: commentsWithReplies,
    },
  });
});

// ──────────────────────────────────────────────
// POST /api/comments — Buat komentar / reply
// ──────────────────────────────────────────────
exports.createComment = catchAsync(async (req, res, next) => {
  const {
    workspaceId,
    targetType,
    targetId,
    content,
    parentCommentId,
    mentions,
  } = req.body;

  if (!workspaceId || !targetType || !targetId || !content) {
    return next(new AppError("Data tidak lengkap", 400));
  }

  const comment = await Comment.create({
    workspaceId,
    targetType,
    targetId,
    content,
    parentCommentId: parentCommentId || null,
    authorId: req.user.id,
    mentions: mentions || [],
  });

  const fullComment = await Comment.findById(comment._id).populate(
    "authorId",
    "name avatar email",
  );

  // Emit socket event
  const io = getIO();
  io.to(`workspace:${workspaceId}`).emit("comment:created", {
    targetType,
    targetId,
    comment: fullComment,
  });

  // Log activity
  await logActivity({
    workspaceId,
    actorId: req.user.id,
    action: "comment.created",
    targetType: "comment",
    targetId: comment._id,
    targetName: content.substring(0, 50) + (content.length > 50 ? "..." : ""),
    details: {
      contextType: targetType,
      contextId: targetId,
    },
  });

  // ── Trigger Notifications ──
  const mentionedUserIds = Array.isArray(mentions)
    ? mentions.map((m) => m.userId)
    : [];

  // URL context
  let commentUrl = "";
  if (targetType === "task")
    commentUrl = `/workspace/${workspaceId}/tasks/${targetId}`;
  else if (targetType === "event")
    commentUrl = `/workspace/${workspaceId}/events/${targetId}`;
  else if (targetType === "workspace") commentUrl = `/workspace/${workspaceId}`;

  // 1. Mention Notifications
  if (mentionedUserIds.length > 0) {
    let mentionContext = "komentar";
    if (targetType === "task") mentionContext = "komentar task";
    else if (targetType === "event") mentionContext = "komentar event";

    await NotificationService.createForMany({
      workspaceId,
      recipientIds: mentionedUserIds,
      actorId: req.user.id,
      type: "mention",
      targetType: "comment",
      targetId: comment._id,
      message: `menyebut kamu di ${mentionContext}`,
      url: commentUrl,
    });
  }

  // 2. New Comment Notifications (to watchers/assignees/participants depending on targetType)
  if (targetType === "task") {
    try {
      const Task = mongoose.model("Task");
      const task = await Task.findById(targetId).select(
        "assignees watchers title",
      );
      if (task) {
        // Collect all assignees and watchers
        const notifySet = new Set([
          ...task.assignees.map((id) => id.toString()),
          ...task.watchers.map((id) => id.toString()),
        ]);

        // Remove author and mentioned users
        notifySet.delete(req.user.id.toString());
        mentionedUserIds.forEach((id) => notifySet.delete(id.toString()));

        if (notifySet.size > 0) {
          await NotificationService.createForMany({
            workspaceId,
            recipientIds: Array.from(notifySet),
            actorId: req.user.id,
            type: "new_comment",
            targetType: "comment",
            targetId: comment._id,
            message: `Komentar baru di task: ${task.title}`,
            url: commentUrl,
          });
        }
      }
    } catch (err) {
      console.error(
        "Failed to trigger new_comment notification for task:",
        err,
      );
    }
  } else if (targetType === "event") {
    try {
      const Event = mongoose.model("Event");
      const event = await Event.findById(targetId).select("participants title");
      if (event) {
        const notifySet = new Set(
          event.participants.map((id) => id.toString()),
        );
        notifySet.delete(req.user.id.toString());
        mentionedUserIds.forEach((id) => notifySet.delete(id.toString()));

        if (notifySet.size > 0) {
          await NotificationService.createForMany({
            workspaceId,
            recipientIds: Array.from(notifySet),
            actorId: req.user.id,
            type: "new_comment",
            targetType: "comment",
            targetId: comment._id,
            message: `Komentar baru di event: ${event.title}`,
            url: commentUrl,
          });
        }
      }
    } catch (err) {
      console.error(
        "Failed to trigger new_comment notification for event:",
        err,
      );
    }
  }

  res.status(201).json({
    status: "success",
    data: {
      comment: fullComment,
    },
  });
});

// ──────────────────────────────────────────────
// PUT /api/comments/:commentId — Edit komentar
// ──────────────────────────────────────────────
exports.updateComment = catchAsync(async (req, res, next) => {
  const { commentId } = req.params;
  const { content, mentions } = req.body;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    return next(new AppError("Komentar tidak ditemukan", 404));
  }

  // Cek author
  if (comment.authorId.toString() !== req.user.id) {
    return next(
      new AppError("Kamu tidak bisa mengedit komentar orang lain", 403),
    );
  }

  comment.content = content || comment.content;
  comment.mentions = mentions || comment.mentions;
  comment.isEdited = true;
  await comment.save();

  // Emit socket event
  const io = getIO();
  io.to(`workspace:${comment.workspaceId}`).emit("comment:updated", {
    commentId,
    content: comment.content,
  });

  // Log activity
  await logActivity({
    workspaceId: comment.workspaceId,
    actorId: req.user.id,
    action: "comment.updated",
    targetType: "comment",
    targetId: comment._id,
    targetName: comment.content.substring(0, 50),
  });

  res.status(200).json({
    status: "success",
    data: {
      comment,
    },
  });
});

// ──────────────────────────────────────────────
// DELETE /api/comments/:commentId — Hapus komentar
// ──────────────────────────────────────────────
exports.deleteComment = catchAsync(async (req, res, next) => {
  const { commentId } = req.params;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    return next(new AppError("Komentar tidak ditemukan", 404));
  }

  // Cek permission: Author atau Admin+
  // (Untuk Admin+ check, idealnya pakai RBAC middleware, tapi kita bisa check manual di sini
  // karena rbac middleware butuh workspaceId dari params.id)
  // Kita asumsikan middleware workspaceMember() sudah dipanggil di routes
  const isAuthor = comment.authorId.toString() === req.user.id;
  const isAdmin = ["admin", "owner"].includes(req.workspaceMember?.role);

  if (!isAuthor && !isAdmin) {
    return next(
      new AppError("Kamu tidak punya izin untuk menghapus komentar ini", 403),
    );
  }

  // Soft delete
  comment.isDeleted = true;
  comment.content = "_Komentar ini telah dihapus_";
  comment.mentions = [];
  await comment.save();

  // Emit socket event
  const io = getIO();
  io.to(`workspace:${comment.workspaceId}`).emit("comment:deleted", {
    commentId,
  });

  // Log activity
  await logActivity({
    workspaceId: comment.workspaceId,
    actorId: req.user.id,
    action: "comment.deleted",
    targetType: "comment",
    targetId: comment._id,
  });

  res.status(200).json({
    status: "success",
    message: "Komentar berhasil dihapus",
  });
});

// ──────────────────────────────────────────────
// POST /api/comments/:commentId/reactions — Tambah reaction
// ──────────────────────────────────────────────
exports.addReaction = catchAsync(async (req, res, next) => {
  const { commentId } = req.params;
  const { emoji } = req.body;

  if (!emoji) {
    return next(new AppError("Emoji diperlukan", 400));
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    return next(new AppError("Komentar tidak ditemukan", 404));
  }

  // Cari emoji di array reactions
  let reaction = comment.reactions.find((r) => r.emoji === emoji);

  if (reaction) {
    // Jika emoji sudah ada, tambahkan user jika belum ada
    if (!reaction.users.includes(req.user.id)) {
      reaction.users.push(req.user.id);
    }
  } else {
    // Jika emoji baru, buat object reaction baru
    comment.reactions.push({
      emoji,
      users: [req.user.id],
    });
  }

  await comment.save();

  // Emit socket event
  const io = getIO();
  io.to(`workspace:${comment.workspaceId}`).emit("comment:reaction:added", {
    commentId,
    emoji,
    userId: req.user.id,
  });

  res.status(200).json({
    status: "success",
    data: {
      reactions: comment.reactions,
    },
  });
});

// ──────────────────────────────────────────────
// DELETE /api/comments/:commentId/reactions/:emoji — Hapus reaction
// ──────────────────────────────────────────────
exports.removeReaction = catchAsync(async (req, res, next) => {
  const { commentId, emoji } = req.params;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    return next(new AppError("Komentar tidak ditemukan", 404));
  }

  const reactionIndex = comment.reactions.findIndex((r) => r.emoji === emoji);

  if (reactionIndex !== -1) {
    // Hapus userId dari array users
    comment.reactions[reactionIndex].users = comment.reactions[
      reactionIndex
    ].users.filter((u) => u.toString() !== req.user.id);

    // Jika users kosong, hapus object reaction dari array
    if (comment.reactions[reactionIndex].users.length === 0) {
      comment.reactions.splice(reactionIndex, 1);
    }

    await comment.save();

    // Emit socket event
    const io = getIO();
    io.to(`workspace:${comment.workspaceId}`).emit("comment:reaction:removed", {
      commentId,
      emoji,
      userId: req.user.id,
    });
  }

  res.status(200).json({
    status: "success",
    data: {
      reactions: comment.reactions,
    },
  });
});

// ──────────────────────────────────────────────
// POST /api/comments/:commentId/resolve — Resolve thread
// ──────────────────────────────────────────────
exports.resolveThread = catchAsync(async (req, res, next) => {
  const { commentId } = req.params;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    return next(new AppError("Komentar tidak ditemukan", 404));
  }

  if (comment.parentCommentId) {
    return next(new AppError("Hanya komentar utama yang bisa di-resolve", 400));
  }

  comment.isResolved = true;
  comment.resolvedBy = req.user.id;
  comment.resolvedAt = new Date();
  await comment.save();

  // Emit socket event
  const io = getIO();
  io.to(`workspace:${comment.workspaceId}`).emit("comment:resolved", {
    commentId,
    resolvedBy: req.user.id,
  });

  // Log activity
  await logActivity({
    workspaceId: comment.workspaceId,
    actorId: req.user.id,
    action: "comment.resolved",
    targetType: "comment",
    targetId: comment._id,
  });

  res.status(200).json({
    status: "success",
    message: "Thread berhasil diselesaikan",
  });
});

// ──────────────────────────────────────────────
// POST /api/comments/:commentId/unresolve — Unresolve thread
// ──────────────────────────────────────────────
exports.unresolveThread = catchAsync(async (req, res, next) => {
  const { commentId } = req.params;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    return next(new AppError("Komentar tidak ditemukan", 404));
  }

  comment.isResolved = false;
  comment.resolvedBy = null;
  comment.resolvedAt = null;
  await comment.save();

  // Emit socket event
  const io = getIO();
  io.to(`workspace:${comment.workspaceId}`).emit("comment:unresolved", {
    commentId,
  });

  // Log activity
  await logActivity({
    workspaceId: comment.workspaceId,
    actorId: req.user.id,
    action: "comment.unresolved",
    targetType: "comment",
    targetId: comment._id,
  });

  res.status(200).json({
    status: "success",
    message: "Thread diaktifkan kembali",
  });
});
