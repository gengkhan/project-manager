const EmbeddingService = require("./embedding.service");
const Embedding = require("../models/Embedding");

// ── Config ───────────────────────────────────────────
const RAG_TOP_K = parseInt(process.env.RAG_TOP_K) || 10;
const RAG_SCORE_THRESHOLD = parseFloat(process.env.RAG_SCORE_THRESHOLD) || 0.7;

// ════════════════════════════════════════════════════
// VECTOR SEARCH & CONTEXT BUILDING
// ════════════════════════════════════════════════════

/**
 * Retrieve dokumen relevan dari vector store menggunakan MongoDB Atlas Vector Search
 *
 * @param {Object} params
 * @param {string} params.workspaceId - ID workspace (scope filter)
 * @param {string} params.query - pertanyaan/teks user
 * @param {string} [params.sourceType] - opsional filter per tipe (task|event|comment|...)
 * @param {number} [params.topK] - jumlah hasil (default: RAG_TOP_K)
 * @param {number} [params.scoreThreshold] - minimum similarity score (default: RAG_SCORE_THRESHOLD)
 * @returns {Promise<Array>} array of { content, metadata, sourceType, score }
 */
const retrieve = async ({
  workspaceId,
  query,
  sourceType = null,
  topK = RAG_TOP_K,
  scoreThreshold = RAG_SCORE_THRESHOLD,
}) => {
  try {
    // Generate embedding dari query user
    const queryEmbedding = await EmbeddingService.generateEmbedding(query);

    // Build filter for vector search
    const filter = {
      workspaceId: { $eq: workspaceId },
    };
    if (sourceType) {
      filter.sourceType = { $eq: sourceType };
    }

    // MongoDB Atlas Vector Search aggregation pipeline
    const pipeline = [
      {
        $vectorSearch: {
          index: "embedding_vector_index",
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: topK * 10, // Cast wider net for better results
          limit: topK,
          filter,
        },
      },
      {
        $addFields: {
          score: { $meta: "vectorSearchScore" },
        },
      },
      {
        $match: {
          score: { $gte: scoreThreshold },
        },
      },
      {
        $project: {
          _id: 1,
          sourceType: 1,
          sourceId: 1,
          content: 1,
          metadata: 1,
          score: 1,
        },
      },
    ];

    const results = await Embedding.aggregate(pipeline);

    return results.map((doc) => ({
      sourceType: doc.sourceType,
      sourceId: doc.sourceId,
      content: doc.content,
      metadata: doc.metadata,
      score: doc.score,
    }));
  } catch (error) {
    console.error("[RAGService] Retrieve failed:", error.message);

    // Fallback: jika Vector Search Index belum ada, return empty
    if (
      error.message.includes("$vectorSearch") ||
      error.message.includes("index not found") ||
      error.codeName === "InvalidPipelineOperator"
    ) {
      console.warn(
        "[RAGService] MongoDB Atlas Vector Search Index belum dikonfigurasi. " +
          "Buat index 'embedding_vector_index' di MongoDB Atlas.",
      );
      return [];
    }

    return [];
  }
};

/**
 * Gabungkan dokumen hasil retrieve menjadi context string untuk prompt LLM
 *
 * @param {Array} documents - hasil dari retrieve()
 * @returns {string} context string
 */
const buildContext = (documents) => {
  if (!documents || documents.length === 0) {
    return "Tidak ada data relevan yang ditemukan di workspace.";
  }

  const typeLabels = {
    task: "📋 Task",
    event: "📅 Event",
    event_note: "📝 Catatan Event",
    division: "👥 Divisi",
    comment: "💬 Komentar",
    activity: "📝 Aktivitas",
    member: "👤 Member",
    spreadsheet: "📊 Spreadsheet",
    board: "🎨 Board",
    label: "🏷️ Label",
  };

  const contextParts = documents.map((doc, index) => {
    const typeLabel = typeLabels[doc.sourceType] || doc.sourceType;
    return `[${typeLabel} #${index + 1}] (relevansi: ${(doc.score * 100).toFixed(0)}%)\n${doc.content}`;
  });

  return (
    `Berikut data yang relevan dari workspace (${documents.length} hasil):\n\n` +
    contextParts.join("\n\n")
  );
};

module.exports = {
  retrieve,
  buildContext,
};
