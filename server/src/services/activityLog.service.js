const ActivityLog = require("../models/ActivityLog");

/**
 * Service untuk mencatat activity log
 *
 * Panggil setelah setiap aksi penting di controller.
 * Log dibuat synchronous untuk memastikan tidak ada log yang hilang.
 *
 * @param {Object} params
 * @param {string} params.workspaceId - ID workspace
 * @param {string} params.actorId - ID user yang melakukan aksi
 * @param {string} params.action - Tipe aksi (e.g. "task.created")
 * @param {string} params.targetType - Tipe target (task|event|spreadsheet|workspace|board)
 * @param {string} params.targetId - ID target
 * @param {string} params.targetName - Nama target saat aksi terjadi
 * @param {Object} [params.details] - Detail tambahan
 * @param {string} [params.details.field] - Field yang berubah
 * @param {string} [params.details.newValue] - Nilai baru
 * @param {string} [params.details.contextType] - Tipe konteks (event|workspace)
 * @param {string} [params.details.contextId] - ID konteks
 * @param {string} [params.details.contextName] - Nama konteks
 */
const log = async ({
  workspaceId,
  actorId,
  action,
  targetType,
  targetId,
  targetName,
  details = {},
}) => {
  try {
    await ActivityLog.create({
      workspaceId,
      actorId,
      action,
      targetType,
      targetId,
      targetName,
      details: {
        field: details.field || null,
        newValue: details.newValue || null,
        contextType: details.contextType || null,
        contextId: details.contextId || null,
        contextName: details.contextName || null,
      },
    });
  } catch (error) {
    // Log error tapi jangan gagalkan operasi utama
    console.error("[ActivityLog] Failed to create log:", error.message);
  }
};

module.exports = { log };
