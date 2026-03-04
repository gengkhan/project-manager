const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification.controller");
const auth = require("../middlewares/auth");

// Semua endpoint butuh autentikasi
router.use(auth);

// Polling and listing
router.get("/", notificationController.getNotifications);

// Unread badge counter
router.get("/unread-count", notificationController.getUnreadCount);

// Mark read
router.put("/read-all", notificationController.markAllAsRead);
router.put("/:id/read", notificationController.markAsRead);

module.exports = router;
