"use client";

import { useState } from "react";
import { useWorkspace } from "@/contexts/workspace-context";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Filter, X } from "lucide-react";

const TARGET_TYPES = [
  { value: "all", label: "Semua Modul" },
  { value: "task", label: "Task" },
  { value: "event", label: "Event" },
  { value: "spreadsheet", label: "Spreadsheet" },
  { value: "workspace", label: "Workspace" },
];

export function ActivityFilters({ onChange }) {
  const { members } = useWorkspace();
  const [actorId, setActorId] = useState("all");
  const [targetType, setTargetType] = useState("all");

  const applyFilters = (newActorId, newTargetType) => {
    const params = {};
    if (newActorId && newActorId !== "all") params.actorId = newActorId;
    if (newTargetType && newTargetType !== "all")
      params.targetType = newTargetType;
    onChange?.(params);
  };

  const handleActorChange = (val) => {
    setActorId(val);
    applyFilters(val, targetType);
  };

  const handleTargetTypeChange = (val) => {
    setTargetType(val);
    applyFilters(actorId, val);
  };

  const handleReset = () => {
    setActorId("all");
    setTargetType("all");
    onChange?.({});
  };

  const hasActiveFilters = actorId !== "all" || targetType !== "all";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Filter className="h-4 w-4 text-muted-foreground shrink-0" />

      {/* Member filter */}
      <Select value={actorId} onValueChange={handleActorChange}>
        <SelectTrigger className="w-[180px] h-8 text-xs">
          <SelectValue placeholder="Semua Member" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Member</SelectItem>
          {members?.map((m) => (
            <SelectItem key={m.userId} value={m.userId}>
              <div className="flex items-center gap-2">
                <Avatar className="h-4 w-4">
                  <AvatarImage src={m.avatar} />
                  <AvatarFallback className="text-[8px]">
                    {m.name?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{m.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Module filter */}
      <Select value={targetType} onValueChange={handleTargetTypeChange}>
        <SelectTrigger className="w-[160px] h-8 text-xs">
          <SelectValue placeholder="Semua Modul" />
        </SelectTrigger>
        <SelectContent>
          {TARGET_TYPES.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Reset */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3 mr-1" />
          Reset
        </Button>
      )}
    </div>
  );
}
