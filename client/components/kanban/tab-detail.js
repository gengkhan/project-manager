"use client";

import { useState, useCallback, useRef, lazy, Suspense } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  CalendarIcon,
  CalendarDays,
  User,
  Tag,
  AlertTriangle,
  Eye,
  EyeOff,
  Link2,
  Lock,
  Columns3,
  AlignLeft,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getInitials, PRIORITY_CONFIG } from "./task-card";
import { SubtaskChecklist } from "./subtask-checklist";
import { AttachmentSection } from "./attachment-section";

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
// Static import for the helper
import { isBlockNoteEmpty } from "@/components/blocknote-editor";

// ── Field Row component ──────────────────────────────
function FieldRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="flex items-center gap-2 w-28 shrink-0 pt-0.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export function TabDetail({
  task,
  columns,
  members,
  labels,
  events,
  currentUserId,
  onUpdate,
  onWatch,
  onUnwatch,
  onUploadAttachment,
  onDeleteAttachment,
  workspaceId,
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(task.title);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descEditorKey, setDescEditorKey] = useState(0);
  const descValueRef = useRef(task.description || "");
  const descTimerRef = useRef(null);

  const isWatching = (task.watchers || []).some(
    (w) => (typeof w === "string" ? w : w._id) === currentUserId,
  );

  // Title save
  const saveTitle = useCallback(() => {
    if (titleValue.trim() && titleValue.trim() !== task.title) {
      onUpdate({ title: titleValue.trim() });
    }
    setEditingTitle(false);
  }, [titleValue, task.title, onUpdate]);

  // Description — debounced auto-save
  const handleDescChange = useCallback(
    (jsonString, extractedMentions) => {
      descValueRef.current = jsonString;
      if (descTimerRef.current) clearTimeout(descTimerRef.current);
      descTimerRef.current = setTimeout(() => {
        if (descValueRef.current !== task.description) {
          onUpdate({ description: descValueRef.current });
          // Note: Full implementation would also send custom mentions if supported at the task level
          // For now, task description update primarily updates the 'description' field.
        }
      }, 800);
    },
    [task.description, onUpdate],
  );

  // Save immediately when leaving edit mode
  const saveDescAndClose = useCallback(() => {
    if (descTimerRef.current) clearTimeout(descTimerRef.current);
    if (descValueRef.current !== task.description) {
      onUpdate({ description: descValueRef.current });
    }
    setEditingDesc(false);
  }, [task.description, onUpdate]);

  // Member list
  const memberList = (members || []).map((m) => ({
    id: m.userId?._id || m.userId || m._id,
    name: m.userId?.name || m.name || "Member",
  }));

  // Current assignee IDs
  const assigneeIds = (task.assignees || []).map((a) =>
    typeof a === "string" ? a : a._id,
  );

  const toggleAssignee = (memberId) => {
    const newAssignees = assigneeIds.includes(memberId)
      ? assigneeIds.filter((id) => id !== memberId)
      : [...assigneeIds, memberId];
    onUpdate({ assignees: newAssignees });
  };

  // Current label IDs
  const labelIds = (task.labels || []).map((l) =>
    typeof l === "string" ? l : l._id,
  );

  const toggleLabel = (labelId) => {
    const newLabels = labelIds.includes(labelId)
      ? labelIds.filter((id) => id !== labelId)
      : [...labelIds, labelId];
    onUpdate({ labels: newLabels });
  };

  return (
    <div className="space-y-1 py-2">
      {/* ── Title ──────────────────────────────────── */}
      <div className="px-1">
        {editingTitle ? (
          <Input
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveTitle();
              if (e.key === "Escape") {
                setTitleValue(task.title);
                setEditingTitle(false);
              }
            }}
            className="text-lg font-semibold h-auto py-1"
            autoFocus
          />
        ) : (
          <h2
            className="text-lg font-semibold text-foreground cursor-pointer hover:bg-accent/50 rounded px-2 py-1 -mx-1 transition-colors"
            onClick={() => {
              setTitleValue(task.title);
              setEditingTitle(true);
            }}
          >
            {task.title}
          </h2>
        )}
      </div>

      {/* ── Watch button ──────────────────────────── */}
      <div className="flex items-center gap-2 px-1 pt-1 pb-2">
        <Button
          variant={isWatching ? "secondary" : "outline"}
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={() => (isWatching ? onUnwatch?.() : onWatch?.())}
        >
          {isWatching ? (
            <>
              <Eye className="h-3.5 w-3.5 text-primary" /> Watching
            </>
          ) : (
            <>
              <EyeOff className="h-3.5 w-3.5" /> Watch
            </>
          )}
        </Button>
        {task.isArchived && (
          <Badge
            variant="outline"
            className="text-[10px] border-amber-300 text-amber-600"
          >
            Diarsipkan
          </Badge>
        )}
      </div>

      <Separator />

      {/* ── Fields ─────────────────────────────────── */}
      <div className="space-y-0.5 px-1">
        {/* Status / Column */}
        <FieldRow icon={Columns3} label="Status">
          <Select
            value={
              typeof task.columnId === "string"
                ? task.columnId
                : task.columnId?.toString()
            }
            onValueChange={(val) => onUpdate({ columnId: val })}
          >
            <SelectTrigger className="h-8 text-xs w-auto min-w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(columns || []).map((col) => (
                <SelectItem key={col._id} value={col._id}>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: col.color }}
                    />
                    {col.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>

        {/* Priority */}
        <FieldRow icon={AlertTriangle} label="Prioritas">
          <Select
            value={task.priority}
            onValueChange={(val) => onUpdate({ priority: val })}
          >
            <SelectTrigger className="h-8 text-xs w-auto min-w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[
                { value: "low", label: "Low", color: "bg-slate-400" },
                { value: "medium", label: "Medium", color: "bg-amber-400" },
                { value: "high", label: "High", color: "bg-orange-500" },
                { value: "critical", label: "Critical", color: "bg-red-500" },
              ].map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", p.color)} />
                    {p.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>

        {/* Assignees */}
        <FieldRow icon={User} label="Assignee">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto min-h-8 px-2 text-xs font-normal flex-wrap gap-1 justify-start"
              >
                {assigneeIds.length === 0 ? (
                  <span className="text-muted-foreground">
                    Tambah assignee...
                  </span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {(task.assignees || []).map((a) => {
                      const user =
                        typeof a === "string" ? { _id: a, name: "?" } : a;
                      return (
                        <Badge
                          key={user._id}
                          variant="secondary"
                          className="text-[10px] h-5 gap-1 px-1.5"
                        >
                          <Avatar className="h-3.5 w-3.5">
                            <AvatarFallback className="text-[7px] bg-primary/10 text-primary">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          {user.name}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              <p className="text-xs font-medium text-muted-foreground px-2 py-1 uppercase tracking-wider">
                Pilih Assignee
              </p>
              <Separator className="my-1" />
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {memberList.map((member) => (
                  <button
                    key={member.id}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors",
                      assigneeIds.includes(member.id) && "bg-accent",
                    )}
                    onClick={() => toggleAssignee(member.id)}
                  >
                    <Checkbox
                      checked={assigneeIds.includes(member.id)}
                      className="h-3.5 w-3.5 pointer-events-none"
                    />
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-xs">{member.name}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </FieldRow>

        {/* Labels */}
        <FieldRow icon={Tag} label="Label">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto min-h-8 px-2 text-xs font-normal flex-wrap gap-1 justify-start"
              >
                {labelIds.length === 0 ? (
                  <span className="text-muted-foreground">Tambah label...</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {(task.labels || []).map((l) => {
                      const label =
                        typeof l === "string"
                          ? { _id: l, name: "?", color: "#6B7280" }
                          : l;
                      return (
                        <Badge
                          key={label._id}
                          variant="outline"
                          className="text-[10px] h-5 gap-1 px-1.5"
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: label.color }}
                          />
                          {label.name}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              <p className="text-xs font-medium text-muted-foreground px-2 py-1 uppercase tracking-wider">
                Pilih Label
              </p>
              <Separator className="my-1" />
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {(labels || []).map((label) => (
                  <button
                    key={label._id}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors",
                      labelIds.includes(label._id) && "bg-accent",
                    )}
                    onClick={() => toggleLabel(label._id)}
                  >
                    <Checkbox
                      checked={labelIds.includes(label._id)}
                      className="h-3.5 w-3.5 pointer-events-none"
                    />
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="truncate text-xs">{label.name}</span>
                  </button>
                ))}
                {(labels || []).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    Belum ada label
                  </p>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </FieldRow>

        {/* Start Date */}
        <FieldRow icon={CalendarIcon} label="Start Date">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 text-xs font-normal justify-start px-2",
                  !task.startDate && "text-muted-foreground",
                )}
              >
                {task.startDate
                  ? format(new Date(task.startDate), "d MMMM yyyy", {
                      locale: localeId,
                    })
                  : "Belum ditentukan"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={task.startDate ? new Date(task.startDate) : undefined}
                onSelect={(date) =>
                  onUpdate({ startDate: date ? date.toISOString() : null })
                }
              />
            </PopoverContent>
          </Popover>
        </FieldRow>

        {/* Due Date */}
        <FieldRow icon={CalendarIcon} label="Due Date">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 text-xs font-normal justify-start px-2",
                  !task.dueDate && "text-muted-foreground",
                )}
              >
                {task.dueDate
                  ? format(new Date(task.dueDate), "d MMMM yyyy", {
                      locale: localeId,
                    })
                  : "Belum ditentukan"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={task.dueDate ? new Date(task.dueDate) : undefined}
                onSelect={(date) =>
                  onUpdate({ dueDate: date ? date.toISOString() : null })
                }
              />
            </PopoverContent>
          </Popover>
        </FieldRow>

        {/* Event (optional) */}
        <FieldRow icon={CalendarDays} label="Event">
          <Select
            value={
              task.eventId
                ? typeof task.eventId === "string"
                  ? task.eventId
                  : task.eventId._id
                : "none"
            }
            onValueChange={(val) =>
              onUpdate({ eventId: val === "none" ? null : val })
            }
          >
            <SelectTrigger className="h-8 text-xs w-auto min-w-[160px]">
              <SelectValue placeholder="Tidak terkait event" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="text-muted-foreground">
                  Tidak terkait event
                </span>
              </SelectItem>
              {(events || []).map((evt) => (
                <SelectItem key={evt._id} value={evt._id}>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: evt.color || "#8B5CF6" }}
                    />
                    <span className="truncate">{evt.title}</span>
                    {evt.status && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] h-4 px-1 ml-auto shrink-0",
                          evt.status === "ongoing" &&
                            "border-green-300 text-green-600",
                          evt.status === "upcoming" &&
                            "border-blue-300 text-blue-600",
                          evt.status === "completed" &&
                            "border-gray-300 text-gray-500",
                        )}
                      >
                        {evt.status}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>

        {/* Dependencies (read-only display) */}
        {task.blockedBy && task.blockedBy.length > 0 && (
          <FieldRow icon={Lock} label="Diblokir oleh">
            <div className="flex flex-wrap gap-1">
              {task.blockedBy.map((dep) => {
                const d =
                  typeof dep === "string" ? { _id: dep, title: "Task" } : dep;
                return (
                  <Badge
                    key={d._id}
                    variant="outline"
                    className="text-[10px] h-5 gap-1"
                  >
                    <Lock className="h-2.5 w-2.5" />
                    {d.title}
                  </Badge>
                );
              })}
            </div>
          </FieldRow>
        )}
      </div>

      <Separator />

      {/* ── Description (BlockNote WYSIWYG) ────────── */}
      <div className="px-1 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <AlignLeft className="h-3.5 w-3.5 text-muted-foreground" />
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Deskripsi
            </h4>
          </div>
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
          <div className="rounded-md border bg-background focus-within:ring-1 focus-within:ring-ring transition-shadow py-2 px-6">
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-xs">Memuat editor...</span>
                </div>
              }
            >
              <MentionEditor
                key={`desc-${task._id}-${descEditorKey}`}
                workspaceId={workspaceId}
                initialContent={task.description || null}
                onChange={handleDescChange}
                className="blocknote-compact"
              />
            </Suspense>
          </div>
        ) : (
          <div
            className="cursor-pointer hover:bg-accent/50 rounded p-2 min-h-[40px] transition-colors"
            onClick={() => {
              descValueRef.current = task.description || "";
              setDescEditorKey((k) => k + 1);
              setEditingDesc(true);
            }}
          >
            {!isBlockNoteEmpty(task.description) ? (
              <Suspense
                fallback={
                  <div className="text-sm text-muted-foreground">
                    Loading...
                  </div>
                }
              >
                <MentionReadOnly
                  content={task.description}
                  className="blocknote-compact"
                />
              </Suspense>
            ) : (
              <span className="text-sm text-muted-foreground italic">
                Klik untuk menambahkan deskripsi...
              </span>
            )}
          </div>
        )}
      </div>

      <Separator />

      {/* ── Subtasks ───────────────────────────────── */}
      <div className="px-1 py-3">
        <SubtaskChecklist
          subtasks={task.subtasks || []}
          onChange={(subtasks) => onUpdate({ subtasks })}
        />
      </div>

      <Separator />

      {/* ── Attachments ────────────────────────────── */}
      <div className="px-1 py-3">
        <AttachmentSection
          attachments={task.attachments || []}
          workspaceId={workspaceId}
          taskId={task._id}
          onUpload={onUploadAttachment}
          onDelete={onDeleteAttachment}
        />
      </div>
    </div>
  );
}
