"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/contexts/workspace-context";
import { useEvents } from "@/hooks/use-events";
import { EventCard } from "@/components/events/event-card";
import { EventFilterToolbar } from "@/components/events/event-filter-toolbar";
import { CreateEventDialog } from "@/components/events/create-event-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarRange,
  Plus,
  CalendarDays,
  Clock,
  MapPin,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";

export default function EventsPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { currentWorkspace, members, fetchMembers } = useWorkspace();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const {
    events,
    loading,
    error,
    filters,
    setFilters,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    createEvent,
    fetchEvents,
  } = useEvents(id);

  // Fetch members for participant filters & create dialog
  useEffect(() => {
    if (id) {
      fetchMembers(id);
    }
  }, [id, fetchMembers]);

  const handleCreate = async (eventData) => {
    const newEvent = await createEvent(eventData);
    toast.success("Event berhasil dibuat!");
    await fetchEvents(1);
    return newEvent;
  };

  const handleEventClick = (event) => {
    router.push(`/workspace/${id}/events/${event._id}`);
  };

  if (!currentWorkspace) return null;

  // Stats
  const upcomingCount = events.filter((e) => e.status === "upcoming").length;
  const ongoingCount = events.filter((e) => e.status === "ongoing").length;
  const completedCount = events.filter((e) => e.status === "completed").length;

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm">
              <CalendarRange className="h-5 w-5 text-white" />
            </div>
            Event
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola jadwal, milestone, dan acara penting workspace
          </p>
        </div>
        <Button
          className="gap-2 shadow-sm"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Buat Event
        </Button>
      </div>

      {/* Quick stats */}
      {!loading && events.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{upcomingCount}</p>
              <p className="text-xs text-muted-foreground">Upcoming</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CalendarDays className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{ongoingCount}</p>
              <p className="text-xs text-muted-foreground">Ongoing</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-500/5 border border-gray-500/10">
            <div className="h-8 w-8 rounded-lg bg-gray-500/10 flex items-center justify-center">
              <MapPin className="h-4 w-4 text-gray-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{completedCount}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </div>
        </div>
      )}

      {/* Filter toolbar */}
      <EventFilterToolbar
        filters={filters}
        setFilters={setFilters}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        members={members}
      />

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-0">
                <Skeleton className="h-1 rounded-t-lg" />
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <div className="flex items-center justify-between pt-1">
                    <Skeleton className="h-4 w-16" />
                    <div className="flex -space-x-1.5">
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <Skeleton className="h-6 w-6 rounded-full" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Event grid */}
      {!loading && events.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => (
            <EventCard
              key={event._id}
              event={event}
              onClick={handleEventClick}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && events.length === 0 && !error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/10 mb-6">
              <Inbox className="h-10 w-10 text-violet-500/60" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {filters.keyword || filters.status.length > 0 || filters.participant
                ? "Tidak ada event yang cocok"
                : "Belum ada event"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              {filters.keyword || filters.status.length > 0 || filters.participant
                ? "Coba ubah filter pencarian kamu."
                : "Buat event pertama untuk mulai mengelola jadwal, milestone, dan acara penting workspace."}
            </p>
            {!filters.keyword &&
              filters.status.length === 0 &&
              !filters.participant && (
                <Button
                  onClick={() => setCreateDialogOpen(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Buat Event Pertama
                </Button>
              )}
          </CardContent>
        </Card>
      )}

      {/* Create dialog */}
      <CreateEventDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreate={handleCreate}
      />
    </div>
  );
}
