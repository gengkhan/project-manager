"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  X,
  Archive,
  ArchiveRestore,
  Trash2,
  MoreHorizontal,
  ExternalLink,
  Clock,
  Loader2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TabDetail } from "./tab-detail";
import { TabComment } from "./tab-comment";
import { TabActivity } from "./tab-activity";
import { PRIORITY_CONFIG } from "./task-card";
import api from "@/lib/api";

export function TaskDetailPanel({
  task,
  open,
  onClose,
  columns,
  members,
  labels,
  events,
  currentUserId,
  workspaceId,
  onUpdate,
  onDelete,
  onArchive,
  onUnarchive,
  onWatch,
  onUnwatch,
}) {
  const [activeTab, setActiveTab] = useState("detail");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleUpdate = useCallback(
    async (updates) => {
      if (!task) return;
      await onUpdate?.(task._id, updates);
    },
    [task, onUpdate],
  );

  const handleUploadAttachment = useCallback(
    async (file) => {
      if (!task) return;
      const formData = new FormData();
      formData.append("file", file);
      await api.post(
        `/workspaces/${workspaceId}/tasks/${task._id}/attachments`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      // Refresh task data
      const { data } = await api.get(
        `/workspaces/${workspaceId}/tasks/${task._id}`,
      );
      await onUpdate?.(task._id, { attachments: data.data.task.attachments });
    },
    [task, workspaceId, onUpdate],
  );

  const handleDeleteAttachment = useCallback(
    async (attachmentId) => {
      if (!task) return;
      await api.delete(
        `/workspaces/${workspaceId}/tasks/${task._id}/attachments/${attachmentId}`,
      );
      // Refresh task data
      const { data } = await api.get(
        `/workspaces/${workspaceId}/tasks/${task._id}`,
      );
      await onUpdate?.(task._id, { attachments: data.data.task.attachments });
    },
    [task, workspaceId, onUpdate],
  );

  if (!task) return null;

  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

  return (
    <>
      <Sheet open={open} onOpenChange={(val) => !val && onClose?.()}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-full sm:max-w-2xl p-0 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-card/50">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full shrink-0",
                  priority.color,
                )}
              />
              <SheetTitle className="text-sm font-medium truncate">
                {task.title}
              </SheetTitle>
              {task.isArchived && (
                <Badge
                  variant="outline"
                  className="text-[10px] border-amber-300 text-amber-600 shrink-0"
                >
                  Arsip
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Actions menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {task.isArchived ? (
                    <DropdownMenuItem
                      onClick={() => onUnarchive?.(task._id)}
                      className="gap-2 text-xs"
                    >
                      <ArchiveRestore className="h-3.5 w-3.5" />
                      Unarsipkan
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => onArchive?.(task._id)}
                      className="gap-2 text-xs"
                    >
                      <Archive className="h-3.5 w-3.5" />
                      Arsipkan
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="gap-2 text-xs text-destructive focus:text-destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Hapus Task
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <SheetDescription className="sr-only">
            Detail task {task.title}
          </SheetDescription>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="border-b px-4">
              <TabsList className="h-9 bg-transparent p-0 gap-4">
                <TabsTrigger
                  value="detail"
                  className="h-9 rounded-none border-b-2 border-transparent px-0 pb-2 pt-2 text-xs font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Detail
                </TabsTrigger>
                <TabsTrigger
                  value="comment"
                  className="h-9 rounded-none border-b-2 border-transparent px-0 pb-2 pt-2 text-xs font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Komentar
                </TabsTrigger>
                <TabsTrigger
                  value="activity"
                  className="h-9 rounded-none border-b-2 border-transparent px-0 pb-2 pt-2 text-xs font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Activity
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1">
              <div className="px-4 pb-6">
                <TabsContent value="detail" className="mt-0 outline-none">
                  <TabDetail
                    task={task}
                    columns={columns}
                    members={members}
                    labels={labels}
                    events={events}
                    currentUserId={currentUserId}
                    onUpdate={handleUpdate}
                    onWatch={() => onWatch?.(task._id)}
                    onUnwatch={() => onUnwatch?.(task._id)}
                    onUploadAttachment={handleUploadAttachment}
                    onDeleteAttachment={handleDeleteAttachment}
                    workspaceId={workspaceId}
                  />
                </TabsContent>
                <TabsContent value="comment" className="mt-0 outline-none">
                  <TabComment />
                </TabsContent>
                <TabsContent value="activity" className="mt-0 outline-none">
                  <TabActivity workspaceId={workspaceId} taskId={task._id} />
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>

          {/* Footer with meta info */}
          <div className="border-t px-4 py-2 bg-card/50 text-[10px] text-muted-foreground flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Dibuat{" "}
              {task.createdAt &&
                format(new Date(task.createdAt), "d MMM yyyy HH:mm", {
                  locale: localeId,
                })}
            </span>
            {task.createdBy && (
              <span>
                oleh{" "}
                {typeof task.createdBy === "string"
                  ? task.createdBy
                  : task.createdBy.name}
              </span>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Task</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah kamu yakin ingin menghapus task "{task.title}"? Tindakan
              ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                onDelete?.(task._id);
                setDeleteDialogOpen(false);
                onClose?.();
              }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
