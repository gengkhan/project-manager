const Notification = require("../models/Notification");
const User = require("../models/User");

/**
 * Helper to check if a user wants to receive this type of in-app notification
 */
const _wantsInAppNotification = (user, type) => {
  if (!user || !user.notificationPreferences) return true; // Default true if no pref

  // Map notification type to preference key
  const prefMap = {
    mention: "mention",
    assign_task: "assignTask",
    due_date: "dueDate",
    new_comment: "newComment",
    new_member: "newMember",
    event_start: "eventStart",
    task_update: "taskUpdate",
  };

  const prefKey = prefMap[type];
  if (!prefKey) return true;

  return user.notificationPreferences[prefKey]?.inApp !== false;
};

/**
 * Service untuk membuat notifikasi in-app
 *
 * @param {Object} params
 * @param {string} params.workspaceId - ID workspace
 * @param {string} params.recipientId - ID user yang menerima
 * @param {string} [params.actorId] - ID user yang melakukan aksi (optional for system)
 * @param {string} params.type - Tipe notifikasi (mention|assign_task|due_date|...)
 * @param {string} params.targetType - Tipe objek (task|event|workspace|comment)
 * @param {string} params.targetId - ID referensi objek
 * @param {string} params.message - Pesan yang akan ditampilkan
 * @param {string} params.url - URL / route tujuan saat diklik
 */
const create = async ({
  workspaceId,
  recipientId,
  actorId,
  type,
  targetType,
  targetId,
  message,
  url,
}) => {
  try {
    // Jangan kirim notifikasi ke diri sendiri
    if (actorId && actorId.toString() === recipientId.toString()) {
      return null;
    }

    // Ambil user preferences
    const user = await User.findById(recipientId).select(
      "notificationPreferences",
    );
    if (!user) return null;

    if (!_wantsInAppNotification(user, type)) {
      return null;
    }

    const notification = await Notification.create({
      workspaceId,
      recipientId,
      actorId: actorId || null,
      type,
      targetType,
      targetId,
      message,
      url,
    });

    return notification;
  } catch (error) {
    console.error(
      "[NotificationService] Failed to create notification:",
      error,
    );
    return null;
  }
};

/**
 * Service untuk membuat notifikasi in-app ke banyak user sekaligus
 *
 * @param {Object} params
 * @param {string} params.workspaceId - ID workspace
 * @param {string[]} params.recipientIds - Array ID user yang menerima
 * @param {string} [params.actorId] - ID user yang melakukan aksi
 * @param {string} params.type - Tipe notifikasi
 * @param {string} params.targetType - Tipe objek
 * @param {string} params.targetId - ID referensi objek
 * @param {string} params.message - Pesan yang akan ditampilkan
 * @param {string} params.url - URL / route tujuan saat diklik
 */
const createForMany = async ({
  workspaceId,
  recipientIds,
  actorId,
  type,
  targetType,
  targetId,
  message,
  url,
}) => {
  try {
    if (!recipientIds || recipientIds.length === 0) return [];

    // Filter out actorId
    const targetRecipients = actorId
      ? recipientIds.filter((id) => id.toString() !== actorId.toString())
      : recipientIds;

    if (targetRecipients.length === 0) return [];

    // Fetch preferences for all recipients
    const users = await User.find({ _id: { $in: targetRecipients } }).select(
      "_id notificationPreferences",
    );

    // Filter members based on their preferences
    const validRecipients = users
      .filter((u) => _wantsInAppNotification(u, type))
      .map((u) => u._id);

    if (validRecipients.length === 0) return [];

    // Prepare payload
    const payload = validRecipients.map((recipientId) => ({
      workspaceId,
      recipientId,
      actorId: actorId || null,
      type,
      targetType,
      targetId,
      message,
      url,
      isRead: false,
    }));

    const result = await Notification.insertMany(payload);
    return result;
  } catch (error) {
    console.error(
      "[NotificationService] Failed to create bulk notifications:",
      error,
    );
    return [];
  }
};

module.exports = {
  create,
  createForMany,
};
