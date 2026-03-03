"use client";

import { useEffect } from "react";
import { useActivity } from "@/hooks/use-activity";
import { ActivityTimeline } from "@/components/activity/activity-timeline";

/**
 * Tab Activity di Detail Event
 *
 * @param {Object} props
 * @param {string} props.workspaceId - ID workspace
 * @param {string} props.eventId - ID event
 */
export function EventActivityTab({ workspaceId, eventId }) {
  const { activities, loading, hasMore, fetchEventActivities, loadMore } =
    useActivity(workspaceId);

  useEffect(() => {
    if (workspaceId && eventId) {
      fetchEventActivities(eventId);
    }
  }, [workspaceId, eventId, fetchEventActivities]);

  const handleLoadMore = () => {
    loadMore();
  };

  return (
    <ActivityTimeline
      activities={activities}
      loading={loading}
      hasMore={hasMore}
      onLoadMore={handleLoadMore}
      emptyMessage="Belum ada riwayat aktivitas untuk event ini"
      compact
    />
  );
}
