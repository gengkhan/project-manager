const cron = require("node-cron");
const Task = require("../models/Task");
const User = require("../models/User");
const NotificationService = require("../services/notification.service");

// Runs everyday at 08:00 WIB (01:00 UTC)
const startDueDateReminderJob = () => {
  cron.schedule("0 1 * * *", async () => {
    console.log("[Cron] Running dueDateReminder job");
    try {
      const now = new Date();
      // Reset to start of day for accurate comparison
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const dayAfter3 = new Date(today);
      dayAfter3.setDate(dayAfter3.getDate() + 3);

      // Fetch all tasks with dueDate that are not done or archived
      const tasks = await Task.find({
        dueDate: { $ne: null },
        status: { $ne: "done" },
        isArchived: false,
        isDeleted: false,
      }).select("title dueDate assignees watchers workspaceId");

      if (tasks.length === 0) return;

      // Map users who need a reminder
      const userIds = new Set();
      tasks.forEach((t) => {
        t.assignees.forEach((id) => userIds.add(id.toString()));
        t.watchers.forEach((id) => userIds.add(id.toString()));
      });

      // Get user reminder preferences
      const users = await User.find({
        _id: { $in: Array.from(userIds) },
      }).select("dueDateReminders");

      const userPrefsMap = {};
      users.forEach((u) => {
        userPrefsMap[u._id.toString()] = u.dueDateReminders || ["H", "H-1"];
      });

      for (const task of tasks) {
        const taskDate = new Date(task.dueDate);
        const taskDay = new Date(
          taskDate.getFullYear(),
          taskDate.getMonth(),
          taskDate.getDate(),
        );

        const diffTime = taskDay.getTime() - today.getTime();
        const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

        let reminderTypeStr = null;
        let messageStr = "";

        if (diffDays === 0) {
          reminderTypeStr = "H"; // Hari H
          messageStr = `Tenggat waktu hari ini: ${task.title}`;
        } else if (diffDays === 1) {
          reminderTypeStr = "H-1";
          messageStr = `Tenggat waktu besok: ${task.title}`;
        } else if (diffDays === 3) {
          reminderTypeStr = "H-3";
          messageStr = `Tenggat waktu 3 hari lagi: ${task.title}`;
        }

        if (reminderTypeStr) {
          const taskUsers = new Set([
            ...task.assignees.map((id) => id.toString()),
            ...task.watchers.map((id) => id.toString()),
          ]);

          // Filter users who want this exact reminder type
          const targetUserIds = Array.from(taskUsers).filter((userId) => {
            const prefs = userPrefsMap[userId];
            return prefs && prefs.includes(reminderTypeStr);
          });

          if (targetUserIds.length > 0) {
            await NotificationService.createForMany({
              workspaceId: task.workspaceId,
              recipientIds: targetUserIds,
              type: "due_date",
              targetType: "task",
              targetId: task._id,
              message: messageStr,
              url: `/workspace/${task.workspaceId}/tasks/${task._id}`,
            });
          }
        }
      }

      console.log("[Cron] dueDateReminder job finished");
    } catch (err) {
      console.error("[Cron] Error in dueDateReminder job:", err);
    }
  });
};

module.exports = startDueDateReminderJob;
