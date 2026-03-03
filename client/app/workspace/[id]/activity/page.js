"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useWorkspace } from "@/contexts/workspace-context";
import { useActivity } from "@/hooks/use-activity";
import { ActivityTimeline } from "@/components/activity/activity-timeline";
import { ActivityFilters } from "@/components/activity/activity-filters";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { History } from "lucide-react";

export default function ActivityPage({ params }) {
  const { id } = use(params);
  const { currentWorkspace, fetchMembers } = useWorkspace();
  const { activities, loading, hasMore, fetchActivities, loadMore } =
    useActivity(id);

  const [filters, setFilters] = useState({});

  // Fetch members for filter dropdown
  useEffect(() => {
    if (id) fetchMembers(id);
  }, [id, fetchMembers]);

  // Fetch activities on mount & filter change
  useEffect(() => {
    fetchActivities(filters);
  }, [fetchActivities, filters]);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  const handleLoadMore = useCallback(() => {
    loadMore(filters);
  }, [loadMore, filters]);

  if (!currentWorkspace) return null;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <History className="h-6 w-6 text-slate-500" />
          Activity Log
        </h1>
        <p className="text-muted-foreground mt-1">
          Riwayat semua aktivitas di workspace ini
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-3">
          <ActivityFilters onChange={handleFilterChange} />
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardContent className="pt-6">
          <ActivityTimeline
            activities={activities}
            loading={loading}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            emptyMessage="Belum ada aktivitas di workspace ini"
          />
        </CardContent>
      </Card>
    </div>
  );
}
