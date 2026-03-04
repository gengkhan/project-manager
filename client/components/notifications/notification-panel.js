"use client";

import React from "react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  MessageSquare,
  UserPlus,
  AtSign,
  ListTodo,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const getIconForType = (type) => {
  switch (type) {
    case "mention":
      return <AtSign className="h-4 w-4 text-blue-500" />;
    case "assign_task":
      return <ListTodo className="h-4 w-4 text-purple-500" />;
    case "due_date":
      return <Clock className="h-4 w-4 text-orange-500" />;
    case "new_comment":
      return <MessageSquare className="h-4 w-4 text-green-500" />;
    case "new_member":
      return <UserPlus className="h-4 w-4 text-teal-500" />;
    case "event_start":
    case "task_update":
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    default:
      return <Bell className="h-4 w-4 text-gray-400" />;
  }
};

const FILTER_OPTIONS = [
  { value: "all", label: "Semua" },
  { value: "mention", label: "Mention" },
  { value: "task", label: "Tugas" }, // Map to assign_task behind the scenes, or backend handles it? Backend handles type exact match.
  // We'll keep filters simple or match backend types
];

export function NotificationPanel({ open, onOpenChange, notificationsHook }) {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    loading,
    loadingMore,
    hasMore,
    filterType,
    setFilterType,
    loadMore,
    markAsRead,
    markAllAsRead,
  } = notificationsHook;

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }
    onOpenChange(false);
    router.push(notification.url);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-md p-0 flex flex-col h-full bg-background"
        side="right"
      >
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifikasi
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-1 h-5 px-1.5 rounded-full text-xs"
                >
                  {unreadCount}
                </Badge>
              )}
            </SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8 text-muted-foreground hover:text-foreground"
              onClick={() => markAllAsRead()}
              disabled={unreadCount === 0}
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Tandai semua dibaca
            </Button>
          </div>

          <div className="flex gap-2 mt-4 overflow-x-auto pb-1 scrollbar-hide">
            <Button
              variant={filterType === "all" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs rounded-full"
              onClick={() => setFilterType("all")}
            >
              Semua
            </Button>
            <Button
              variant={filterType === "mention" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs rounded-full"
              onClick={() => setFilterType("mention")}
            >
              Mention
            </Button>
            <Button
              variant={filterType === "assign_task" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs rounded-full"
              onClick={() => setFilterType("assign_task")}
            >
              Tugas
            </Button>
            <Button
              variant={filterType === "new_comment" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs rounded-full"
              onClick={() => setFilterType("new_comment")}
            >
              Komentar
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 p-0">
          {loading && notifications.length === 0 ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center h-full min-h-[50vh]">
              <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4 text-muted-foreground">
                <Bell className="h-8 w-8 opacity-50" />
              </div>
              <h3 className="font-medium text-lg">Belum ada notifikasi</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Kamu akan mendapat pemberitahuan di sini saat ada aktivitas
                baru.
              </p>
            </div>
          ) : (
            <div className="flex flex-col divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`flex gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                    !notification.isRead ? "bg-primary/5" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="relative mt-1 shrink-0">
                    <Avatar className="h-10 w-10 border">
                      <AvatarImage src={notification.actorId?.avatar} />
                      <AvatarFallback>
                        {notification.actorId?.name?.charAt(0) || "S"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 shadow-sm border">
                      {getIconForType(notification.type)}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-snug">
                      {notification.actorId && (
                        <span className="font-semibold mr-1">
                          {notification.actorId.name}
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        {notification.message}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                        locale: id,
                      })}
                    </p>
                  </div>

                  {!notification.isRead && (
                    <div className="shrink-0 flex items-center justify-center w-4">
                      <div className="h-2 w-2 bg-primary rounded-full"></div>
                    </div>
                  )}
                </div>
              ))}

              {hasMore && (
                <div className="p-4 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      loadMore();
                    }}
                    disabled={loadingMore}
                    className="w-full"
                  >
                    {loadingMore ? "Memuat..." : "Muat sebelumnya"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
