"use client";

import { memo, useRef, useEffect, useCallback } from "react";
import { Droppable } from "@hello-pangea/dnd";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskCard, isBlocked } from "./task-card";
import { cn } from "@/lib/utils";

function KanbanColumnInner({
  column,
  tasks,
  totalCount,
  hasMore,
  columnLoading,
  doneColumnIds,
  selectedTaskIds,
  onToggleSelect,
  onTaskClick,
  onQuickCreate,
  onLoadMore,
}) {
  const sentinelRef = useRef(null);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || columnLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !columnLoading) {
          onLoadMore?.(column._id);
        }
      },
      { rootMargin: "100px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, columnLoading, column._id, onLoadMore]);

  return (
    <div className="flex flex-col min-w-[300px] max-w-[340px] w-[300px] shrink-0 h-full border shadow-sm rounded-md">
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-2.5 mb-2 border-b border-dashed">
        <span
          className="h-3 w-3 rounded-full shrink-0 shadow-sm"
          style={{ backgroundColor: column.color }}
        />
        <h3 className="text-sm font-semibold text-foreground flex-1 truncate">
          {column.name}
        </h3>
        <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full min-w-[24px] text-center">
          {totalCount ?? tasks.length}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={() => onQuickCreate?.(column._id)}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Droppable area — scrollable */}
      <Droppable droppableId={column._id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 rounded-xl border border-dashed border-transparent p-1.5 transition-colors min-h-[120px] overflow-y-auto max-h-[calc(100vh-260px)] scrollbar-thin",
              snapshot.isDraggingOver && "border-primary/30 bg-primary/5",
            )}
          >
            <div className="space-y-2">
              {tasks.map((task, index) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  index={index}
                  isSelected={selectedTaskIds.has(task._id)}
                  onToggleSelect={onToggleSelect}
                  onClick={onTaskClick}
                  isDependencyBlocked={isBlocked(task, doneColumnIds)}
                />
              ))}
              {provided.placeholder}
            </div>

            {/* Infinite scroll sentinel */}
            {hasMore && (
              <div ref={sentinelRef} className="flex justify-center py-3">
                {columnLoading && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            )}

            {/* Loading indicator for initial load */}
            {columnLoading && tasks.length === 0 && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Empty state */}
            {tasks.length === 0 &&
              !snapshot.isDraggingOver &&
              !columnLoading && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-xs text-muted-foreground/60 mb-2">
                    Tidak ada task
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1 text-muted-foreground hover:text-foreground h-7"
                    onClick={() => onQuickCreate?.(column._id)}
                  >
                    <Plus className="h-3 w-3" />
                    Tambah task
                  </Button>
                </div>
              )}
          </div>
        )}
      </Droppable>
    </div>
  );
}

export const KanbanColumn = memo(KanbanColumnInner);
