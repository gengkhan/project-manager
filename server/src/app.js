const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const errorHandler = require("./middlewares/errorHandler");
const AppError = require("./utils/AppError");

const app = express();

// ────────────────────────────────────────────────────
// Security & Parsing Middleware
// ────────────────────────────────────────────────────

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL || [
      "http://localhost:3000",
      "http://localhost:3001",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(cookieParser());

// ────────────────────────────────────────────────────
// Logging
// ────────────────────────────────────────────────────

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// ────────────────────────────────────────────────────
// Health Check
// ────────────────────────────────────────────────────

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ────────────────────────────────────────────────────
// API Routes
// ────────────────────────────────────────────────────

const authRoutes = require("./routes/auth.routes");
const workspaceRoutes = require("./routes/workspace.routes");
const userRoutes = require("./routes/user.routes");
const taskRoutes = require("./routes/task.routes");
const labelRoutes = require("./routes/label.routes");
const calendarRoutes = require("./routes/calendar.routes");
const eventRoutes = require("./routes/event.routes");
const activityRoutes = require("./routes/activity.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const exportRoutes = require("./routes/export.routes");
const boardRoutes = require("./routes/board.routes");
const exportJobRoutes = require("./routes/exportJob.routes");
const notificationRoutes = require("./routes/notification.routes");
const commentRoutes = require("./routes/comment.routes");
const whatsappRoutes = require("./routes/whatsapp.routes");
const pushRoutes = require("./routes/push.routes");
const spreadsheetRoutes = require("./routes/spreadsheet.routes");
const eventNoteRoutes = require("./routes/eventNote.routes");
const embeddingRoutes = require("./routes/embedding.routes");
const copilotkitRoutes = require("./routes/copilotkit.routes");

app.use("/api/auth", authRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/users", userRoutes);
app.use("/api/workspaces/:id/tasks", taskRoutes);
app.use("/api/workspaces/:id/labels", labelRoutes);
app.use("/api/workspaces/:id/calendar", calendarRoutes);
app.use("/api/workspaces/:id/events", eventRoutes);
app.use("/api/workspaces/:id/events/:eventId/notes", eventNoteRoutes);
app.use("/api/workspaces/:id/activity", activityRoutes);
app.use("/api/workspaces/:id/dashboard", dashboardRoutes);
app.use("/api/workspaces/:id/export", exportRoutes);
app.use("/api/workspaces/:id/boards", boardRoutes);
app.use("/api/export-jobs", exportJobRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/admin/whatsapp", whatsappRoutes);
app.use("/api/push", pushRoutes);
app.use("/api/spreadsheets", spreadsheetRoutes);
app.use("/api/workspaces/:id/embeddings", embeddingRoutes);
app.use("/api/workspaces/:id/copilotkit", copilotkitRoutes);

// ────────────────────────────────────────────────────
// 404 Handler
// ────────────────────────────────────────────────────

app.all("*", (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} tidak ditemukan`, 404));
});

// ────────────────────────────────────────────────────
// Global Error Handler
// ────────────────────────────────────────────────────

app.use(errorHandler);

module.exports = app;
