const mongoose = require("mongoose");
const BrainstormingBoard = require("../models/BrainstormingBoard");
const BrainstormingWidget = require("../models/BrainstormingWidget");
const BrainstormingConnection = require("../models/BrainstormingConnection");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const ActivityLogService = require("../services/activityLog.service");
const NotificationService = require("../services/notification.service");

// Helper: get Socket.io instance (safe)
function getIO() {
  try {
    return require("../config/socket").getIO();
  } catch {
    return null;
  }
}

// Helper: emit board event to board room
function emitBoardEvent(boardId, event, data) {
  const io = getIO();
  if (io) {
    io.to(`board:${boardId}`).emit(event, data);
  }
}

// Helper: populate board fields
function populateBoard(query) {
  return query.populate("createdBy", "name email avatar");
}

// ──────────────────────────────────────────────
// GET /api/workspaces/:id/boards — Daftar board
// ──────────────────────────────────────────────
exports.listBoards = catchAsync(async (req, res) => {
  const { id: workspaceId } = req.params;
  const {
    keyword,
    sortBy = "updatedAt",
    sortOrder = "desc",
    page = 1,
    limit = 50,
  } = req.query;

  const filter = { workspaceId };

  if (keyword) {
    filter.name = { $regex: keyword, $options: "i" };
  }

  // Sort
  const allowedSortFields = ["name", "createdAt", "updatedAt"];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : "updatedAt";
  const sort = { [sortField]: sortOrder === "asc" ? 1 : -1 };

  // Pagination
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [boards, total] = await Promise.all([
    populateBoard(BrainstormingBoard.find(filter))
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    BrainstormingBoard.countDocuments(filter),
  ]);

  // Attach widget counts
  const boardsWithCounts = await Promise.all(
    boards.map(async (board) => {
      const widgetCount = await BrainstormingWidget.countDocuments({
        boardId: board._id,
      });
      return { ...board, widgetCount };
    }),
  );

  res.status(200).json({
    status: "success",
    data: {
      boards: boardsWithCounts,
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
// POST /api/workspaces/:id/boards — Buat board
// ──────────────────────────────────────────────
exports.createBoard = catchAsync(async (req, res, next) => {
  const workspace = req.workspace;
  const userId = req.user.id;
  const { name } = req.body;

  if (!name || !name.trim()) {
    return next(new AppError("Nama board harus diisi", 400));
  }

  const board = await BrainstormingBoard.create({
    workspaceId: workspace._id,
    name: name.trim(),
    createdBy: userId,
  });

  const populatedBoard = await populateBoard(
    BrainstormingBoard.findById(board._id),
  ).lean();

  // Emit to workspace room
  const io = getIO();
  if (io) {
    io.to(`workspace:${workspace._id}`).emit("board:created", {
      board: { ...populatedBoard, widgetCount: 0 },
    });
  }

  // Activity log
  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "board.created",
    targetType: "board",
    targetId: board._id,
    targetName: board.name,
  });

  res.status(201).json({
    status: "success",
    data: { board: { ...populatedBoard, widgetCount: 0 } },
  });
});

// ──────────────────────────────────────────────
// GET /api/workspaces/:id/boards/:boardId — Detail
// ──────────────────────────────────────────────
exports.getBoard = catchAsync(async (req, res, next) => {
  const { boardId } = req.params;
  const workspace = req.workspace;

  const board = await populateBoard(
    BrainstormingBoard.findOne({
      _id: boardId,
      workspaceId: workspace._id,
    }),
  ).lean();

  if (!board) {
    return next(new AppError("Board tidak ditemukan", 404));
  }

  // Fetch widgets and connections
  const [widgets, connections] = await Promise.all([
    BrainstormingWidget.find({ boardId: board._id })
      .populate("createdBy", "name email avatar")
      .lean(),
    BrainstormingConnection.find({ boardId: board._id }).lean(),
  ]);

  res.status(200).json({
    status: "success",
    data: { board, widgets, connections },
  });
});

// ──────────────────────────────────────────────
// PUT /api/workspaces/:id/boards/:boardId — Update
// ──────────────────────────────────────────────
exports.updateBoard = catchAsync(async (req, res, next) => {
  const { boardId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;
  const { name } = req.body;

  const board = await BrainstormingBoard.findOne({
    _id: boardId,
    workspaceId: workspace._id,
  });

  if (!board) {
    return next(new AppError("Board tidak ditemukan", 404));
  }

  if (name !== undefined) {
    if (!name.trim()) {
      return next(new AppError("Nama board tidak boleh kosong", 400));
    }
    board.name = name.trim();
  }

  await board.save();

  const populatedBoard = await populateBoard(
    BrainstormingBoard.findById(board._id),
  ).lean();

  // Emit to workspace room
  const io = getIO();
  if (io) {
    io.to(`workspace:${workspace._id}`).emit("board:updated", {
      board: populatedBoard,
    });
  }

  // Activity log
  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "board.updated",
    targetType: "board",
    targetId: board._id,
    targetName: board.name,
  });

  res.status(200).json({
    status: "success",
    data: { board: populatedBoard },
  });
});

// ──────────────────────────────────────────────
// DELETE /api/workspaces/:id/boards/:boardId — Hapus
// ──────────────────────────────────────────────
exports.deleteBoard = catchAsync(async (req, res, next) => {
  const { boardId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const board = await BrainstormingBoard.findOne({
    _id: boardId,
    workspaceId: workspace._id,
  });

  if (!board) {
    return next(new AppError("Board tidak ditemukan", 404));
  }

  board.isDeleted = true;
  board.deletedAt = new Date();
  await board.save();

  // Emit to workspace room
  const io = getIO();
  if (io) {
    io.to(`workspace:${workspace._id}`).emit("board:deleted", { boardId });
  }

  // Activity log
  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "board.deleted",
    targetType: "board",
    targetId: board._id,
    targetName: board.name,
  });

  res.status(200).json({
    status: "success",
    message: "Board berhasil dihapus",
  });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/boards/:boardId/duplicate
// ──────────────────────────────────────────────
exports.duplicateBoard = catchAsync(async (req, res, next) => {
  const { boardId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const originalBoard = await BrainstormingBoard.findOne({
    _id: boardId,
    workspaceId: workspace._id,
  });

  if (!originalBoard) {
    return next(new AppError("Board tidak ditemukan", 404));
  }

  // Create duplicate board
  const newBoard = await BrainstormingBoard.create({
    workspaceId: workspace._id,
    name: `${originalBoard.name} (Salinan)`,
    createdBy: userId,
  });

  // Duplicate widgets
  const originalWidgets = await BrainstormingWidget.find({
    boardId: originalBoard._id,
  }).lean();

  const widgetIdMap = new Map(); // old ID -> new ID

  if (originalWidgets.length > 0) {
    const newWidgets = originalWidgets.map((w) => {
      const newId = new mongoose.Types.ObjectId();
      widgetIdMap.set(w._id.toString(), newId);
      return {
        _id: newId,
        boardId: newBoard._id,
        type: w.type,
        x: w.x,
        y: w.y,
        width: w.width,
        height: w.height,
        zIndex: w.zIndex,
        isLocked: w.isLocked,
        isCollapsed: w.isCollapsed,
        data: w.data,
        createdBy: userId,
      };
    });
    await BrainstormingWidget.insertMany(newWidgets);
  }

  // Duplicate connections (remap widget IDs)
  const originalConnections = await BrainstormingConnection.find({
    boardId: originalBoard._id,
  }).lean();

  if (originalConnections.length > 0) {
    const newConnections = originalConnections
      .filter(
        (c) =>
          widgetIdMap.has(c.fromWidgetId.toString()) &&
          widgetIdMap.has(c.toWidgetId.toString()),
      )
      .map((c) => ({
        boardId: newBoard._id,
        fromWidgetId: widgetIdMap.get(c.fromWidgetId.toString()),
        fromSide: c.fromSide,
        toWidgetId: widgetIdMap.get(c.toWidgetId.toString()),
        toSide: c.toSide,
        lineStyle: c.lineStyle,
        color: c.color,
        arrowType: c.arrowType,
        label: c.label,
      }));
    await BrainstormingConnection.insertMany(newConnections);
  }

  const populatedBoard = await populateBoard(
    BrainstormingBoard.findById(newBoard._id),
  ).lean();

  // Emit to workspace room
  const io = getIO();
  if (io) {
    io.to(`workspace:${workspace._id}`).emit("board:created", {
      board: { ...populatedBoard, widgetCount: originalWidgets.length },
    });
  }

  // Activity log
  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "board.duplicated",
    targetType: "board",
    targetId: newBoard._id,
    targetName: newBoard.name,
    details: { sourceBoard: originalBoard.name },
  });

  res.status(201).json({
    status: "success",
    data: {
      board: { ...populatedBoard, widgetCount: originalWidgets.length },
    },
  });
});

// ════════════════════════════════════════════════
// WIDGET ENDPOINTS
// ════════════════════════════════════════════════

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/boards/:boardId/widgets
// ──────────────────────────────────────────────
exports.addWidget = catchAsync(async (req, res, next) => {
  const { boardId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;
  const { type, x, y, width, height, data } = req.body;

  // Verify board exists
  const board = await BrainstormingBoard.findOne({
    _id: boardId,
    workspaceId: workspace._id,
  });

  if (!board) {
    return next(new AppError("Board tidak ditemukan", 404));
  }

  if (!type) {
    return next(new AppError("Tipe widget harus diisi", 400));
  }

  // Get max zIndex for this board
  const topWidget = await BrainstormingWidget.findOne({ boardId })
    .sort({ zIndex: -1 })
    .lean();
  const newZIndex = topWidget ? topWidget.zIndex + 1 : 0;

  const widget = await BrainstormingWidget.create({
    boardId,
    type,
    x: x || 0,
    y: y || 0,
    width: width || 300,
    height: height || 200,
    zIndex: newZIndex,
    data: data || {},
    createdBy: userId,
  });

  const populatedWidget = await BrainstormingWidget.findById(widget._id)
    .populate("createdBy", "name email avatar")
    .lean();

  // Emit to board room
  emitBoardEvent(boardId, "board:widget:added", {
    boardId,
    widget: populatedWidget,
  });

  res.status(201).json({
    status: "success",
    data: { widget: populatedWidget },
  });
});

// ──────────────────────────────────────────────
// PUT /api/workspaces/:id/boards/:boardId/widgets/:widgetId
// ──────────────────────────────────────────────
exports.updateWidget = catchAsync(async (req, res, next) => {
  const { boardId, widgetId } = req.params;
  const workspace = req.workspace;
  const { x, y, width, height, zIndex, isLocked, isCollapsed, data } = req.body;

  // Verify board exists
  const board = await BrainstormingBoard.findOne({
    _id: boardId,
    workspaceId: workspace._id,
  });

  if (!board) {
    return next(new AppError("Board tidak ditemukan", 404));
  }

  const widget = await BrainstormingWidget.findOne({
    _id: widgetId,
    boardId,
  });

  if (!widget) {
    return next(new AppError("Widget tidak ditemukan", 404));
  }

  // Check if widget is locked (only allow unlock operation)
  if (widget.isLocked && isLocked !== false) {
    return next(new AppError("Widget terkunci. Unlock terlebih dahulu.", 400));
  }

  // Capture old mentions before merge (for notification diff)
  const oldWidgetMentions =
    data !== undefined && widget.type === "text" && widget.data?.mentions
      ? [...widget.data.mentions]
      : [];

  // Update allowed fields
  if (x !== undefined) widget.x = x;
  if (y !== undefined) widget.y = y;
  if (width !== undefined) widget.width = width;
  if (height !== undefined) widget.height = height;
  if (zIndex !== undefined) widget.zIndex = zIndex;
  if (isLocked !== undefined) widget.isLocked = isLocked;
  if (isCollapsed !== undefined) widget.isCollapsed = isCollapsed;
  if (data !== undefined) widget.data = { ...widget.data, ...data };

  await widget.save();

  const updatedWidget = await BrainstormingWidget.findById(widget._id)
    .populate("createdBy", "name email avatar")
    .lean();

  // Determine the right event type
  let eventType = "board:widget:updated";
  const changes = req.body;

  if (
    Object.keys(changes).length === 2 &&
    changes.x !== undefined &&
    changes.y !== undefined
  ) {
    eventType = "board:widget:moved";
    emitBoardEvent(boardId, eventType, {
      boardId,
      widgetId,
      x: changes.x,
      y: changes.y,
    });
  } else if (
    Object.keys(changes).length === 2 &&
    changes.width !== undefined &&
    changes.height !== undefined
  ) {
    eventType = "board:widget:resized";
    emitBoardEvent(boardId, eventType, {
      boardId,
      widgetId,
      width: changes.width,
      height: changes.height,
    });
  } else {
    emitBoardEvent(boardId, eventType, {
      boardId,
      widgetId,
      changes,
      widget: updatedWidget,
    });
  }

  // ── Mention Notifications (for text widgets with @mention) ──
  if (
    data !== undefined &&
    widget.type === "text" &&
    Array.isArray(data.mentions) &&
    data.mentions.length > 0
  ) {
    try {
      const oldIds = oldWidgetMentions.map((m) => m.userId?.toString());
      const newIds = data.mentions.map((m) => m.userId?.toString());
      const newlyMentioned = newIds.filter((id) => id && !oldIds.includes(id));

      if (newlyMentioned.length > 0) {
        const boardUrl = `/workspace/${workspace._id}/brainstorming/${boardId}`;
        const widgetTitle =
          data.title || updatedWidget?.data?.title || "Catatan";
        await NotificationService.createForMany({
          workspaceId: workspace._id,
          recipientIds: newlyMentioned,
          actorId: req.user.id,
          type: "mention",
          targetType: "board",
          targetId: boardId,
          message: `menyebut kamu di Brainstorming widget "${widgetTitle}"`,
          url: boardUrl,
        });
      }
    } catch (err) {
      console.error("Widget mention notification error:", err);
    }
  }

  res.status(200).json({
    status: "success",
    data: { widget: updatedWidget },
  });
});

// ──────────────────────────────────────────────
// DELETE /api/workspaces/:id/boards/:boardId/widgets/:widgetId
// ──────────────────────────────────────────────
exports.deleteWidget = catchAsync(async (req, res, next) => {
  const { boardId, widgetId } = req.params;
  const workspace = req.workspace;

  // Verify board exists
  const board = await BrainstormingBoard.findOne({
    _id: boardId,
    workspaceId: workspace._id,
  });

  if (!board) {
    return next(new AppError("Board tidak ditemukan", 404));
  }

  const widget = await BrainstormingWidget.findOne({
    _id: widgetId,
    boardId,
  });

  if (!widget) {
    return next(new AppError("Widget tidak ditemukan", 404));
  }

  // Delete the widget
  await widget.deleteOne();

  // Also delete connections involving this widget
  await BrainstormingConnection.deleteMany({
    boardId,
    $or: [{ fromWidgetId: widgetId }, { toWidgetId: widgetId }],
  });

  // Emit to board room
  emitBoardEvent(boardId, "board:widget:deleted", { boardId, widgetId });

  res.status(200).json({
    status: "success",
    message: "Widget berhasil dihapus",
  });
});

// ════════════════════════════════════════════════
// CONNECTION ENDPOINTS
// ════════════════════════════════════════════════

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/boards/:boardId/connections
// ──────────────────────────────────────────────
exports.addConnection = catchAsync(async (req, res, next) => {
  const { boardId } = req.params;
  const workspace = req.workspace;
  const {
    fromWidgetId,
    fromSide,
    toWidgetId,
    toSide,
    lineStyle,
    color,
    arrowType,
    label,
  } = req.body;

  // Verify board exists
  const board = await BrainstormingBoard.findOne({
    _id: boardId,
    workspaceId: workspace._id,
  });

  if (!board) {
    return next(new AppError("Board tidak ditemukan", 404));
  }

  if (!fromWidgetId || !toWidgetId) {
    return next(new AppError("fromWidgetId dan toWidgetId harus diisi", 400));
  }

  if (fromWidgetId === toWidgetId) {
    return next(
      new AppError("Tidak bisa membuat koneksi ke widget yang sama", 400),
    );
  }

  // Verify both widgets exist
  const [fromWidget, toWidget] = await Promise.all([
    BrainstormingWidget.findOne({ _id: fromWidgetId, boardId }),
    BrainstormingWidget.findOne({ _id: toWidgetId, boardId }),
  ]);

  if (!fromWidget || !toWidget) {
    return next(new AppError("Widget sumber atau tujuan tidak ditemukan", 404));
  }

  const connection = await BrainstormingConnection.create({
    boardId,
    fromWidgetId,
    fromSide: fromSide || "right",
    toWidgetId,
    toSide: toSide || "left",
    lineStyle: lineStyle || "solid",
    color: color || "#6b7280",
    arrowType: arrowType || "one-way",
    label: label || null,
  });

  // Emit to board room
  emitBoardEvent(boardId, "board:connection:added", {
    boardId,
    connection,
  });

  res.status(201).json({
    status: "success",
    data: { connection },
  });
});

// ──────────────────────────────────────────────
// PUT /api/workspaces/:id/boards/:boardId/connections/:connId
// ──────────────────────────────────────────────
exports.updateConnection = catchAsync(async (req, res, next) => {
  const { boardId, connId } = req.params;
  const workspace = req.workspace;
  const { lineStyle, color, arrowType, label } = req.body;

  // Verify board exists
  const board = await BrainstormingBoard.findOne({
    _id: boardId,
    workspaceId: workspace._id,
  });

  if (!board) {
    return next(new AppError("Board tidak ditemukan", 404));
  }

  const connection = await BrainstormingConnection.findOne({
    _id: connId,
    boardId,
  });

  if (!connection) {
    return next(new AppError("Koneksi tidak ditemukan", 404));
  }

  if (lineStyle !== undefined) connection.lineStyle = lineStyle;
  if (color !== undefined) connection.color = color;
  if (arrowType !== undefined) connection.arrowType = arrowType;
  if (label !== undefined) connection.label = label;

  await connection.save();

  // Emit to board room
  emitBoardEvent(boardId, "board:connection:updated", {
    boardId,
    connectionId: connId,
    changes: req.body,
    connection,
  });

  res.status(200).json({
    status: "success",
    data: { connection },
  });
});

// ──────────────────────────────────────────────
// DELETE /api/workspaces/:id/boards/:boardId/connections/:connId
// ──────────────────────────────────────────────
exports.deleteConnection = catchAsync(async (req, res, next) => {
  const { boardId, connId } = req.params;
  const workspace = req.workspace;

  // Verify board exists
  const board = await BrainstormingBoard.findOne({
    _id: boardId,
    workspaceId: workspace._id,
  });

  if (!board) {
    return next(new AppError("Board tidak ditemukan", 404));
  }

  const connection = await BrainstormingConnection.findOne({
    _id: connId,
    boardId,
  });

  if (!connection) {
    return next(new AppError("Koneksi tidak ditemukan", 404));
  }

  await connection.deleteOne();

  // Emit to board room
  emitBoardEvent(boardId, "board:connection:deleted", {
    boardId,
    connectionId: connId,
  });

  res.status(200).json({
    status: "success",
    message: "Koneksi berhasil dihapus",
  });
});
