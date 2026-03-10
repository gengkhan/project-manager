"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";

/**
 * useEvents — Core hook for Event management
 *
 * Fetches events with filtering, sorting, pagination,
 * handles CRUD, participant management, and Socket.io real-time sync.
 */
export function useEvents(workspaceId) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  // ── Filter state ─────────────────────────────────
  const [filters, setFilters] = useState({
    status: [],
    participant: null,
    startDateFrom: null,
    startDateTo: null,
    keyword: "",
  });

  // ── Sort state ───────────────────────────────────
  const [sortBy, setSortBy] = useState("startDate");
  const [sortOrder, setSortOrder] = useState("desc");

  // Track current workspaceId for cleanup
  const wsRef = useRef(workspaceId);
  wsRef.current = workspaceId;

  // ── Fetch events ─────────────────────────────────
  const fetchEvents = useCallback(
    async (page = 1) => {
      if (!workspaceId) return;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (filters.status.length > 0) {
          params.set("status", filters.status.join(","));
        }
        if (filters.participant) {
          params.set("participant", filters.participant);
        }
        if (filters.startDateFrom) {
          params.set("startDateFrom", filters.startDateFrom);
        }
        if (filters.startDateTo) {
          params.set("startDateTo", filters.startDateTo);
        }
        if (filters.keyword) {
          params.set("keyword", filters.keyword);
        }
        params.set("sortBy", sortBy);
        params.set("sortOrder", sortOrder);
        params.set("page", page.toString());
        params.set("limit", "50");

        const { data } = await api.get(
          `/workspaces/${workspaceId}/events?${params.toString()}`,
        );
        setEvents(data.data.events);
        setPagination(data.data.pagination);
      } catch (err) {
        setError(err.response?.data?.message || "Gagal memuat events");
        console.error("Failed to fetch events:", err);
      } finally {
        setLoading(false);
      }
    },
    [workspaceId, filters, sortBy, sortOrder],
  );

  // ── Auto-fetch on filter/sort change ─────────────
  useEffect(() => {
    fetchEvents(1);
  }, [fetchEvents]);

  // ── Socket.io real-time sync ─────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleCreated = ({ event: newEvent }) => {
      setEvents((prev) => [newEvent, ...prev]);
    };

    const handleUpdated = ({ event: updatedEvent }) => {
      setEvents((prev) =>
        prev.map((e) => (e._id === updatedEvent._id ? updatedEvent : e)),
      );
    };

    const handleDeleted = ({ eventId }) => {
      setEvents((prev) => prev.filter((e) => e._id !== eventId));
    };

    socket.on("event:created", handleCreated);
    socket.on("event:updated", handleUpdated);
    socket.on("event:deleted", handleDeleted);

    return () => {
      socket.off("event:created", handleCreated);
      socket.off("event:updated", handleUpdated);
      socket.off("event:deleted", handleDeleted);
    };
  }, []);

  // ── CRUD Operations ──────────────────────────────

  const createEvent = useCallback(
    async (eventData) => {
      const { data } = await api.post(
        `/workspaces/${workspaceId}/events`,
        eventData,
      );
      return data.data.event;
    },
    [workspaceId],
  );

  const updateEvent = useCallback(
    async (eventId, updates) => {
      const { data } = await api.put(
        `/workspaces/${workspaceId}/events/${eventId}`,
        updates,
      );
      return data.data.event;
    },
    [workspaceId],
  );

  const deleteEvent = useCallback(
    async (eventId) => {
      await api.delete(`/workspaces/${workspaceId}/events/${eventId}`);
    },
    [workspaceId],
  );

  const getEvent = useCallback(
    async (eventId) => {
      const { data } = await api.get(
        `/workspaces/${workspaceId}/events/${eventId}`,
      );
      return data.data.event;
    },
    [workspaceId],
  );

  // ── Event tasks ──────────────────────────────────

  const getEventTasks = useCallback(
    async (eventId) => {
      const { data } = await api.get(
        `/workspaces/${workspaceId}/events/${eventId}/tasks`,
      );
      return data.data.tasks;
    },
    [workspaceId],
  );

  return {
    events,
    loading,
    error,
    pagination,
    filters,
    setFilters,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    getEvent,
    getEventTasks,
  };
}

