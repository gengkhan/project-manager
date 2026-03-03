"use client";

import { useState, useEffect, useRef, useMemo, lazy, Suspense } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  CalendarIcon,
  Loader2,
  Sparkles,
  User,
  AlertTriangle,
  AlignLeft,
  CalendarDays,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { getInitials } from "./task-card";

// Lazy-load BlockNote to avoid SSR issues and reduce initial bundle
const BlockNoteEditor = lazy(() =>
  import("@/components/blocknote-editor").then((m) => ({
    default: m.BlockNoteEditor,
  }))
);

export function QuickCreateModal({
  open,
  onOpenChange,
  columns,
  members,
  events,
  defaultColumnId,
  defaultDueDate,
  onCreateTask,
  onCreateAndOpen,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [columnId, setColumnId] = useState(defaultColumnId || "");
  const [priority, setPriority] = useState("medium");
  const [startDate, setStartDate] = useState(null);
  const [dueDate, setDueDate] = useState(null);
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [eventId, setEventId] = useState("");
  const [creating, setCreating] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const titleInputRef = useRef(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setColumnId(defaultColumnId || columns?.[0]?._id || "");
      setPriority("medium");
      setStartDate(null);
      setDueDate(defaultDueDate ? new Date(defaultDueDate) : null);
      setSelectedAssignees([]);
      setEventId("");
      setEditorKey((k) => k + 1); // Force fresh editor instance
      setTimeout(() => titleInputRef.current?.focus(), 100);
    }
  }, [open, defaultColumnId, defaultDueDate, columns]);

  const toggleAssignee = (memberId) => {
    setSelectedAssignees((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleCreate = async (openDetail = false) => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const taskData = {
        title: title.trim(),
        description: description || "",
        columnId,
        priority,
        startDate: startDate ? startDate.toISOString() : null,
        dueDate: dueDate ? dueDate.toISOString() : null,
        assignees: selectedAssignees,
        eventId: eventId && eventId !== "none" ? eventId : null,
      };
      const task = await onCreateTask(taskData);
      onOpenChange(false);
      if (openDetail && task) {
        onCreateAndOpen?.(task._id);
      }
    } catch (err) {
      console.error("Failed to create task:", err);
    } finally {
      setCreating(false);
    }
  };

  // Get member list
  const memberList = (members || []).map((m) => ({
    id: m.userId?._id || m._id,
    name: m.userId?.name || m.name || "Member",
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[780px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Buat Task Baru
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Isi minimal judul task. Field lainnya bisa dilengkapi nanti.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="task-title" className="text-xs font-medium">
              Judul Task <span className="text-red-500">*</span>
            </Label>
            <Input
              id="task-title"
              ref={titleInputRef}
              placeholder="Contoh: Desain halaman login"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleCreate(false);
                }
              }}
              className="h-10"
              autoFocus
            />
          </div>

          {/* Description — BlockNote WYSIWYG */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <AlignLeft className="h-3 w-3" />
              Deskripsi
            </Label>
            <div className="py-2 px-6 rounded-md border border-input">
              {open && (
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center py-6 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  }
                >
                  <BlockNoteEditor
                    key={editorKey}
                    initialContent={null}
                    onChange={setDescription}
                    placeholder="Deskripsi task (opsional)..."
                    className="blocknote-compact"
                  />
                </Suspense>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Column */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Kolom</Label>
              <Select value={columnId} onValueChange={setColumnId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Pilih kolom" />
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
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Prioritas</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-9 text-xs">
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
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            {/* Start Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-9 justify-start text-left text-xs font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {startDate
                      ? format(startDate, "d MMM yyyy", { locale: localeId })
                      : "Pilih tanggal"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-9 justify-start text-left text-xs font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {dueDate
                      ? format(dueDate, "d MMM yyyy", { locale: localeId })
                      : "Pilih tanggal"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Assignees */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Assignee</Label>
            <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-auto min-h-9 justify-start text-left text-xs font-normal flex-wrap gap-1 py-1.5",
                    selectedAssignees.length === 0 && "text-muted-foreground"
                  )}
                >
                  <User className="mr-1 h-3.5 w-3.5 shrink-0" />
                  {selectedAssignees.length === 0 ? (
                    "Pilih assignee"
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {selectedAssignees.map((id) => {
                        const member = memberList.find((m) => m.id === id);
                        return (
                          <Badge key={id} variant="secondary" className="text-[10px] h-5 px-1.5">
                            {member?.name || "Member"}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="start">
                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  {memberList.map((member) => (
                    <button
                      key={member.id}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors",
                        selectedAssignees.includes(member.id) && "bg-accent"
                      )}
                      onClick={() => toggleAssignee(member.id)}
                    >
                      <Checkbox
                        checked={selectedAssignees.includes(member.id)}
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
                  {memberList.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3">
                      Belum ada member
                    </p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Event (optional) */}
          {(events || []).length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <CalendarDays className="h-3 w-3" />
                Event
                <span className="text-muted-foreground font-normal">(opsional)</span>
              </Label>
              <Select value={eventId} onValueChange={setEventId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Tidak terkait event" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">Tidak terkait event</span>
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
                              evt.status === "ongoing" && "border-green-300 text-green-600",
                              evt.status === "upcoming" && "border-blue-300 text-blue-600",
                              evt.status === "completed" && "border-gray-300 text-gray-500"
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
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={creating}
            size="sm"
          >
            Batal
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleCreate(true)}
            disabled={!title.trim() || creating}
            size="sm"
          >
            {creating && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
            Buat & Buka Detail
          </Button>
          <Button
            onClick={() => handleCreate(false)}
            disabled={!title.trim() || creating}
            size="sm"
          >
            {creating && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
            Buat Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
