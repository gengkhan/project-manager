"use client";

import { use, useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/contexts/workspace-context";
import { useAuth } from "@/contexts/auth-context";
import { useCalendar } from "@/hooks/use-calendar";
import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import { CalendarView } from "@/components/calendar/calendar-view";
import { QuickCreateModal } from "@/components/kanban/quick-create-modal";
import { TaskDetailPanel } from "@/components/kanban/task-detail-panel";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CalendarDays,
  Plus,
  RefreshCw,
  Keyboard,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export default function CalendarPage({ params }) {
  const { id: workspaceId } = use(params);
  const { currentWorkspace, members, fetchMembers } = useWorkspace();
  const { user } = useAuth();
  const router = useRouter();

  // ── Calendar hook ──────────────────────────────
  const calendar = useCalendar(workspaceId, currentWorkspace);
  const isMobile = useIsMobile();

  // ── View state ─────────────────────────────────
  const [currentView, setCurrentView] = useState("dayGridMonth");
  const [calendarTitle, setCalendarTitle] = useState("");

  // Initialize view based on mobile breakpoint
  useEffect(() => {
    if (isMobile) {
      setCurrentView("timeGridDay");
    } else {
      setCurrentView("dayGridMonth");
    }
  }, [isMobile]);

  // ── Calendar component ref ─────────────────────
  const calendarViewRef = useRef(null);

  // ── Quick create modal state ───────────────────
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateDefaultDueDate, setQuickCreateDefaultDueDate] =
    useState(null);

  // ── Labels ─────────────────────────────────────
  const [labels, setLabels] = useState([]);

  // ── Fetch members and labels on mount ──────────
  useEffect(() => {
    if (workspaceId) {
      fetchMembers(workspaceId);
      api
        .get(`/workspaces/${workspaceId}/labels`)
        .then(({ data }) => setLabels(data.data.labels))
        .catch(() => {});
    }
  }, [workspaceId, fetchMembers]);

  // ── Navigation handlers ────────────────────────
  const handlePrev = useCallback(() => {
    calendarViewRef.current?.prev();
    setCalendarTitle(calendarViewRef.current?.getTitle() || "");
  }, []);

  const handleNext = useCallback(() => {
    calendarViewRef.current?.next();
    setCalendarTitle(calendarViewRef.current?.getTitle() || "");
  }, []);

  const handleToday = useCallback(() => {
    calendarViewRef.current?.today();
    setCalendarTitle(calendarViewRef.current?.getTitle() || "");
  }, []);

  // ── Date range change (from FullCalendar datesSet) ──
  const handleDateRangeChange = useCallback(
    ({ start, end }) => {
      calendar.setDateRange({ start, end });
      // Update title after a tick (FC title updates async)
      setTimeout(() => {
        setCalendarTitle(calendarViewRef.current?.getTitle() || "");
      }, 0);
    },
    [calendar.setDateRange],
  );

  // ── Date click → open quick create with prefilled due date ──
  const handleDateClick = useCallback((date) => {
    setQuickCreateDefaultDueDate(date);
    setQuickCreateOpen(true);
  }, []);

  // ── Event click → open task detail panel or navigate to event ──
  const handleEventClick = useCallback(
    (fcEventId) => {
      // If it's an event (prefixed with "event-"), navigate to event detail
      if (fcEventId.startsWith("event-")) {
        const eventId = fcEventId.replace("event-", "");
        router.push(`/workspace/${workspaceId}/events/${eventId}`);
        return;
      }
      // Otherwise it's a task → open detail panel
      calendar.setActiveTaskId(fcEventId);
    },
    [calendar.setActiveTaskId, router, workspaceId],
  );

  // ── Drag → update dates ────────────────────────
  const handleEventDrop = useCallback(
    (taskId, newStart, newEnd) => {
      calendar.updateTaskDates(taskId, newStart, newEnd);
      toast.success("Tanggal task diperbarui");
    },
    [calendar.updateTaskDates],
  );

  const handleEventResize = useCallback(
    (taskId, newStart, newEnd) => {
      calendar.updateTaskDates(taskId, newStart, newEnd);
      toast.success("Rentang waktu task diperbarui");
    },
    [calendar.updateTaskDates],
  );

  // ── Create task handler ────────────────────────
  const handleCreateTask = useCallback(
    async (taskData) => {
      try {
        const { data } = await api.post(
          `/workspaces/${workspaceId}/tasks`,
          taskData,
        );
        toast.success("Task berhasil dibuat");
        calendar.refetch();
        return data.data.task;
      } catch (err) {
        toast.error("Gagal membuat task");
        throw err;
      }
    },
    [workspaceId, calendar],
  );

  // ── Task detail panel handlers ─────────────────
  const handleUpdateTask = useCallback(
    async (taskId, updates) => {
      try {
        await api.put(`/workspaces/${workspaceId}/tasks/${taskId}`, updates);
        calendar.refetch();
      } catch (err) {
        toast.error("Gagal mengupdate task");
        throw err;
      }
    },
    [workspaceId, calendar],
  );

  const handleDeleteTask = useCallback(
    async (taskId) => {
      try {
        await api.delete(`/workspaces/${workspaceId}/tasks/${taskId}`);
        calendar.setActiveTaskId(null);
        calendar.refetch();
        toast.success("Task berhasil dihapus");
      } catch (err) {
        toast.error("Gagal menghapus task");
      }
    },
    [workspaceId, calendar],
  );

  const handleArchiveTask = useCallback(
    async (taskId) => {
      try {
        await api.post(`/workspaces/${workspaceId}/tasks/${taskId}/archive`);
        calendar.setActiveTaskId(null);
        calendar.refetch();
        toast.success("Task berhasil diarsipkan");
      } catch (err) {
        toast.error("Gagal mengarsipkan task");
      }
    },
    [workspaceId, calendar],
  );

  const handleUnarchiveTask = useCallback(
    async (taskId) => {
      try {
        await api.post(`/workspaces/${workspaceId}/tasks/${taskId}/unarchive`);
        calendar.refetch();
        toast.success("Task berhasil diunarsipkan");
      } catch (err) {
        toast.error("Gagal membatalkan arsip");
      }
    },
    [workspaceId, calendar],
  );

  const handleWatchTask = useCallback(
    async (taskId) => {
      try {
        await api.post(`/workspaces/${workspaceId}/tasks/${taskId}/watch`);
        calendar.refetch();
        toast.success("Kamu sekarang menjadi watcher");
      } catch (err) {
        toast.error("Gagal menjadi watcher");
      }
    },
    [workspaceId, calendar],
  );

  const handleUnwatchTask = useCallback(
    async (taskId) => {
      try {
        await api.delete(`/workspaces/${workspaceId}/tasks/${taskId}/watch`);
        calendar.refetch();
        toast.success("Berhenti menjadi watcher");
      } catch (err) {
        toast.error("Gagal berhenti menjadi watcher");
      }
    },
    [workspaceId, calendar],
  );

  // ── Keyboard shortcuts ─────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.target.isContentEditable) return;

      switch (e.key) {
        case "n":
        case "N":
          e.preventDefault();
          setQuickCreateDefaultDueDate(null);
          setQuickCreateOpen(true);
          break;
        case "Escape":
          if (calendar.activeTaskId) {
            calendar.setActiveTaskId(null);
          }
          break;
        case "t":
        case "T":
          e.preventDefault();
          handleToday();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [calendar.activeTaskId, calendar.setActiveTaskId, handleToday]);

  // ── Guard ──────────────────────────────────────
  if (!currentWorkspace) return null;

  const taskCount = calendar.tasks.length;
  const eventCount = calendar.events.length;

  // ── Events list for selectors ──────────────────────
  const [events, setEvents] = useState([]);

  // ── Fetch members & events on mount ───────────────
  useEffect(() => {
    if (workspaceId) {
      fetchMembers(workspaceId);
      // Fetch events for event selector (non-deleted, all statuses)
      api
        .get(
          `/workspaces/${workspaceId}/events?limit=200&sortBy=startDate&sortOrder=desc`,
        )
        .then((res) => setEvents(res.data?.data?.events || []))
        .catch(() => {});
    }
  }, [workspaceId, fetchMembers]);

  return (
    <div className="flex flex-col h-full">
      {/* ── Page Header ──────────────────────────── */}
      <div className="px-6 pt-6 pb-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-sm">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Kalender</h1>
              <p className="text-xs text-muted-foreground">
                {taskCount} task{eventCount > 0 ? ` • ${eventCount} event` : ""}{" "}
                dalam tampilan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Keyboard shortcuts hint */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Keyboard className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs max-w-[220px]">
                <p className="font-semibold mb-1">Keyboard Shortcuts</p>
                <p>
                  <kbd className="px-1 rounded bg-muted text-[10px]">N</kbd>{" "}
                  Buat task baru
                </p>
                <p>
                  <kbd className="px-1 rounded bg-muted text-[10px]">T</kbd> Ke
                  hari ini
                </p>
                <p>
                  <kbd className="px-1 rounded bg-muted text-[10px]">Esc</kbd>{" "}
                  Tutup panel
                </p>
              </TooltipContent>
            </Tooltip>

            {/* Refresh */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => calendar.refetch()}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh data</TooltipContent>
            </Tooltip>

            {/* New task button */}
            <Button
              className="gap-2 shadow-sm h-9"
              onClick={() => {
                setQuickCreateDefaultDueDate(null);
                setQuickCreateOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Tambah Task</span>
            </Button>
          </div>
        </div>

        {/* ── Toolbar: nav + view switcher + filters ── */}
        <CalendarToolbar
          title={calendarTitle}
          currentView={currentView}
          onViewChange={setCurrentView}
          onPrev={handlePrev}
          onNext={handleNext}
          onToday={handleToday}
          filters={calendar.filters}
          onFiltersChange={calendar.setFilters}
          activeFilterCount={calendar.activeFilterCount}
          members={members}
          labels={labels}
        />
      </div>

      <Separator />

      {/* ── Calendar Area ────────────────────────── */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {calendar.error ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="h-10 w-10 text-destructive/60 mb-4" />
              <h3 className="text-sm font-semibold text-foreground mb-1">
                Terjadi kesalahan
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                {calendar.error}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => calendar.refetch()}
              >
                Coba Lagi
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <CalendarView
                ref={calendarViewRef}
                events={calendar.calendarEvents}
                currentView={currentView}
                loading={calendar.loading}
                onDateRangeChange={handleDateRangeChange}
                onDateClick={handleDateClick}
                onEventClick={handleEventClick}
                onEventDrop={handleEventDrop}
                onEventResize={handleEventResize}
              />
            </CardContent>
          </Card>
        )}

        {/* ── Legend ────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 px-1">
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            Prioritas:
          </span>
          {[
            { label: "Low", color: "bg-slate-400" },
            { label: "Medium", color: "bg-amber-400" },
            { label: "High", color: "bg-orange-500" },
            { label: "Critical", color: "bg-red-500" },
          ].map((p) => (
            <div key={p.label} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${p.color}`} />
              <span className="text-[10px] text-muted-foreground">
                {p.label}
              </span>
            </div>
          ))}

          <Separator orientation="vertical" className="h-3 hidden sm:block" />

          <span className="text-[10px] text-muted-foreground/70">
            Drag task untuk ubah tanggal • Klik tanggal kosong untuk buat task
            baru
          </span>
        </div>
      </div>

      {/* ── Quick Create Modal ───────────────────── */}
      <QuickCreateModal
        open={quickCreateOpen}
        onOpenChange={setQuickCreateOpen}
        columns={calendar.columns}
        members={members}
        defaultColumnId={calendar.columns[0]?._id}
        defaultDueDate={quickCreateDefaultDueDate}
        onCreateTask={handleCreateTask}
        onCreateAndOpen={(taskId) => calendar.setActiveTaskId(taskId)}
      />

      {/* ── Task Detail Panel ────────────────────── */}
      <TaskDetailPanel
        task={calendar.activeTask}
        open={!!calendar.activeTaskId}
        onClose={() => calendar.setActiveTaskId(null)}
        columns={calendar.columns}
        members={members}
        labels={labels}
        currentUserId={user?._id}
        workspaceId={workspaceId}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
        onArchive={handleArchiveTask}
        onUnarchive={handleUnarchiveTask}
        onWatch={handleWatchTask}
        onUnwatch={handleUnwatchTask}
        events={events}
      />
    </div>
  );
}
