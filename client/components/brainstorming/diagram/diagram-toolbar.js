"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  LayoutGrid,
  Download,
  Maximize2,
  Minimize,
  ZoomIn,
  ZoomOut,
  Maximize,
} from "lucide-react";

export function DiagramToolbar({
  onAutoArrange,
  onExport,
  onFullscreen,
  isFullscreen = false,
  onZoomIn,
  onZoomOut,
  onFitView,
  zoom = 1,
}) {
  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-background/90 backdrop-blur-md border rounded-lg shadow-sm px-1.5 py-1">
      <TooltipProvider>
        {/* Zoom controls */}
        {(onZoomIn || onZoomOut || onFitView) && isFullscreen && (
          <>
            <div className="flex items-center gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={onZoomOut}
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom Out</TooltipContent>
              </Tooltip>
              <span className="text-xs text-muted-foreground min-w-10 text-center tabular-nums">
                {zoomPercent}%
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={onZoomIn}
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom In</TooltipContent>
              </Tooltip>
              {onFitView && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={onFitView}
                    >
                      <Maximize className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Fit View</TooltipContent>
                </Tooltip>
              )}
            </div>
            <div className="w-px h-4 bg-border mx-1" />
          </>
        )}

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onAutoArrange}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Auto Arrange</TooltipContent>
          </Tooltip>
        </div>

        <div className="w-px h-4 bg-border mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onExport}
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Export ke PNG</TooltipContent>
        </Tooltip>

        {isFullscreen && (
          <>
            <div className="w-px h-4 bg-border mx-1" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onFullscreen}
                >
                  <Minimize className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Exit</TooltipContent>
            </Tooltip>
          </>
        )}
      </TooltipProvider>
    </div>
  );
}
