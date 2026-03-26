require("dotenv").config();

const http = require("http");
const app = require("./src/app");
const connectDB = require("./src/config/db");
const { initializeSocket } = require("./src/config/socket");
const logger = require("./src/utils/logger");

const startDueDateReminderJob = require("./src/jobs/dueDateReminder.job");
const startEventReminderJob = require("./src/jobs/eventStartReminder.job");
// const startEmbeddingReindexJob = require("./src/jobs/embeddingReindex.job");
const whatsappService = require("./src/services/whatsapp.service");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Koneksi ke MongoDB
  await connectDB();

  // Buat HTTP server
  const server = http.createServer(app);

  // Inisialisasi Socket.io
  initializeSocket(server);

  // Inisialisasi WhatsApp Service
  if (process.env.WHATSAPP_ENABLED === "true") {
    whatsappService.initialize();
  }

  // Start server
  server.listen(PORT, () => {
    logger.info(
      `Server berjalan di port ${PORT} (${process.env.NODE_ENV || "development"})`,
    );
    logger.info(`Health check: http://localhost:${PORT}/api/health`);

    // Start cron jobs
    startDueDateReminderJob();
    startEventReminderJob();
    // startEmbeddingReindexJob();
    logger.info("Cron jobs started: Due Date Reminders, Event Start Reminders");
  });

  // Graceful shutdown
  const gracefulShutdown = (signal) => {
    logger.info(`${signal} diterima. Mematikan server...`);
    server.close(() => {
      logger.info("HTTP server ditutup");
      const mongoose = require("mongoose");
      mongoose.connection.close(false, () => {
        logger.info("MongoDB connection ditutup");
        process.exit(0);
      });
    });

    // Paksa tutup setelah 10 detik
    setTimeout(() => {
      logger.error(
        "Tidak bisa menutup koneksi dengan bersih, memaksa shutdown",
      );
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  // Handle unhandled rejections
  process.on("unhandledRejection", (err) => {
    logger.error("UNHANDLED REJECTION:", err);
    gracefulShutdown("UNHANDLED REJECTION");
  });

  // Handle uncaught exceptions
  process.on("uncaughtException", (err) => {
    logger.error("UNCAUGHT EXCEPTION:", err);
    process.exit(1);
  });
};

startServer();
