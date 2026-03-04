"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  lazy,
  Suspense,
} from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CalendarIcon,
  Palette,
  Users,
  Check,
  X,
  Pencil,
  Plus,
  Loader2,
  UserPlus,
  UserMinus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Lazy-load MentionEditor to avoid SSR issues
const MentionEditor = lazy(() =>
  import("@/components/mention-editor").then((m) => ({
    default: m.MentionEditor,
  })),
);
const MentionReadOnly = lazy(() =>
  import("@/components/mention-editor").then((m) => ({
    default: m.MentionReadOnly,
  })),
);

const EVENT_COLORS = [
  "#8B5CF6",
  "#3B82F6",
  "#06B6D4",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#F97316",
  "#14B8A6",
  "#6366F1",
];

const STATUS_CONFIG = {
  upcoming: {
    label: "Upcoming",
    className: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  ongoing: {
    label: "Ongoing",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  completed: {
    label: "Completed",
    className: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
    dot: "bg-gray-400",
  },
};

export function EventOverviewTab({
  event,
  onUpdate,
  onAddParticipant,
  onRemoveParticipant,
  members = [],
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [title, setTitle] = useState(event.title);
  const [saving, setSaving] = useState(false);
  const [participantSearch, setParticipantSearch] = useState("");
  const [showParticipantAdd, setShowParticipantAdd] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const descValueRef = useRef(event.description || "");
  const descTimerRef = useRef(null);
  const titleRef = useRef(null);

  // Sync title/desc with event prop
  useEffect(() => {
    setTitle(event.title);
    descValueRef.current = event.description || "";
  }, [event.title, event.description]);

  const saveField = useCallback(
    async (field, value) => {
      setSaving(true);
      try {
        await onUpdate({ [field]: value });
        toast.success("Perubahan tersimpan");
      } catch (err) {
        toast.error(err.response?.data?.message || "Gagal menyimpan");
      } finally {
        setSaving(false);
      }
    },
    [onUpdate],
  );

  const handleTitleSave = () => {
    if (title.trim() && title.trim() !== event.title) {
      saveField("title", title.trim());
    }
    setEditingTitle(false);
  };

  // Description — debounced auto-save
  const handleDescChange = useCallback(
    (jsonString) => {
      descValueRef.current = jsonString;
      if (descTimerRef.current) clearTimeout(descTimerRef.current);
      descTimerRef.current = setTimeout(() => {
        if (descValueRef.current !== event.description) {
          saveField("description", descValueRef.current);
        }
      }, 800);
    },
    [event.description, saveField],
  );

  // Save immediately when leaving edit mode
  const saveDescAndClose = useCallback(() => {
    if (descTimerRef.current) clearTimeout(descTimerRef.current);
    if (descValueRef.current !== event.description) {
      saveField("description", descValueRef.current);
    }
    setEditingDesc(false);
  }, [event.description, saveField]);

  const handleAddParticipant = async (userId) => {
    try {
      await onAddParticipant(userId);
      setParticipantSearch("");
      setShowParticipantAdd(false);
      toast.success("Peserta ditambahkan");
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menambahkan peserta");
    }
  };

  const handleRemoveParticipant = async (userId) => {
    try {
      await onRemoveParticipant(userId);
      toast.success("Peserta dihapus");
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menghapus peserta");
    }
  };

  const statusConfig = STATUS_CONFIG[event.status] || STATUS_CONFIG.upcoming;

  // Non-participant members for adding
  const participantIds = event.participants?.map((p) => p._id) || [];
  const availableMembers = members.filter((m) => {
    const userId = typeof m.userId === "object" ? m.userId?._id : m.userId;
    const userName = typeof m.userId === "object" ? m.userId?.name : m.name;
    const userEmail = typeof m.userId === "object" ? m.userId?.email : m.email;

    return (
      !participantIds.includes(userId) &&
      (userName?.toLowerCase().includes(participantSearch.toLowerCase()) ||
        userEmail?.toLowerCase().includes(participantSearch.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6">
      {/* Title & Description card */}
      <Card>
        <CardContent className="p-5 space-y-4">
          {/* Title */}
          <div className="group">
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  ref={titleRef}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleTitleSave();
                    if (e.key === "Escape") {
                      setTitle(event.title);
                      setEditingTitle(false);
                    }
                  }}
                  onBlur={handleTitleSave}
                  maxLength={100}
                  className="text-xl font-bold h-auto py-1 px-2"
                  autoFocus
                />
              </div>
            ) : (
              <div
                className="flex items-start gap-2 cursor-pointer group rounded-md px-2 py-1 -mx-2 -my-1 hover:bg-accent/50 transition-colors"
                onClick={() => setEditingTitle(true)}
              >
                <h2 className="text-xl font-bold flex-1">{event.title}</h2>
                <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
              </div>
            )}
          </div>

          <Separator />

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
                Deskripsi
              </label>
              {editingDesc && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={saveDescAndClose}
                >
                  Selesai
                </Button>
              )}
            </div>
            {editingDesc ? (
              <div className="space-y-2">
                <div className="py-2 px-6 rounded-md border border-input focus-within:ring-1 focus-within:ring-ring transition-shadow">
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center py-6 text-muted-foreground">
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      </div>
                    }
                  >
                    <MentionEditor
                      key={editorKey}
                      workspaceId={event.workspaceId}
                      initialContent={event.description || null}
                      onChange={handleDescChange}
                      className="blocknote-compact"
                    />
                  </Suspense>
                </div>
              </div>
            ) : (
              <div
                className="cursor-pointer rounded-md px-2 py-2 -mx-2 hover:bg-accent/50 transition-colors min-h-[60px] group"
                onClick={() => {
                  setEditorKey((k) => k + 1);
                  setEditingDesc(true);
                }}
              >
                {event.description ? (
                  <Suspense
                    fallback={
                      <p className="text-sm text-muted-foreground">
                        Loading...
                      </p>
                    }
                  >
                    <MentionReadOnly content={event.description} />
                  </Suspense>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Klik untuk menambahkan deskripsi...
                  </p>
                )}
                <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Details card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Detail Event
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">
                Tanggal Mulai
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start h-9 font-normal"
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {format(new Date(event.startDate), "dd MMM yyyy", {
                      locale: localeId,
                    })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={new Date(event.startDate)}
                    onSelect={(date) => {
                      if (date) saveField("startDate", date.toISOString());
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">
                Tanggal Selesai
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start h-9 font-normal"
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {format(new Date(event.endDate), "dd MMM yyyy", {
                      locale: localeId,
                    })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={new Date(event.endDate)}
                    onSelect={(date) => {
                      if (date) saveField("endDate", date.toISOString());
                    }}
                    disabled={(date) => date < new Date(event.startDate)}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Separator />

          {/* Status */}
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground font-medium">
              Status
            </label>
            <Select
              value={event.status}
              onValueChange={(val) => saveField("status", val)}
            >
              <SelectTrigger className="w-[150px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    Upcoming
                  </span>
                </SelectItem>
                <SelectItem value="ongoing">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Ongoing
                  </span>
                </SelectItem>
                <SelectItem value="completed">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-gray-400" />
                    Completed
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Color */}
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5" />
              Warna Label
            </label>
            <div className="flex gap-1.5">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => saveField("color", c)}
                  className={cn(
                    "h-6 w-6 rounded-full transition-all border-2 flex items-center justify-center",
                    event.color === c
                      ? "border-foreground scale-110"
                      : "border-transparent hover:scale-105",
                  )}
                  style={{ backgroundColor: c }}
                >
                  {event.color === c && (
                    <Check className="h-3 w-3 text-white" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Participants card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              Peserta ({event.participants?.length || 0})
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => setShowParticipantAdd(!showParticipantAdd)}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Tambah
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Add participant section */}
          {showParticipantAdd && (
            <div className="space-y-2 pb-3 border-b">
              <Input
                placeholder="Cari member untuk ditambahkan..."
                value={participantSearch}
                onChange={(e) => setParticipantSearch(e.target.value)}
                className="h-8 text-sm"
                autoFocus
              />
              {availableMembers.length > 0 ? (
                <div className="max-h-36 overflow-y-auto space-y-0.5">
                  {availableMembers.slice(0, 8).map((m) => (
                    <button
                      key={
                        typeof m.userId === "object" ? m.userId?._id : m.userId
                      }
                      onClick={() =>
                        handleAddParticipant(
                          typeof m.userId === "object"
                            ? m.userId?._id
                            : m.userId,
                        )
                      }
                      className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-left hover:bg-accent transition-colors"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                          {(typeof m.userId === "object"
                            ? m.userId?.name
                            : m.name
                          )
                            ?.charAt(0)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {typeof m.userId === "object"
                            ? m.userId?.name
                            : m.name}
                        </p>
                      </div>
                      <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">
                  {participantSearch
                    ? "Tidak ada member ditemukan"
                    : "Semua member sudah menjadi peserta"}
                </p>
              )}
            </div>
          )}

          {/* Participant list */}
          {event.participants?.length > 0 ? (
            <div className="space-y-1">
              {event.participants.map((p) => (
                <div
                  key={p._id}
                  className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-accent/50 group transition-colors"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                      {p.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {p.email}
                    </p>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleRemoveParticipant(p._id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-destructive/10 hover:text-destructive transition-all"
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Hapus peserta</TooltipContent>
                  </Tooltip>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Belum ada peserta. Klik "Tambah" untuk menambahkan member.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
