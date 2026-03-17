"use client";

import { use, useEffect } from "react";
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import { useWorkspace } from "@/contexts/workspace-context";
import { useAiChatContext } from "@/hooks/use-ai-chat";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

/** Derive user-friendly error message for toast notification */
function getErrorMessage(error) {
  const msg =
    error?.message ||
    error?.error?.message ||
    (typeof error?.error === "string" ? error.error : null) ||
    String(error);
  if (msg.includes("429") || error?.status === 429) {
    return "Batas penggunaan tercapai. Coba lagi nanti.";
  }
  if (
    msg.includes("quota") ||
    msg.includes("Quota exceeded") ||
    msg.includes("exceeded your current quota")
  ) {
    return "Kuota API telah habis. Periksa billing atau coba lagi nanti.";
  }
  if (msg.includes("AI_RetryError") || msg.includes("Failed after")) {
    if (msg.includes("quota") || msg.includes("Quota exceeded")) {
      return "Kuota API telah habis. Coba lagi nanti.";
    }
    return "Terjadi kesalahan AI. Silakan coba lagi.";
  }
  if (msg.includes("rate") && msg.includes("limit")) {
    return "Terlalu banyak permintaan. Mohon tunggu sebentar.";
  }
  return "Terjadi kesalahan pada AI Chat. Silakan coba lagi.";
}

const SYSTEM_INSTRUCTIONS = `Kamu adalah AI asisten untuk workspace ini di aplikasi Project Management.
Kamu hanya mengetahui data dari workspace yang sedang aktif.

Kemampuanmu:
1. Menjawab pertanyaan berdasarkan data workspace (task, event, member, activity)
2. Membuat task baru jika diminta
3. Mengupdate task yang ada (status, prioritas, dll)
4. Membuat event baru
5. Assign/unassign member ke task
6. Memberikan ringkasan dan statistik workspace
7. Memberikan saran cerdas (prioritas, distribusi kerja, deadline warning)

Aturan:
- Selalu jawab dalam bahasa yang sama dengan pertanyaan user
- Jika tidak yakin, tanyakan klarifikasi kepada user
- Saat melakukan aksi (buat/update), selalu konfirmasi detail sebelum eksekusi
- Jika data tidak ditemukan, sampaikan dengan jelas
- Format respons dengan markdown jika sesuai (bold, list, tabel)
- Gunakan nama member (bukan ID) saat menyebut user
- Sertakan konteks waktu (tanggal, relatif) saat relevan`;

const SUGGESTION_CHIPS = [
  {
    title: "Task overdue",
    message: "Apa saja task yang overdue di workspace ini?",
  },
  {
    title: "Ringkasan minggu ini",
    message: "Berikan ringkasan progress workspace minggu ini",
  },
  {
    title: "Distribusi kerja",
    message: "Siapa yang paling banyak task aktif saat ini?",
  },
  {
    title: "Event mendatang",
    message: "Event apa saja yang akan datang dalam waktu dekat?",
  },
  // {
  //   title: "Buat task baru",
  //   message: "Buatkan task baru dengan judul ",
  // },
  {
    title: "Saran prioritas",
    message: "Task mana yang sebaiknya diprioritaskan saat ini?",
  },
];

const CHAT_LABELS = {
  title: "AI Chat Agent",
  initial: [
    "Halo! Saya AI asisten untuk workspace ini. Saya bisa membantu kamu dengan:",
    "- Menjawab pertanyaan tentang task, event, dan member\n- Membuat atau mengupdate task\n- Membuat event baru\n- Memberikan ringkasan workspace\n- Saran prioritas dan distribusi kerja\n\nSilakan tanya apa saja!",
  ],
  placeholder: "Ketik pesan... (cth: 'Apa saja task yang overdue?')",
  error: "Terjadi kesalahan. Silakan coba lagi.",
  stopGenerating: "Hentikan",
  regenerateResponse: "Ulangi respons",
};

export default function AiChatPage({ params }) {
  const { id } = use(params);
  const { currentWorkspace, fetchMembers } = useWorkspace();

  useEffect(() => {
    if (currentWorkspace?._id) {
      fetchMembers(currentWorkspace._id);
    }
  }, [currentWorkspace?._id, fetchMembers]);

  useAiChatContext();

  if (!currentWorkspace) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] lg:h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3 sm:px-6">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-base font-semibold truncate">AI Chat Agent</h1>
          <p className="text-xs text-muted-foreground truncate">
            {currentWorkspace.name}
          </p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden copilot-chat-wrapper">
        <CopilotChat
          instructions={SYSTEM_INSTRUCTIONS}
          labels={CHAT_LABELS}
          suggestions={SUGGESTION_CHIPS}
          className="h-full"
          onError={(error) => {
            toast.error(getErrorMessage(error));
            if (error?.message?.includes("429") || error?.status === 429) {
              return "Batas penggunaan tercapai. Coba lagi nanti.";
            }
          }}
        />
      </div>
    </div>
  );
}
