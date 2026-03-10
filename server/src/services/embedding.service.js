const { GoogleGenerativeAI } = require("@google/generative-ai");
const Embedding = require("../models/Embedding");
const Task = require("../models/Task");
const Event = require("../models/Event");
const Comment = require("../models/Comment");
const ActivityLog = require("../models/ActivityLog");
const WorkspaceMember = require("../models/WorkspaceMember");
const WorkspaceLabel = require("../models/WorkspaceLabel");
const User = require("../models/User");
const EventNote = require("../models/EventNote");
const EventDivision = require("../models/EventDivision");
const BrainstormingBoard = require("../models/BrainstormingBoard");
const SpreadsheetSheetData = require("../models/SpreadsheetSheetData");
const SpreadsheetWorkbook = require("../models/SpreadsheetWorkbook");

// ── Config ───────────────────────────────────────────
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-004";
const RAG_CHUNK_SIZE = parseInt(process.env.RAG_CHUNK_SIZE) || 1000;
const RAG_CHUNK_OVERLAP = parseInt(process.env.RAG_CHUNK_OVERLAP) || 100;

let genAI = null;

/**
 * Lazy-init Google Generative AI client
 */
const getGenAI = () => {
  if (!genAI) {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_AI_API_KEY belum diset di environment variables");
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
};

// ════════════════════════════════════════════════════
// EMBEDDING GENERATION
// ════════════════════════════════════════════════════

/**
 * Generate embedding vector dari teks menggunakan Google text-embedding-004
 * @param {string} text - teks yang akan di-embed
 * @returns {Promise<number[]>} array 768 dimensi
 */
const generateEmbedding = async (text) => {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({ model: EMBEDDING_MODEL });
  const result = await model.embedContent(text);
  return result.embedding.values;
};

/**
 * Pecah teks panjang menjadi beberapa chunk dengan overlap
 * @param {string} text
 * @returns {string[]}
 */
const chunkText = (text) => {
  if (!text || text.length <= RAG_CHUNK_SIZE) return [text || ""];

  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + RAG_CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end));
    start = end - RAG_CHUNK_OVERLAP;
    if (start >= text.length) break;
  }
  return chunks;
};

// ════════════════════════════════════════════════════
// CONTENT BUILDERS — build embeddable text per source type
// ════════════════════════════════════════════════════

const _buildTaskContent = (task, columnName = null) => {
  const parts = [`Task: ${task.title}`];
  if (columnName) parts.push(`Status: ${columnName}`);
  if (task.priority) parts.push(`Prioritas: ${task.priority}`);
  if (task.dueDate)
    parts.push(
      `Due Date: ${new Date(task.dueDate).toLocaleDateString("id-ID")}`,
    );
  if (task.startDate)
    parts.push(
      `Start Date: ${new Date(task.startDate).toLocaleDateString("id-ID")}`,
    );

  // Assignee names
  if (task.assignees && task.assignees.length > 0) {
    const names = task.assignees
      .map((a) => (typeof a === "object" && a.name ? a.name : a))
      .filter(Boolean);
    if (names.length > 0) parts.push(`Assignee: ${names.join(", ")}`);
  }

  // Labels
  if (task.labels && task.labels.length > 0) {
    const labelNames = task.labels
      .map((l) => (typeof l === "object" && l.name ? l.name : l))
      .filter(Boolean);
    if (labelNames.length > 0) parts.push(`Label: ${labelNames.join(", ")}`);
  }

  // Description (plain text, strip potential JSON/HTML)
  if (task.description) {
    let desc = task.description;
    try {
      const parsed = JSON.parse(desc);
      if (Array.isArray(parsed)) {
        desc = parsed
          .map((block) => block.content?.map((c) => c.text).join("") || "")
          .filter(Boolean)
          .join(" ");
      }
    } catch {
      // Not JSON, use as-is
    }
    if (desc) parts.push(`Deskripsi: ${desc.substring(0, 500)}`);
  }

  return parts.join(" | ");
};

