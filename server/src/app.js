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

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/workspaces", require("./routes/workspace.routes"));
app.use("/api/users", require("./routes/user.routes"));
app.use("/api/workspaces/:id/tasks", require("./routes/task.routes"));
app.use("/api/workspaces/:id/labels", require("./routes/label.routes"));
app.use("/api/workspaces/:id/calendar", require("./routes/calendar.routes"));
app.use("/api/workspaces/:id/events", require("./routes/event.routes"));
app.use("/api/workspaces/:id/activity", require("./routes/activity.routes"));
app.use("/api/workspaces/:id/export", require("./routes/export.routes"));
app.use("/api/export-jobs", require("./routes/exportJob.routes"));
app.use("/api/notifications", require("./routes/notification.routes"));
app.use("/api/comments", require("./routes/comment.routes"));

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
