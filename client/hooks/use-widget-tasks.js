"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";

/**
 * useWidgetTasks (Single Task View)
 * Fetches workspace tasks for the combobox selection and synchronizes updates via Socket.IO.
 */
export function useWidgetTasks(workspaceId, selectedTaskId) {
  const [taskMap, setTaskMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTasks = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);

    try {
      // Fetch recent/active tasks for the combobox search
      const params = {
        limit: 200, // Ample amount for dropdown
        page: 1,
        sortBy: "createdAt",
        sortOrder: "desc",
      };

      const { data } = await api.get(`/workspaces/${workspaceId}/tasks`, {
        params,
      });

      const fetchedTasks = data.data.tasks || [];
      const newMap = {};
      fetchedTasks.forEach((t) => {
        newMap[t._id] = t;
      });
      setTaskMap(newMap);
    } catch (err) {
      console.error("Failed to fetch widget tasks:", err);
      setError("Gagal memuat task widget");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Socket.IO real-time sync
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleCreated = ({ task }) => {
      if (task) setTaskMap((prev) => ({ ...prev, [task._id]: task }));
    };
    const handleUpdated = ({ task }) => {
      if (task) setTaskMap((prev) => ({ ...prev, [task._id]: task }));
    };
    const handleMoved = ({ task }) => {
      if (task) setTaskMap((prev) => ({ ...prev, [task._id]: task }));
    };
    const handleDeleted = ({ taskId }) => {
      if (taskId) {
        setTaskMap((prev) => {
          const next = { ...prev };
          delete next[taskId];
          return next;
        });
      }
    };
    const handleArchived = ({ taskId, isArchived }) => {
      if (taskId) {
        setTaskMap((prev) => {
          if (!prev[taskId]) return prev;
          return { ...prev, [taskId]: { ...prev[taskId], isArchived } };
        });
      }
    };

    socket.on("task:created", handleCreated);
    socket.on("task:updated", handleUpdated);
    socket.on("task:moved", handleMoved);
    socket.on("task:deleted", handleDeleted);
    socket.on("task:archived", handleArchived);

    return () => {
      socket.off("task:created", handleCreated);
      socket.off("task:updated", handleUpdated);
      socket.off("task:moved", handleMoved);
      socket.off("task:deleted", handleDeleted);
      socket.off("task:archived", handleArchived);
    };
  }, []);

  // Filter out archived tasks for the combobox options
  const allTasks = useMemo(() => {
    return Object.values(taskMap).filter((t) => !t.isArchived);
  }, [taskMap]);

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return taskMap[selectedTaskId] || null;
  }, [selectedTaskId, taskMap]);

  return {
    allTasks,
    selectedTask,
    loading,
    error,
    refetch: fetchTasks,
  };
}
