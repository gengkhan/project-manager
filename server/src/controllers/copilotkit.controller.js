const {
  CopilotRuntime,
  GoogleGenerativeAIAdapter,
  copilotRuntimeNodeHttpEndpoint,
} = require("@copilotkit/runtime");
const AIActionsService = require("../services/aiActions.service");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

exports.handleCopilotRequest = catchAsync(async (req, res, next) => {
  const workspace = req.workspace;
  const userId = req.user.id;

  if (!workspace) {
    return next(new AppError("Workspace context is required", 400));
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return next(new AppError("GOOGLE_API_KEY is not configured", 500));
  }

  const serviceAdapter = new GoogleGenerativeAIAdapter({
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
    apiKey,
  });

  const runtime = new CopilotRuntime({
    actions: [
      {
        name: "searchData",
        description:
          "Mencari konteks atau informasi dalam workspace, seperti task, event, komentar, aktivitas, spreadsheet, dll.",
        parameters: [
          {
            name: "query",
            type: "string",
            description:
              "Pertanyaan atau kata kunci pencarian (misal: 'task apa yang belum selesai', 'siapa yang mengedit event ini')",
            required: true,
          },
        ],
        handler: async ({ query }) => {
          return await AIActionsService.searchData({
            query,
            workspaceId: workspace._id,
          });
        },
      },
      {
        name: "getWorkspaceSummary",
        description:
          "Mendapatkan ringkasan statistik workspace, jumlah task, event, member, dan task by priority.",
        parameters: [],
        handler: async () => {
          return await AIActionsService.getWorkspaceSummary({
            workspaceId: workspace._id,
          });
        },
      },
      {
        name: "createTask",
        description: "Membuat Task baru di workspace ini.",
        parameters: [
          {
            name: "title",
            type: "string",
            description: "Judul task.",
            required: true,
          },
          {
            name: "description",
            type: "string",
            description: "Deskripsi task opsional.",
            required: false,
          },
          {
            name: "priority",
            type: "string",
            description:
              "Prioritas task, pilih dari: low, medium, high, critical.",
            required: false,
          },
          {
            name: "columnId",
            type: "string",
            description:
              "ID Kolom status tujuan, jika diketahui. Boleh kosong (default ke kolom pertama).",
            required: false,
          },
        ],
        handler: async ({ title, description, priority, columnId }) => {
          return await AIActionsService.createTask({
            workspace,
            userId,
            title,
            description,
            priority,
            columnId,
          });
        },
      },
      {
        name: "updateTask",
        description:
          "Mengupdate field task yang sudah ada (misalnya pindah kolom status, ubah prioritas, dll).",
        parameters: [
          {
            name: "taskId",
            type: "string",
            description: "ID task yang akan diupdate.",
            required: true,
          },
          {
            name: "title",
            type: "string",
            description: "Judul baru.",
            required: false,
          },
          {
            name: "description",
            type: "string",
            description: "Deskripsi baru.",
            required: false,
          },
          {
            name: "priority",
            type: "string",
            description: "Prioritas baru (low, medium, high, critical).",
            required: false,
          },
          {
            name: "columnId",
            type: "string",
            description:
              "ID kolom status tujuan yang baru (misal: pindah ke Done).",
            required: false,
          },
        ],
        handler: async ({ taskId, title, description, priority, columnId }) => {
          return await AIActionsService.updateTask({
            workspaceId: workspace._id,
            userId,
            taskId,
            updates: { title, description, priority, columnId },
          });
        },
      },
      {
        name: "createEvent",
        description: "Membuat event calendar baru.",
        parameters: [
          {
            name: "title",
            type: "string",
            description: "Judul event",
            required: true,
          },
          {
            name: "description",
            type: "string",
            description: "Deskripsi event",
            required: false,
          },
          {
            name: "startDate",
            type: "string",
            description: "Tanggal mulai (ISO Date atau YYYY-MM-DD)",
            required: true,
          },
          {
            name: "endDate",
            type: "string",
            description: "Tanggal selesai (ISO Date atau YYYY-MM-DD)",
            required: true,
          },
        ],
        handler: async ({ title, description, startDate, endDate }) => {
          return await AIActionsService.createEvent({
            workspaceId: workspace._id,
            userId,
            title,
            description,
            startDate,
            endDate,
          });
        },
      },
      {
        name: "assignMember",
        description:
          "Menugaskan (assign) atau menghapus (unassign) member dari sebuah task.",
        parameters: [
          {
            name: "taskId",
            type: "string",
            description: "ID Task",
            required: true,
          },
          {
            name: "memberId",
            type: "string",
            description: "ID Member (user)",
            required: true,
          },
          {
            name: "action",
            type: "string",
            description: "Aksi ('assign' atau 'unassign')",
            required: true,
          },
        ],
        handler: async ({ taskId, memberId, action }) => {
          return await AIActionsService.assignMember({
            workspaceId: workspace._id,
            userId,
            taskId,
            memberId,
            action,
          });
        },
      },
    ],
  });

  const handler = copilotRuntimeNodeHttpEndpoint({
    runtime,
    serviceAdapter,
    endpoint: req.originalUrl,
  });

  await handler(req, res);
});
