"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWorkspace } from "@/contexts/workspace-context";
import { useEvents } from "@/hooks/use-events";
import { EventOverviewTab } from "@/components/events/event-overview-tab";
import { EventTasksTab } from "@/components/events/event-tasks-tab";
import { EventSpreadsheetTab } from "@/components/spreadsheet/event-spreadsheet-tab";
import { EventActivityTab } from "@/components/activity/event-activity-tab";
import { DeleteEventDialog } from "@/components/events/delete-event-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  MoreHorizontal,
  Trash2,
  CalendarRange,
  ListTodo,
  Table2,
  History,
  Loader2,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

const STATUS_CONFIG = {
  upcoming: {
    label: "Upcoming",
    className:
      "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    dot: "bg-blue-500",
  },
  ongoing: {
    label: "Ongoing",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    dot: "bg-emerald-500",
  },
  completed: {
    label: "Completed",
    className:
      "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700",
    dot: "bg-gray-400",
  },
};

export default function EventDetailPage({ params }) {
  const { id, eventId } = use(params);
  const router = useRouter();
  const { currentWorkspace, members, fetchMembers } = useWorkspace();
  const {
    getEvent,
    updateEvent,
    deleteEvent,
    addParticipant,
    removeParticipant,
  } = useEvents(id);

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch event detail
  const fetchEventDetail = useCallback(async () => {
    setLoading(true);
    try {
      const eventData = await getEvent(eventId);
      setEvent(eventData);
    } catch (err) {
      console.error("Failed to fetch event:", err);
      toast.error("Gagal memuat event");
    } finally {
      setLoading(false);
    }
  }, [eventId, getEvent]);

  useEffect(() => {
    fetchEventDetail();
  }, [fetchEventDetail]);

  // Fetch members
  useEffect(() => {
    if (id) fetchMembers(id);
  }, [id, fetchMembers]);

  // Handler: update event
  const handleUpdate = useCallback(
    async (updates) => {
      const updatedEvent = await updateEvent(eventId, updates);
      setEvent(updatedEvent);
      return updatedEvent;
    },
    [eventId, updateEvent],
  );

  // Handler: add participant
  const handleAddParticipant = useCallback(
    async (participantId) => {
      const updatedEvent = await addParticipant(eventId, participantId);
      setEvent(updatedEvent);
      return updatedEvent;
    },
    [eventId, addParticipant],
  );

  // Handler: remove participant
  const handleRemoveParticipant = useCallback(
    async (participantId) => {
      const updatedEvent = await removeParticipant(eventId, participantId);
      setEvent(updatedEvent);
      return updatedEvent;
    },
    [eventId, removeParticipant],
  );

  // Handler: delete event
  const handleDelete = async () => {
    try {
      await deleteEvent(eventId);
      toast.success("Event berhasil dihapus");
      router.push(`/workspace/${id}/events`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menghapus event");
    }
  };

  if (!currentWorkspace) return null;

  // Loading state
  if (loading) {
    return (
      <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-60 rounded-lg" />
        </div>
      </div>
    );
  }

  // Not found
  if (!event) {
    return (
      <div className="p-4 lg:p-6 max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h2 className="text-lg font-semibold mb-2">Event tidak ditemukan</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Event ini mungkin telah dihapus atau tidak tersedia.
          </p>
          <Link href={`/workspace/${id}/events`}>
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Daftar Event
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[event.status] || STATUS_CONFIG.upcoming;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-5">
      {/* Breadcrumb & actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href={`/workspace/${id}/events`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Separator orientation="vertical" className="h-5" />
          <div className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: event.color || "#8B5CF6" }}
            />
            <span className="text-sm text-muted-foreground">Event</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn("text-xs h-6", statusConfig.className)}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full mr-1.5",
                statusConfig.dot,
              )}
            />
            {statusConfig.label}
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Hapus Event
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Event Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{event.title}</h1>
        <p className="text-sm text-muted-foreground">
          {format(new Date(event.startDate), "dd MMMM yyyy", {
            locale: localeId,
          })}{" "}
          —{" "}
          {format(new Date(event.endDate), "dd MMMM yyyy", {
            locale: localeId,
          })}
          {event.taskCount > 0 && (
            <span className="ml-2">· {event.taskCount} task terkait</span>
          )}
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="w-full grid grid-cols-4 h-10">
          <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm">
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5 text-xs sm:text-sm">
            <ListTodo className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Task</span>
            {event.taskCount > 0 && (
              <span className="ml-1 h-4 min-w-[16px] rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-medium px-1">
                {event.taskCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="spreadsheet"
            className="gap-1.5 text-xs sm:text-sm"
          >
            <Table2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Spreadsheet</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5 text-xs sm:text-sm">
            <History className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Activity</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Overview */}
        <TabsContent value="overview" className="mt-0">
          <EventOverviewTab
            event={event}
            onUpdate={handleUpdate}
            onAddParticipant={handleAddParticipant}
            onRemoveParticipant={handleRemoveParticipant}
            members={members}
          />
        </TabsContent>

        {/* Tab: Tasks */}
        <TabsContent value="tasks" className="mt-0">
          <EventTasksTab
            event={event}
            workspaceId={id}
            workspace={currentWorkspace}
          />
        </TabsContent>

        {/* Tab: Spreadsheet */}
        <TabsContent value="spreadsheet" className="mt-0">
          <EventSpreadsheetTab event={event} workspaceId={id} />
        </TabsContent>

        {/* Tab: Activity */}
        <TabsContent value="activity" className="mt-0">
          <Card>
            <CardContent className="pt-6">
              <EventActivityTab workspaceId={id} eventId={eventId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete dialog */}
      <DeleteEventDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        event={event}
        onDelete={handleDelete}
      />
    </div>
  );
}
