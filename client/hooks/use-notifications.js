import { useState, useEffect, useCallback, useRef } from "react";
import api from "../lib/api";

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filterType, setFilterType] = useState("all");

  const lastFetchTime = useRef(null);
  const pollingIntervalRef = useRef(null);
  const unreadCountIntervalRef = useRef(null);

  // Fetch count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get("/notifications/unread-count");
      setUnreadCount(res.data.data.count);
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(
    async (isPolling = false, type = filterType) => {
      if (!isPolling) setLoading(true);

      try {
        const params = { limit: 20 };
        if (type !== "all") params.type = type;
        if (isPolling && lastFetchTime.current && type === "all") {
          params.since = lastFetchTime.current.getTime();
        }

        // We only use Since for polling "all" to be safe. If filter is active we just refresh.
        const res = await api.get("/notifications", {
          params,
          validateStatus: (status) => status >= 200 && status < 400,
        });

        if (res.status === 304) {
          // No new data
          if (!isPolling) setLoading(false);
          return;
        }

        const newNotifs = res.data.data.notifications;

        if (isPolling && type === "all" && lastFetchTime.current) {
          // Prepend new notifications
          if (newNotifs.length > 0) {
            setNotifications((prev) => {
              const existingIds = new Set(prev.map((n) => n._id));
              const filteredNew = newNotifs.filter(
                (n) => !existingIds.has(n._id),
              ); // avoid dupes
              return [...filteredNew, ...prev];
            });
            fetchUnreadCount();
          }
        } else {
          // Full replace on mount or filter change
          setNotifications(newNotifs);
          setHasMore(newNotifs.length === 20);
        }

        lastFetchTime.current = new Date();
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      } finally {
        if (!isPolling) setLoading(false);
      }
    },
    [filterType, fetchUnreadCount],
  );

  // Load more / pagination
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || notifications.length === 0) return;
    setLoadingMore(true);

    try {
      // Find oldest date
      const oldestDate = new Date(
        notifications[notifications.length - 1].createdAt,
      ).getTime();

      const params = { limit: 20, before: oldestDate };
      if (filterType !== "all") params.type = filterType;

      const res = await api.get("/notifications", { params });
      const olderNotifs = res.data.data.notifications;

      if (olderNotifs.length > 0) {
        setNotifications((prev) => [...prev, ...olderNotifs]);
        setHasMore(olderNotifs.length === 20);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Failed to load more:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, notifications, filterType]);

  // Mark as read
  const markAsRead = useCallback(
    async (id) => {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      try {
        await api.put(`/notifications/${id}/read`);
      } catch (error) {
        console.error("Failed to mark as read:", error);
        // Revert optimism
        fetchNotifications(false);
        fetchUnreadCount();
      }
    },
    [fetchNotifications, fetchUnreadCount],
  );

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await api.put("/notifications/read-all");
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      fetchNotifications(false);
      fetchUnreadCount();
    }
  }, [fetchNotifications, fetchUnreadCount]);

  // Setup Polling
  useEffect(() => {
    fetchUnreadCount();
    fetchNotifications(false, filterType);

    const setupPolling = () => {
      // Clear previous intervals if any
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (unreadCountIntervalRef.current)
        clearInterval(unreadCountIntervalRef.current);

      const interval = document.hidden ? 60000 : 15000;

      // Poll notifications (if not filtering)
      if (filterType === "all") {
        pollingIntervalRef.current = setInterval(() => {
          fetchNotifications(true, "all");
        }, interval);
      }

      // Poll count regardless
      unreadCountIntervalRef.current = setInterval(() => {
        fetchUnreadCount();
      }, interval);
    };

    setupPolling();

    const handleVisibilityChange = () => {
      setupPolling(); // restart with new interval
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (unreadCountIntervalRef.current)
        clearInterval(unreadCountIntervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [filterType, fetchNotifications, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    loadingMore,
    hasMore,
    filterType,
    setFilterType,
    fetchNotifications,
    fetchUnreadCount,
    loadMore,
    markAsRead,
    markAllAsRead,
  };
}
