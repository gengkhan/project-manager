const cron = require("node-cron");
const Event = require("../models/Event");
const NotificationService = require("../services/notification.service");

// Runs everyday at 08:00 WIB (01:00 UTC)
const startEventReminderJob = () => {
  cron.schedule("0 1 * * *", async () => {
    console.log("[Cron] Running eventStartReminder job");
    try {
      const now = new Date();
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);

      // Find events starting today
      const events = await Event.find({
        startDate: {
          $gte: todayStart,
          $lt: tomorrowStart,
        },
        status: { $ne: "completed" },
        isDeleted: false,
      }).select("title participants workspaceId");

      for (const event of events) {
        if (event.participants && event.participants.length > 0) {
          const participantIds = event.participants.map((id) => id.toString());
          await NotificationService.createForMany({
            workspaceId: event.workspaceId,
            recipientIds: participantIds,
            type: "event_start",
            targetType: "event",
            targetId: event._id,
            message: `Event hari ini: ${event.title}`,
            url: `/workspace/${event.workspaceId}/events/${event._id}`,
          });
        }
      }

      console.log("[Cron] eventStartReminder job finished");
    } catch (err) {
      console.error("[Cron] Error in eventStartReminder job:", err);
    }
  });
};

module.exports = startEventReminderJob;
