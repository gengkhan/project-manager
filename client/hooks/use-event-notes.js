"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";

/**
 * useEventNotes — Hook for Event Notes CRUD + real-time sync
 */
export function useEventNotes(workspaceId, eventId) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  const wsRef = useRef(workspaceId);
  const evRef = useRef(eventId);
  wsRef.current = workspaceId;
  evRef.current = eventId;

  const basePath = `/workspaces/${workspaceId}/events/${eventId}/notes`;

  const fetchNotes = useCallback(
    async (page = 1) => {
      if (!workspaceId || !eventId) return;
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get(basePath, {
          params: { page, limit: 50 },
        });
        setNotes(data.data.notes);
        setPagination(data.data.pagination);
      } catch (err) {
        setError(err.response?.data?.message || "Gagal memuat catatan");
        console.error("Failed to fetch event notes:", err);
      } finally {
        setLoading(false);
      }
    },
    [workspaceId, eventId, basePath],
  );

  useEffect(() => {
    fetchNotes(1);
  }, [fetchNotes]);

  // Socket.io real-time sync
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleCreated = ({ eventId: evId, note }) => {
      if (evId !== evRef.current) return;
      setNotes((prev) => [note, ...prev]);
    };

    const handleUpdated = ({ eventId: evId, note }) => {
      if (evId !== evRef.current) return;
      setNotes((prev) => prev.map((n) => (n._id === note._id ? note : n)));
    };

    const handleDeleted = ({ eventId: evId, noteId }) => {
      if (evId !== evRef.current) return;
      setNotes((prev) => prev.filter((n) => n._id !== noteId));
    };

    socket.on("event:note:created", handleCreated);
    socket.on("event:note:updated", handleUpdated);
    socket.on("event:note:deleted", handleDeleted);

    return () => {
      socket.off("event:note:created", handleCreated);
      socket.off("event:note:updated", handleUpdated);
      socket.off("event:note:deleted", handleDeleted);
    };
  }, []);

  const createNote = useCallback(
    async (noteData) => {
      const { data } = await api.post(basePath, noteData);
      return data.data.note;
    },
    [basePath],
  );

  const updateNote = useCallback(
    async (noteId, updates) => {
      const { data } = await api.put(`${basePath}/${noteId}`, updates);
      return data.data.note;
    },
    [basePath],
  );

  const deleteNote = useCallback(
    async (noteId) => {
      await api.delete(`${basePath}/${noteId}`);
    },
    [basePath],
  );

  return {
    notes,
    loading,
    error,
    pagination,
    fetchNotes,
    createNote,
    updateNote,
    deleteNote,
  };
}