const _buildEventContent = (event) => {
  const parts = [`Event: ${event.title}`];
  if (event.status) parts.push(`Status: ${event.status}`);
  if (event.startDate)
    parts.push(
      `Mulai: ${new Date(event.startDate).toLocaleDateString("id-ID")}`,
    );
  if (event.endDate)
    parts.push(
      `Selesai: ${new Date(event.endDate).toLocaleDateString("id-ID")}`,
    );

  if (event.participants && event.participants.length > 0) {
    const names = event.participants
      .map((p) => (typeof p === "object" && p.name ? p.name : p))
      .filter(Boolean);
    if (names.length > 0) parts.push(`Peserta: ${names.join(", ")}`);
  }

  if (event.description) {
    let desc = event.description;
    try {
      const parsed = JSON.parse(desc);
      if (Array.isArray(parsed)) {
        desc = parsed
          .map((block) => block.content?.map((c) => c.text).join("") || "")
          .filter(Boolean)
          .join(" ");
      }
    } catch {
      // Not JSON
    }
    if (desc) parts.push(`Deskripsi: ${desc.substring(0, 500)}`);
  }

  return parts.join(" | ");
};

const _buildCommentContent = (comment) => {
  let content = comment.content || "";
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      content = parsed
        .map((block) => block.content?.map((c) => c.text).join("") || "")
        .filter(Boolean)
        .join(" ");
    }
  } catch {
    // Not JSON
  }
  return `Komentar di ${comment.targetType}: ${content.substring(0, 500)}`;
};

const _buildActivityContent = (log, actorName = null) => {
  const actor = actorName || "User";
  return `${actor} melakukan ${log.action} pada ${log.targetType}: ${log.targetName || ""}`.trim();
};

const _buildMemberContent = (member, user) => {
  const parts = [`Member: ${user?.name || "Unknown"}`];
  if (user?.email) parts.push(`Email: ${user.email}`);
  if (member?.role) parts.push(`Role: ${member.role}`);
  return parts.join(" | ");
};

const _buildSpreadsheetContent = (sheet) => {
  const parts = [`Sheet: ${sheet.name || "Untitled"}`];
  // Extract column names if available
  if (sheet.columns && sheet.columns.length > 0) {
    const colNames = sheet.columns
      .map((c) => c.name || c.title || "")
      .filter(Boolean);
    if (colNames.length > 0) parts.push(`Kolom: ${colNames.join(", ")}`);
  }
  return parts.join(" | ");
};

const _buildBoardContent = (board, creatorName = null) => {
  const parts = [`Board Brainstorming: ${board.name}`];
  if (creatorName) parts.push(`Dibuat oleh: ${creatorName}`);
  return parts.join(" | ");
};

const _buildLabelContent = (label) => {
  return `Label: ${label.name} | Warna: ${label.color}`;
};

const _buildEventNoteContent = (note, eventTitle = "") => {
  const parts = [`Catatan Event${eventTitle ? `: ${eventTitle}` : ""}`];
  if (note.title) parts.push(`Judul: ${note.title}`);
  let content = note.content || "";
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      content = parsed
        .map((block) => block.content?.map((c) => c.text).join("") || "")
        .filter(Boolean)
        .join(" ");
    }
  } catch {
    // Not JSON — use raw text
  }
  if (content) parts.push(`Isi: ${content.substring(0, 500)}`);
  return parts.join(" | ");
};

const _buildDivisionContent = (division, eventTitle = "") => {
  const parts = [`Divisi: ${division.name}`];
  if (eventTitle) parts.push(`Event: ${eventTitle}`);
  if (division.description) parts.push(`Deskripsi: ${division.description}`);

  if (division.members && division.members.length > 0) {
    const memberParts = division.members
      .map((m) => {
        const name =
          typeof m.userId === "object" && m.userId?.name
            ? m.userId.name
            : m.userId;
        const role = m.role === "leader" ? " (leader)" : "";
        return `${name}${role}`;
      })
      .filter(Boolean);
    if (memberParts.length > 0) parts.push(`Anggota: ${memberParts.join(", ")}`);
  }

  return parts.join(" | ");
};

// ════════════════════════════════════════════════════
// UPSERT / REMOVE
// ════════════════════════════════════════════════════

/**
 * Create or update embedding untuk sebuah dokumen
 * Jika content terlalu panjang, akan dipecah ke beberapa chunk
 *
 * @param {Object} params
 * @param {string} params.workspaceId
 * @param {string} params.sourceType - task|event|event_note|comment|activity|member|spreadsheet|board|label
 * @param {string} params.sourceId
 * @param {string} params.content - teks yang akan di-embed
 * @param {Object} [params.metadata] - metadata tambahan
 */
