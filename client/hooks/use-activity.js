"use client";

import { useCallback, useState } from "react";
import api from "@/lib/api";

/**
 * Hook untuk fetch activity logs
 *
 * @param {string} workspaceId
 */
export function useActivity(workspaceId) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // ── Workspace Activity ────────────────────────
  const fetchActivities = useCallback(
    async (params = {}) => {
      if (!workspaceId) return;
      setLoading(true);
      try {
        const { data } = await api.get(`/workspaces/${workspaceId}/activity`, {
          params: { page: 1, limit: 20, ...params },
        });
        setActivities(data.data.activities);
        setPagination(data.data.pagination);
        return data.data;
      } catch (err) {
        console.error("Failed to fetch activities:", err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [workspaceId],
  );

  // ── Load More (append) ────────────────────────
  const loadMore = useCallback(
    async (params = {}) => {
      if (!workspaceId) return;
      const nextPage = pagination.page + 1;
      if (nextPage > pagination.totalPages) return;

      setLoading(true);
      try {
        const { data } = await api.get(`/workspaces/${workspaceId}/activity`, {
          params: { ...params, page: nextPage, limit: pagination.limit },
        });
        setActivities((prev) => [...prev, ...data.data.activities]);
        setPagination(data.data.pagination);
        return data.data;
      } catch (err) {
        console.error("Failed to load more activities:", err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [workspaceId, pagination],
  );

  // ── Task Activity ─────────────────────────────
  const fetchTaskActivities = useCallback(
    async (taskId, params = {}) => {
      if (!workspaceId || !taskId) return;
      setLoading(true);
      try {
        const { data } = await api.get(
          `/workspaces/${workspaceId}/activity/tasks/${taskId}`,
          { params: { page: 1, limit: 20, ...params } },
        );
        setActivities(data.data.activities);
        setPagination(data.data.pagination);
        return data.data;
      } catch (err) {
        console.error("Failed to fetch task activities:", err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [workspaceId],
  );

  // ── Event Activity ────────────────────────────
  const fetchEventActivities = useCallback(
    async (eventId, params = {}) => {
      if (!workspaceId || !eventId) return;
      setLoading(true);
      try {
        const { data } = await api.get(
          `/workspaces/${workspaceId}/activity/events/${eventId}`,
          { params: { page: 1, limit: 20, ...params } },
        );
        setActivities(data.data.activities);
        setPagination(data.data.pagination);
        return data.data;
      } catch (err) {
        console.error("Failed to fetch event activities:", err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [workspaceId],
  );

  // ── User Activity ─────────────────────────────
  const fetchUserActivities = useCallback(
    async (userId, params = {}) => {
      if (!workspaceId || !userId) return;
      setLoading(true);
      try {
        const { data } = await api.get(
          `/workspaces/${workspaceId}/activity/members/${userId}`,
          { params: { page: 1, limit: 20, ...params } },
        );
        setActivities(data.data.activities);
        setPagination(data.data.pagination);
        return data.data;
      } catch (err) {
        console.error("Failed to fetch user activities:", err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [workspaceId],
  );

  const hasMore = pagination.page < pagination.totalPages;

  return {
    activities,
    loading,
    pagination,
    hasMore,
    fetchActivities,
    loadMore,
    fetchTaskActivities,
    fetchEventActivities,
    fetchUserActivities,
  };
}
