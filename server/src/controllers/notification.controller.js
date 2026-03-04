const Notification = require("../models/Notification");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// ──────────────────────────────────────────────
// GET /api/notifications — Daftar notifikasi
// ──────────────────────────────────────────────
exports.getNotifications = catchAsync(async (req, res, next) => {
  const { since, type, limit = 20 } = req.query;

  const filter = { recipientId: req.user.id };

  if (type) {
    filter.type = type;
  }

  // Jika ada since parameter, hanya ambil yang lebih baru (untuk polling)
  if (since) {
    const sinceDate = new Date(Number(since));
    if (!isNaN(sinceDate.getTime())) {
      filter.createdAt = { $gt: sinceDate };
    }
  }

  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

  const notifications = await Notification.find(filter)
    .populate("actorId", "name avatar")
    .sort({ createdAt: -1 })
    .limit(limitNum)
    .lean();

  // Polling optimization: return 304 if no new data when using `since`
  if (since && notifications.length === 0) {
    return res.status(304).send();
  }

  res.status(200).json({
    status: "success",
    data: {
      notifications,
    },
  });
});

// ──────────────────────────────────────────────
// GET /api/notifications/unread-count — Jumlah unread
// ──────────────────────────────────────────────
exports.getUnreadCount = catchAsync(async (req, res, next) => {
  const count = await Notification.countDocuments({
    recipientId: req.user.id,
    isRead: false,
  });

  res.status(200).json({
    status: "success",
    data: {
      count,
    },
  });
});

// ──────────────────────────────────────────────
// PUT /api/notifications/:id/read — Tandai dibaca
// ──────────────────────────────────────────────
exports.markAsRead = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const notification = await Notification.findOneAndUpdate(
    { _id: id, recipientId: req.user.id },
    { $set: { isRead: true, readAt: new Date() } },
    { new: true }, // return updated
  );

  if (!notification) {
    return next(new AppError("Notifikasi tidak ditemukan", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      notification,
    },
  });
});

// ──────────────────────────────────────────────
// PUT /api/notifications/read-all — Tandai semua dibaca
// ──────────────────────────────────────────────
exports.markAllAsRead = catchAsync(async (req, res, next) => {
  const result = await Notification.updateMany(
    { recipientId: req.user.id, isRead: false },
    { $set: { isRead: true, readAt: new Date() } },
  );

  res.status(200).json({
    status: "success",
    message: `${result.modifiedCount} notifikasi ditandai dibaca`,
  });
});
