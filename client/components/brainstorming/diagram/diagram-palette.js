"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Square,
  Circle,
  Diamond,
  Triangle,
  Hexagon,
  StickyNote,
  Type,
  MousePointer2,
  RectangleHorizontal,
} from "lucide-react";

const SHAPE_BUTTONS = [
  { shape: "rectangle", icon: Square, label: "Rectangle" },
  { shape: "rounded", icon: RectangleHorizontal, label: "Rounded Rect" },
  { shape: "ellipse", icon: Circle, label: "Ellipse" },
  { shape: "diamond", icon: Diamond, label: "Diamond" },
  { shape: "hexagon", icon: Hexagon, label: "Hexagon" },
  { shape: "triangle", icon: Triangle, label: "Triangle" },
  { shape: "sticky-note", icon: StickyNote, label: "Sticky Note" },
  { shape: "text", icon: Type, label: "Text Label" },
];

export function DiagramPalette({ onAddNode }) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 bg-background/95 backdrop-blur-md border rounded-full shadow-lg px-3 py-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
            >
              <MousePointer2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Select Tool</TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-border mx-0.5" />

        {SHAPE_BUTTONS.map((btn) => (
          <Tooltip key={btn.shape}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full hover:bg-muted"
                onClick={() => onAddNode(btn.shape)}
              >
                <btn.icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{btn.label}</TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
}
