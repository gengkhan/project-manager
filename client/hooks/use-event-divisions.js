"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";

/**
 * useEventDivisions — Hook for Event Division CRUD, member management, + real-time sync
 */
export function useEventDivisions(workspaceId, eventId) {
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const wsRef = useRef(workspaceId);
  const evRef = useRef(eventId);
  wsRef.current = workspaceId;
  evRef.current = eventId;

  const basePath = `/workspaces/${workspaceId}/events/${eventId}/divisions`;

  const fetchDivisions = useCallback(async () => {
    if (!workspaceId || !eventId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(basePath);
      setDivisions(data.data.divisions);
    } catch (err) {
      setError(err.response?.data?.message || "Gagal memuat divisi");
      console.error("Failed to fetch event divisions:", err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, eventId, basePath]);

  useEffect(() => {
    fetchDivisions();
  }, [fetchDivisions]);

  // Socket.io real-time sync
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleCreated = ({ eventId: evId, division }) => {
      if (evId !== evRef.current) return;
      setDivisions((prev) => [...prev, division]);
    };

    const handleUpdated = ({ eventId: evId, division }) => {
      if (evId !== evRef.current) return;
      setDivisions((prev) =>
        prev.map((d) => (d._id === division._id ? division : d)),
      );
    };

    const handleDeleted = ({ eventId: evId, divisionId }) => {
      if (evId !== evRef.current) return;
      setDivisions((prev) => prev.filter((d) => d._id !== divisionId));
    };

    const handleMemberAdded = ({ eventId: evId, division }) => {
      if (evId !== evRef.current) return;
      setDivisions((prev) =>
        prev.map((d) => (d._id === division._id ? division : d)),
      );
    };

    const handleMemberRemoved = ({ eventId: evId, division }) => {
      if (evId !== evRef.current) return;
      setDivisions((prev) =>
        prev.map((d) => (d._id === division._id ? division : d)),
      );
    };

    const handleMemberUpdated = ({ eventId: evId, division }) => {
      if (evId !== evRef.current) return;
      setDivisions((prev) =>
        prev.map((d) => (d._id === division._id ? division : d)),
      );
    };

    const handleMemberMoved = ({
      eventId: evId,
      sourceDivision,
      targetDivision,
    }) => {
      if (evId !== evRef.current) return;
      setDivisions((prev) =>
        prev.map((d) => {
          if (d._id === sourceDivision._id) return sourceDivision;
          if (d._id === targetDivision._id) return targetDivision;
          return d;
        }),
      );
    };

    socket.on("event:division:created", handleCreated);
    socket.on("event:division:updated", handleUpdated);
    socket.on("event:division:deleted", handleDeleted);
    socket.on("event:division:member:added", handleMemberAdded);
    socket.on("event:division:member:removed", handleMemberRemoved);
    socket.on("event:division:member:updated", handleMemberUpdated);
    socket.on("event:division:member:moved", handleMemberMoved);

    return () => {
      socket.off("event:division:created", handleCreated);
      socket.off("event:division:updated", handleUpdated);
      socket.off("event:division:deleted", handleDeleted);
      socket.off("event:division:member:added", handleMemberAdded);
      socket.off("event:division:member:removed", handleMemberRemoved);
      socket.off("event:division:member:updated", handleMemberUpdated);
      socket.off("event:division:member:moved", handleMemberMoved);
    };
  }, []);

  // ── Division CRUD ──────────────────────────────────

  const createDivision = useCallback(
    async (divisionData) => {
      const { data } = await api.post(basePath, divisionData);
      return data.data.division;
    },
    [basePath],
  );

  const updateDivision = useCallback(
    async (divisionId, updates) => {
      const { data } = await api.put(`${basePath}/${divisionId}`, updates);
      return data.data.division;
    },
    [basePath],
  );

  const deleteDivision = useCallback(
    async (divisionId) => {
      await api.delete(`${basePath}/${divisionId}`);
    },
    [basePath],
  );

  // ── Member operations ──────────────────────────────

  const addMember = useCallback(
    async (divisionId, memberId, role = "member") => {
      const { data } = await api.post(
        `${basePath}/${divisionId}/members`,
        { memberId, role },
      );
      return data.data.division;
    },
    [basePath],
  );

  const updateMemberRole = useCallback(
    async (divisionId, userId, role) => {
      const { data } = await api.put(
        `${basePath}/${divisionId}/members/${userId}`,
        { role },
      );
      return data.data.division;
    },
    [basePath],
  );

  const removeMember = useCallback(
    async (divisionId, userId) => {
      const { data } = await api.delete(
        `${basePath}/${divisionId}/members/${userId}`,
      );
      return data.data.division;
    },
    [basePath],
  );

  const moveMember = useCallback(
    async (divisionId, userId, targetDivisionId) => {
      const { data } = await api.post(
        `${basePath}/${divisionId}/members/${userId}/move`,
        { targetDivisionId },
      );
      return data.data;
    },
    [basePath],
  );

  return {
    divisions,
    loading,
    error,
    fetchDivisions,
    createDivision,
    updateDivision,
    deleteDivision,
    addMember,
    updateMemberRole,
    removeMember,
    moveMember,
  };
}
