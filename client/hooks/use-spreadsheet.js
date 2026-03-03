"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";

/**
 * useSpreadsheet (op-based collaboration)
 *
 * Follows the fortune-sheet collaboration pattern:
 * - GET /workbook to fetch initial data
 * - onOp callback sends ops via Socket.io
 * - Socket receives ops from others and applies via workbookRef.applyOp()
 * - Presence (cursor positions) broadcast via socket
 */
export function useSpreadsheet(workspaceId, eventId) {
  const [data, setData] = useState(null); // Sheet[]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const basePath = `/workspaces/${workspaceId}/events/${eventId}/sheets`;
  const workbookRef = useRef(null);
  const joinedRef = useRef(false);

  // Stable user identity for presence
  const { username, userId } = useMemo(() => {
    const _userId = crypto.randomUUID();
    return { username: `User-${_userId.slice(0, 3)}`, userId: _userId };
  }, []);

  // ── Fetch initial workbook data ──────────────────
  const fetchWorkbook = useCallback(async () => {
    if (!workspaceId || !eventId) return;
    setLoading(true);
    setError(null);
    try {
      const { data: res } = await api.get(`${basePath}/workbook`);
      const wb = res.data.workbook;
      setData(wb.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load workbook");
      console.error("Failed to fetch workbook:", err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, eventId, basePath]);

  // Load once
  useEffect(() => {
    fetchWorkbook();
  }, [fetchWorkbook]);

  // ── onOp: send ops to server via socket ──────────
  const onOp = useCallback(
    (ops) => {
      const socket = getSocket();
      if (!socket || !eventId) return;
      socket.emit("workbook:op", { eventId, ops });
    },
    [eventId],
  );

  // ── onChange: keep local data in sync ─────────────
  const onChange = useCallback((d) => {
    setData(d);
  }, []);

  // ── Socket: join room + handle ops & presence ────
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !eventId) return;

    if (!joinedRef.current) {
      socket.emit("workbook:join", eventId);
      joinedRef.current = true;
    }

    // Receive ops from other users
    const handleOp = ({ eventId: evt, ops }) => {
      if (String(evt) !== String(eventId)) return;
      workbookRef.current?.applyOp(ops);
    };

    // Receive presence updates
    const handleAddPresences = (presences) => {
      workbookRef.current?.addPresences(presences);
    };

    const handleRemovePresences = (presences) => {
      workbookRef.current?.removePresences(presences);
    };

    const handleOpError = (err) => {
      console.error("workbook:op:error", err);
    };

    socket.on("workbook:op", handleOp);
    socket.on("workbook:addPresences", handleAddPresences);
    socket.on("workbook:removePresences", handleRemovePresences);
    socket.on("workbook:op:error", handleOpError);

    return () => {
      socket.off("workbook:op", handleOp);
      socket.off("workbook:addPresences", handleAddPresences);
      socket.off("workbook:removePresences", handleRemovePresences);
      socket.off("workbook:op:error", handleOpError);
      socket.emit("workbook:leave", eventId);
      joinedRef.current = false;
    };
  }, [eventId]);

  // ── Export ────────────────────────────────────────
  const exportCSV = useCallback(
    async (sheetId) => {
      const response = await api.get(`${basePath}/${sheetId}/export/csv`, {
        responseType: "blob",
      });
      const sheet = Array.isArray(data)
        ? data.find((s) => String(s.id) === String(sheetId))
        : null;
      const fileName = `${sheet?.name || "sheet"}.csv`;
      downloadBlob(response.data, fileName, "text/csv");
    },
    [basePath, data],
  );

  const exportXLSX = useCallback(async () => {
    const response = await api.get(`${basePath}/export/xlsx`, {
      responseType: "blob",
    });
    downloadBlob(
      response.data,
      "spreadsheet.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  }, [basePath]);

  return {
    data,
    setData,
    loading,
    error,
    fetchWorkbook,
    onOp,
    onChange,
    workbookRef,
    exportCSV,
    exportXLSX,
    // Presence helpers
    username,
    userId,
  };
}

function downloadBlob(data, fileName, mimeType) {
  const blob = new Blob([data], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
