"use client";

import { useEffect } from "react";
import { useActivity } from "@/hooks/use-activity";
import { ActivityTimeline } from "@/components/activity/activity-timeline";

/**
 * Tab Activity di Detail Task
 *
 * @param {Object} props
 * @param {string} props.workspaceId - ID workspace
 * @param {string} props.taskId - ID task
 */
export function TabActivity({ workspaceId, taskId }) {
  const { activities, loading, hasMore, fetchTaskActivities, loadMore } =
    useActivity(workspaceId);

  useEffect(() => {
    if (workspaceId && taskId) {
      fetchTaskActivities(taskId);
    }
  }, [workspaceId, taskId, fetchTaskActivities]);

  const handleLoadMore = () => {
    loadMore();
  };

  return (
    <div className="px-1 py-4">
      <ActivityTimeline
        activities={activities}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        emptyMessage="Belum ada riwayat aktivitas untuk task ini"
        compact
      />
    </div>
  );
}
