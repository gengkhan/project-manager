"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
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

// Lazy-load BlockNote to avoid SSR issues and reduce initial bundle
const BlockNoteEditor = lazy(() =>
  import("@/components/blocknote-editor").then((m) => ({
    default: m.BlockNoteEditor,
  })),
);
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  CalendarIcon,
  Loader2,
  X,
  Palette,
  Users,
  Check,
  AlignLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

const EVENT_COLORS = [
  "#8B5CF6", // violet
  "#3B82F6", // blue
  "#06B6D4", // cyan
  "#10B981", // emerald
  "#F59E0B", // amber
  "#EF4444", // red
  "#EC4899", // pink
  "#F97316", // orange
  "#14B8A6", // teal
  "#6366F1", // indigo
];

export function CreateEventDialog({
  open,
  onOpenChange,
  onCreate,
  members = [],
}) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [editorKey, setEditorKey] = useState(0);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [color, setColor] = useState(
    EVENT_COLORS[Math.floor(Math.random() * EVENT_COLORS.length)],
  );
  const [status, setStatus] = useState("upcoming");
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [participantSearch, setParticipantSearch] = useState("");

  // Reset form on open
  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setStartDate(null);
      setEndDate(null);
      setColor(EVENT_COLORS[Math.floor(Math.random() * EVENT_COLORS.length)]);
      setStatus("upcoming");
      setSelectedParticipants([]);
      setParticipantSearch("");
      setErrors({});
      setEditorKey((k) => k + 1);
    }
  }, [open]);

  // Filtered members for autocomplete
  const filteredMembers = members.filter(
    (m) =>
      !selectedParticipants.some((sp) => sp._id === m.userId?._id) &&
      (m.userId?.name
        ?.toLowerCase()
        .includes(participantSearch.toLowerCase()) ||
        m.userId?.email
          ?.toLowerCase()
          .includes(participantSearch.toLowerCase())),
  );

  const validate = () => {
    const newErrors = {};
    if (!title.trim()) newErrors.title = "Judul event harus diisi";
    if (title.trim().length > 100)
      newErrors.title = "Judul maksimal 100 karakter";
    if (!startDate) newErrors.startDate = "Tanggal mulai harus diisi";
    if (!endDate) newErrors.endDate = "Tanggal selesai harus diisi";
    if (startDate && endDate && endDate < startDate) {
      newErrors.endDate = "Tanggal selesai harus setelah tanggal mulai";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await onCreate({
        title: title.trim(),
        description,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        color,
        status,
        participants: selectedParticipants.map((p) => p._id),
      });
      onOpenChange(false);
    } catch (err) {
      setErrors({
        submit: err.response?.data?.message || "Gagal membuat event",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleParticipant = (member) => {
    const user = member.userId;
    if (!user) return;
    const exists = selectedParticipants.some((p) => p._id === user._id);
    if (exists) {
      setSelectedParticipants((prev) => prev.filter((p) => p._id !== user._id));
    } else {
      setSelectedParticipants((prev) => [...prev, user]);
    }
    setParticipantSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[780px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            Buat Event Baru
          </DialogTitle>
          <DialogDescription>
            Buat event baru untuk workspace ini
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="event-title">
              Judul Event <span className="text-destructive">*</span>
            </Label>
            <Input
              id="event-title"
              placeholder="Contoh: Sprint Planning Q1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              className={errors.title ? "border-destructive" : ""}
              autoFocus
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title}</p>
            )}
          </div>

          {/* Description — BlockNote WYSIWYG */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
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
                    placeholder="Jelaskan tentang event ini..."
                    className="blocknote-compact"
                  />
                </Suspense>
              )}
            </div>
          </div>

          {/* Dates Row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Start Date */}
            <div className="space-y-2">
              <Label>
                Tanggal Mulai <span className="text-destructive">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-9",
                      !startDate && "text-muted-foreground",
                      errors.startDate && "border-destructive",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {startDate
                      ? format(startDate, "dd MMM yyyy", { locale: localeId })
                      : "Pilih tanggal"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      setStartDate(date);
                      if (endDate && date && endDate < date) {
                        setEndDate(date);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.startDate && (
                <p className="text-xs text-destructive">{errors.startDate}</p>
              )}
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label>
                Tanggal Selesai <span className="text-destructive">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-9",
                      !endDate && "text-muted-foreground",
                      errors.endDate && "border-destructive",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {endDate
                      ? format(endDate, "dd MMM yyyy", { locale: localeId })
                      : "Pilih tanggal"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => startDate && date < startDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.endDate && (
                <p className="text-xs text-destructive">{errors.endDate}</p>
              )}
            </div>
          </div>

          {/* Color & Status Row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Color Picker */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5" />
                Warna Label
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {EVENT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      "h-7 w-7 rounded-full transition-all border-2 flex items-center justify-center",
                      color === c
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105",
                    )}
                    style={{ backgroundColor: c }}
                  >
                    {color === c && (
                      <Check className="h-3.5 w-3.5 text-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9">
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
          </div>

          {/* Participants */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Peserta
            </Label>

            {/* Selected participants */}
            {selectedParticipants.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedParticipants.map((p) => (
                  <Badge
                    key={p._id}
                    variant="secondary"
                    className="gap-1 pr-1 h-7"
                  >
                    <Avatar className="h-4 w-4">
                      <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                        {p.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs max-w-[100px] truncate">
                      {p.name}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedParticipants((prev) =>
                          prev.filter((sp) => sp._id !== p._id),
                        )
                      }
                      className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Search input */}
            <Input
              placeholder="Cari member untuk ditambahkan..."
              value={participantSearch}
              onChange={(e) => setParticipantSearch(e.target.value)}
              className="h-9"
            />

            {/* Member dropdown */}
            {participantSearch && filteredMembers.length > 0 && (
              <div className="border rounded-lg max-h-36 overflow-y-auto bg-popover shadow-sm">
                {filteredMembers.slice(0, 8).map((m) => (
                  <button
                    key={m.userId?._id}
                    type="button"
                    onClick={() => toggleParticipant(m)}
                    className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-accent transition-colors text-sm"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {m.userId?.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate text-sm">
                        {m.userId?.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {m.userId?.email}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {m.role}
                    </Badge>
                  </button>
                ))}
              </div>
            )}

            {participantSearch && filteredMembers.length === 0 && (
              <p className="text-xs text-muted-foreground py-2 text-center">
                Tidak ada member ditemukan
              </p>
            )}
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {errors.submit}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Buat Event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
