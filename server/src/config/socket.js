const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

let io;

// ─── In-memory presence store ────────────────────────
// Map<userId, { socketIds: Set, workspaceIds: Set, lastSeen: Date, disconnectTimer: Timeout | null }>
const presenceMap = new Map();

// Grace period before marking user as offline (ms)
const GRACE_PERIOD = 30000; // 30 seconds

// ─── Presence helpers ────────────────────────────────
function setUserOnline(userId, socketId) {
  if (!presenceMap.has(userId)) {
    presenceMap.set(userId, {
      socketIds: new Set(),
      workspaceIds: new Set(),
      lastSeen: new Date(),
      disconnectTimer: null,
    });
  }

  const presence = presenceMap.get(userId);

  // Clear any pending disconnect timer (reconnect within grace period)
  if (presence.disconnectTimer) {
    clearTimeout(presence.disconnectTimer);
    presence.disconnectTimer = null;
  }

  presence.socketIds.add(socketId);
  presence.lastSeen = new Date();
}

function addUserToWorkspace(userId, workspaceId) {
  const presence = presenceMap.get(userId);
  if (!presence) return;

  const wasInWorkspace = presence.workspaceIds.has(workspaceId);
  presence.workspaceIds.add(workspaceId);

  // Broadcast online event only if user just joined this workspace
  if (!wasInWorkspace && io) {
    io.to(`workspace:${workspaceId}`).emit("user:online", {
      userId,
      workspaceId,
    });
  }
}

function removeUserFromWorkspace(userId, workspaceId) {
  const presence = presenceMap.get(userId);
  if (!presence) return;

  presence.workspaceIds.delete(workspaceId);
}

function handleSocketDisconnect(userId, socketId) {
  const presence = presenceMap.get(userId);
  if (!presence) return;

  presence.socketIds.delete(socketId);

  // If user has no more active sockets, start grace period
  if (presence.socketIds.size === 0) {
    presence.disconnectTimer = setTimeout(() => {
      // After grace period, broadcast offline to all workspaces
      const lastSeen = new Date();
      for (const workspaceId of presence.workspaceIds) {
        if (io) {
          io.to(`workspace:${workspaceId}`).emit("user:offline", {
            userId,
            workspaceId,
            lastSeen,
          });
        }
      }
      presenceMap.delete(userId);
    }, GRACE_PERIOD);
  }
}

function getOnlineMembers(workspaceId) {
  const onlineMembers = [];
  for (const [userId, presence] of presenceMap) {
    if (presence.workspaceIds.has(workspaceId) && presence.socketIds.size > 0) {
      onlineMembers.push({
        userId,
        isOnline: true,
        lastSeen: presence.lastSeen,
      });
    }
  }
  return onlineMembers;
}

// ─── Socket initialization ──────────────────────────
const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // ── Authentication middleware ──────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Authentication required"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userEmail = decoded.email;
      next();
    } catch (err) {
      return next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.userId;
    logger.debug(`Socket connected: ${socket.id} (user: ${userId})`);

    // Mark user as online
    setUserOnline(userId, socket.id);

    // ── Join workspace room ────────────────────────
    socket.on("workspace:join", (workspaceId) => {
      socket.join(`workspace:${workspaceId}`);
      addUserToWorkspace(userId, workspaceId);
      logger.debug(`Socket ${socket.id} joined workspace:${workspaceId}`);
    });

    socket.on("workspace:leave", (workspaceId) => {
      socket.leave(`workspace:${workspaceId}`);
      removeUserFromWorkspace(userId, workspaceId);
      logger.debug(`Socket ${socket.id} left workspace:${workspaceId}`);
    });

    // ── Join board room (brainstorming) ────────────
    socket.on("board:join", (boardId) => {
      socket.join(`board:${boardId}`);
    });

    socket.on("board:leave", (boardId) => {
      socket.leave(`board:${boardId}`);
    });

    // ── Join sheet room (spreadsheet — legacy) ──────
    socket.on("sheet:join", (sheetId) => {
      socket.join(`sheet:${sheetId}`);
    });

    socket.on("sheet:leave", (sheetId) => {
      socket.leave(`sheet:${sheetId}`);
    });

    // ── Join workbook room (spreadsheet collaboration) ──
    socket.on("workbook:join", (eventId) => {
      socket.join(`workbook:${eventId}`);
      socket.workbookEventId = eventId;
      logger.debug(`Socket ${socket.id} joined workbook:${eventId}`);
    });

    socket.on("workbook:leave", (eventId) => {
      socket.leave(`workbook:${eventId}`);
      // Broadcast removePresences to others when leaving
      if (socket.workbookPresences) {
        socket
          .to(`workbook:${eventId}`)
          .emit("workbook:removePresences", socket.workbookPresences);
        socket.workbookPresences = null;
      }
      socket.workbookEventId = null;
    });

    // ── Workbook: forward ops to other collaborators ──
    socket.on("workbook:op", async (msg) => {
      const eventId = socket.workbookEventId || msg.eventId;
      if (!eventId || !Array.isArray(msg.ops)) return;
      try {
        // Persist ops in MongoDB
        const SpreadsheetSheetData = require("../models/SpreadsheetSheetData");
        const { applyOp } = require("../utils/applyOp");
        await applyOp(SpreadsheetSheetData, eventId, msg.ops);
        // Broadcast to other users in the room
        socket.to(`workbook:${eventId}`).emit("workbook:op", {
          eventId,
          ops: msg.ops,
          userId,
        });
      } catch (err) {
        logger.error(`workbook:op error: ${err.message}`);
        socket.emit("workbook:op:error", {
          message: err.message,
        });
      }
    });

    // ── Workbook: cursor / selection presence ──
    socket.on("workbook:addPresences", (data) => {
      const eventId = socket.workbookEventId;
      if (!eventId) return;
      socket.workbookPresences = data;
      socket.to(`workbook:${eventId}`).emit("workbook:addPresences", data);
    });

    socket.on("workbook:removePresences", (data) => {
      const eventId = socket.workbookEventId;
      if (!eventId) return;
      socket.to(`workbook:${eventId}`).emit("workbook:removePresences", data);
    });

    // ── Presence heartbeat ─────────────────────────
    socket.on("presence:heartbeat", (data) => {
      const presence = presenceMap.get(userId);
      if (presence) {
        presence.lastSeen = new Date();
      }
    });

    // ── Request online members for a workspace ─────
    socket.on("presence:members", (workspaceId) => {
      const members = getOnlineMembers(workspaceId);
      socket.emit("presence:members", members);
    });

    // ── Disconnect ─────────────────────────────────
    socket.on("disconnect", (reason) => {
      logger.debug(`Socket disconnected: ${socket.id} (${reason})`);
      // Broadcast removePresences for workbook collaboration
      if (socket.workbookEventId && socket.workbookPresences) {
        socket
          .to(`workbook:${socket.workbookEventId}`)
          .emit("workbook:removePresences", socket.workbookPresences);
      }
      handleSocketDisconnect(userId, socket.id);
    });
  });

  logger.info("Socket.io terinisialisasi (with presence system)");
  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io belum diinisialisasi");
  }
  return io;
};

module.exports = { initializeSocket, getIO, getOnlineMembers };