const upsert = async ({
  workspaceId,
  sourceType,
  sourceId,
  content,
  metadata = {},
}) => {
  try {
    if (!content || !content.trim()) return;

    const chunks = chunkText(content);

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await generateEmbedding(chunks[i]);

      await Embedding.findOneAndUpdate(
        {
          workspaceId,
          sourceType,
          sourceId,
          chunkIndex: i,
        },
        {
          content: chunks[i],
          embedding,
          metadata,
          updatedAt: new Date(),
        },
        { upsert: true, new: true },
      );
    }

    // Cleanup extra chunks jika content menjadi lebih pendek
    await Embedding.deleteMany({
      workspaceId,
      sourceType,
      sourceId,
      chunkIndex: { $gte: chunks.length },
    });
  } catch (error) {
    console.error(
      `[EmbeddingService] Upsert failed for ${sourceType}/${sourceId}:`,
      error.message,
    );
  }
};

/**
 * Hapus semua embedding untuk sebuah dokumen
 */
const remove = async ({ sourceType, sourceId, workspaceId }) => {
  try {
    const filter = { sourceType, sourceId };
    if (workspaceId) filter.workspaceId = workspaceId;
    await Embedding.deleteMany(filter);
  } catch (error) {
    console.error(
      `[EmbeddingService] Remove failed for ${sourceType}/${sourceId}:`,
      error.message,
    );
  }
};

/**
 * Hapus semua embedding di workspace
 */
const removeByWorkspace = async (workspaceId) => {
  try {
    await Embedding.deleteMany({ workspaceId });
  } catch (error) {
    console.error(
      `[EmbeddingService] RemoveByWorkspace failed:`,
      error.message,
    );
  }
};

// ════════════════════════════════════════════════════
// FULL WORKSPACE SYNC
// ════════════════════════════════════════════════════

/**
 * Full re-index seluruh workspace
 * Query all data → upsert embeddings → cleanup orphans
 *
 * @param {string} workspaceId
 * @returns {Object} { total, byType }
 */
