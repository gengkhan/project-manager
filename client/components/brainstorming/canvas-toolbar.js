"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  ZoomIn,
  ZoomOut,
  Maximize,
  Map,
  Download,
  ListTodo,
  BrainCircuit,
  Image,
  FileText,
} from "lucide-react";

const WIDGET_TYPES = [
  {
    type: "task",
    label: "Widget Task",
    icon: ListTodo,
    color: "text-blue-500",
  },
  {
    type: "diagram",
    label: "Widget Diagram",
    icon: BrainCircuit,
    color: "text-purple-500",
  },
  {
    type: "image",
    label: "Widget Gambar",
    icon: Image,
    color: "text-green-500",
  },
  {
    type: "text",
    label: "Widget Teks",
    icon: FileText,
    color: "text-orange-500",
  },
];

export function CanvasToolbar({
  onAddWidget,
  onZoomIn,
  onZoomOut,
  onFitView,
  onToggleMinimap,
  showMinimap,
  onExport,
  zoom = 1,
}) {
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-background/90 backdrop-blur-md border rounded-lg shadow-lg px-2 py-1.5">
      {/* Add Widget */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1.5 h-8">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">Tambah Widget</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {WIDGET_TYPES.map(({ type, label, icon: Icon, color }) => (
            <DropdownMenuItem
              key={type}
              onClick={() => onAddWidget(type)}
              className="gap-2"
            >
              <Icon className={`h-4 w-4 ${color}`} />
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Zoom controls */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onZoomOut}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Zoom Out</TooltipContent>
      </Tooltip>

      <span className="text-xs text-muted-foreground w-10 text-center tabular-nums">
        {Math.round(zoom * 100)}%
      </span>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onZoomIn}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Zoom In</TooltipContent>
      </Tooltip>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Fit to screen */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onFitView}
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Fit to Screen</TooltipContent>
      </Tooltip>

      {/* Toggle minimap */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={showMinimap ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={onToggleMinimap}
          >
            <Map className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {showMinimap ? "Sembunyikan" : "Tampilkan"} Minimap
        </TooltipContent>
      </Tooltip>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Export */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onExport}
          >
            <Download className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Export</TooltipContent>
      </Tooltip>
    </div>
  );
}
