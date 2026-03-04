"use client";

import { useWorkspace } from "@/contexts/workspace-context";
import { useWidgetTasks } from "@/hooks/use-widget-tasks";
import { TaskCard } from "@/components/kanban/task-card";
import { Loader2, Search } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function TaskWidgetNode({ widgetId, widgetData, onUpdateWidget }) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?._id;

  const selectedTaskId = widgetData?.taskId || null;

  const { allTasks, selectedTask, loading } = useWidgetTasks(
    workspaceId,
    selectedTaskId,
  );

  const [open, setOpen] = useState(false);

  const handleSelectTask = (taskId) => {
    onUpdateWidget(widgetId, { data: { ...widgetData, taskId } });
    setOpen(false);
  };

  const handleRemoveTask = () => {
    onUpdateWidget(widgetId, { data: { ...widgetData, taskId: null } });
  };

  if (loading && allTasks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 h-full min-h-[150px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // State "Belum Dihubungkan" or Task was deleted/archived
  if (!selectedTaskId || (!selectedTask && !loading)) {
    return (
      <div className="flex flex-col items-center justify-center p-6 h-full min-h-[150px] bg-muted/20 text-center space-y-3">
        <p className="text-xs text-muted-foreground">
          {!selectedTaskId
            ? "Pilih Task untuk ditampilkan di widget ini"
            : "Task tidak ditemukan atau diarsipkan"}
        </p>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-[200px] text-xs justify-start h-8"
            >
              <Search className="mr-2 h-3.5 w-3.5 opacity-50" />
              Cari task...
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[250px] p-0"
            align="center"
            onClick={(e) => e.stopPropagation()}
          >
            <Command>
              <CommandInput
                placeholder="Ketik nama task..."
                className="text-xs h-8"
              />
              <CommandList>
                <CommandEmpty className="text-xs py-4 text-center text-muted-foreground">
                  Tidak ada task ditemukan.
                </CommandEmpty>
                <CommandGroup>
                  {allTasks.map((task) => (
                    <CommandItem
                      key={task._id}
                      value={task.title}
                      onSelect={() => handleSelectTask(task._id)}
                      className="text-xs py-2"
                    >
                      {task.title}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {selectedTaskId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemoveTask}
            className="text-[10px] h-6 mt-2 text-destructive"
          >
            Reset Widget
          </Button>
        )}
      </div>
    );
  }

  // State "Task Terpilih"
  return (
    <div
      className="flex flex-col h-full bg-background rounded-b-lg overflow-hidden relative"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="p-3 bg-secondary/10 flex-1 flex flex-col pointer-events-auto">
        {selectedTask ? (
          <TaskCard
            task={selectedTask}
            index={0}
            isSelected={false}
            isDraggable={false}
            onClick={() => {
              // Usually opens task dialog. Can be handled via global state or context if needed.
              // For now, it will look like a standard task card.
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        <div className="mt-3 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemoveTask}
            className="text-[10px] h-6 text-muted-foreground hover:text-destructive"
          >
            Ganti Task
          </Button>
        </div>
      </div>
    </div>
  );
}