const syncWorkspace = async (workspaceId) => {
  const counts = {
    task: 0,
    event: 0,
    event_note: 0,
    comment: 0,
    activity: 0,
    member: 0,
    spreadsheet: 0,
    board: 0,
    label: 0,
  };

  // 1. Tasks
  const tasks = await Task.find({ workspaceId, isDeleted: { $ne: true } })
    .populate("assignees", "name")
    .populate("labels", "name")
    .lean();

  for (const task of tasks) {
    await upsert({
      workspaceId,
      sourceType: "task",
      sourceId: task._id,
      content: _buildTaskContent(task),
      metadata: {
        title: task.title,
        status: task.columnId?.toString(),
        assignees: task.assignees?.map((a) => a.name) || [],
        priority: task.priority,
        sourceUrl: `/workspace/${workspaceId}/tasks/${task._id}`,
      },
    });
    counts.task++;
  }

  // 2. Events
  const events = await Event.find({ workspaceId, isDeleted: { $ne: true } })
    .populate("participants", "name")
    .lean();

  for (const event of events) {
    await upsert({
      workspaceId,
      sourceType: "event",
      sourceId: event._id,
      content: _buildEventContent(event),
      metadata: {
        title: event.title,
        status: event.status,
        sourceUrl: `/workspace/${workspaceId}/events/${event._id}`,
      },
    });
    counts.event++;
  }

  // 2.5 Event Notes
  const eventNotes = await EventNote.find({
    workspaceId,
    isDeleted: { $ne: true },
  }).lean();

  const eventTitleMap = {};
  for (const ev of events) {
    eventTitleMap[ev._id.toString()] = ev.title;
  }

  for (const note of eventNotes) {
    const evTitle = eventTitleMap[note.eventId.toString()] || "";
    await upsert({
      workspaceId,
      sourceType: "event_note",
      sourceId: note._id,
      content: _buildEventNoteContent(note, evTitle),
      metadata: {
        title: note.title || "Catatan",
        sourceUrl: `/workspace/${workspaceId}/events/${note.eventId}`,
      },
    });
    counts.event_note++;
  }

  // 2.7 Event Divisions
  const divisions = await EventDivision.find({
    workspaceId,
    isDeleted: { $ne: true },
  })
    .populate("members.userId", "name email")
    .lean();

  counts.division = 0;
  for (const div of divisions) {
    const evTitle = eventTitleMap[div.eventId.toString()] || "";
    await upsert({
      workspaceId,
      sourceType: "division",
      sourceId: div._id,
      content: _buildDivisionContent(div, evTitle),
      metadata: {
        title: div.name,
        sourceUrl: `/workspace/${workspaceId}/events/${div.eventId}`,
      },
    });
    counts.division++;
  }

  // 3. Comments (only from this workspace)
  const comments = await Comment.find({ workspaceId, isDeleted: false }).lean();

  for (const comment of comments) {
    await upsert({
      workspaceId,
      sourceType: "comment",
      sourceId: comment._id,
      content: _buildCommentContent(comment),
      metadata: {
        sourceUrl:
          comment.targetType === "task"
            ? `/workspace/${workspaceId}/tasks/${comment.targetId}`
            : `/workspace/${workspaceId}/events/${comment.targetId}`,
      },
    });
    counts.comment++;
  }

  // 4. Activity Logs (last 200 for performance)
  const logs = await ActivityLog.find({ workspaceId })
    .sort({ createdAt: -1 })
    .limit(200)
    .populate("actorId", "name")
    .lean();

  for (const log of logs) {
    await upsert({
      workspaceId,
      sourceType: "activity",
      sourceId: log._id,
      content: _buildActivityContent(log, log.actorId?.name),
      metadata: {
        sourceUrl: `/workspace/${workspaceId}/activity`,
      },
    });
    counts.activity++;
  }

  // 5. Members
  const members = await WorkspaceMember.find({ workspaceId })
    .populate("userId", "name email")
    .lean();

  for (const member of members) {
    await upsert({
      workspaceId,
      sourceType: "member",
      sourceId: member._id,
      content: _buildMemberContent(member, member.userId),
      metadata: {
        title: member.userId?.name,
        sourceUrl: `/workspace/${workspaceId}/members/${member.userId?._id}`,
      },
    });
    counts.member++;
  }

  // 6. Labels
  const labels = await WorkspaceLabel.find({ workspaceId }).lean();

  for (const label of labels) {
    await upsert({
      workspaceId,
      sourceType: "label",
      sourceId: label._id,
      content: _buildLabelContent(label),
      metadata: {
        title: label.name,
      },
    });
    counts.label++;
  }

  // 7. Spreadsheet Sheets
  const wsEvents = await Event.find({ workspaceId, isDeleted: { $ne: true } })
    .select("_id")
    .lean();
  const eventIds = wsEvents.map((e) => e._id);

  if (eventIds.length > 0) {
    // Try new format (SpreadsheetSheetData)
    const sheets = await SpreadsheetSheetData.find({
      eventId: { $in: eventIds },
    }).lean();
    for (const sheet of sheets) {
      // Find which event this sheet belongs to
      const parentEvent = wsEvents.find(
        (e) => e._id.toString() === sheet.eventId.toString(),
      );
      await upsert({
        workspaceId,
        sourceType: "spreadsheet",
        sourceId: sheet._id,
        content: _buildSpreadsheetContent(sheet),
        metadata: {
          title: sheet.name,
          sourceUrl: parentEvent
            ? `/workspace/${workspaceId}/events/${parentEvent._id}`
            : null,
        },
      });
      counts.spreadsheet++;
    }
  }

  // 8. Boards
  const boards = await BrainstormingBoard.find({
    workspaceId,
    isDeleted: { $ne: true },
  })
    .populate("createdBy", "name")
    .lean();

  for (const board of boards) {
    await upsert({
      workspaceId,
      sourceType: "board",
      sourceId: board._id,
      content: _buildBoardContent(board, board.createdBy?.name),
      metadata: {
        title: board.name,
        sourceUrl: `/workspace/${workspaceId}/boards/${board._id}`,
      },
    });
    counts.board++;
  }

  const total = Object.values(counts).reduce((sum, c) => sum + c, 0);
  console.log(
    `[EmbeddingService] Synced workspace ${workspaceId}: ${total} embeddings`,
  );

  return { total, byType: counts };
};

// ════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════

module.exports = {
  generateEmbedding,
  upsert,
  remove,
  removeByWorkspace,
  syncWorkspace,
  // Exposed content builders for controller hooks
  _buildTaskContent,
  _buildEventContent,
  _buildCommentContent,
  _buildActivityContent,
  _buildMemberContent,
  _buildSpreadsheetContent,
  _buildBoardContent,
  _buildLabelContent,
  _buildEventNoteContent,
  _buildDivisionContent,
};
