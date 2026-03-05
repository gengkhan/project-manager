"use client";

import { useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { DiagramInner } from "./diagram-inner";
import { DiagramFullscreenModal } from "./diagram-fullscreen-modal";
import { Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DiagramWidgetNode({ widgetId, widgetData, onUpdateWidget }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <>
      <div className="w-full h-full relative overflow-hidden bg-background group nodrag nowheel">
        {/* Read-only preview */}
        <ReactFlowProvider>
          <DiagramInner
            widgetId={widgetId}
            initialData={widgetData}
            onUpdateWidget={() => {}}
            isPreview={true}
          />
        </ReactFlowProvider>

        {/* Overlay to intercept clicks and show fullscreen button */}
        <div className="absolute inset-0 z-10 bg-transparent flex items-center justify-center pointer-events-none group-hover:bg-background/20 transition-colors">
          <Button
            className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto shadow-md"
            onClick={() => setIsFullscreen(true)}
          >
            <Maximize2 className="h-4 w-4 mr-2" />
            Edit Diagram
          </Button>
        </div>
      </div>

      <DiagramFullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
        widgetId={widgetId}
        widgetData={widgetData}
        onUpdateWidget={(wId, data) => {
          onUpdateWidget(wId, data);
        }}
      />
    </>
  );
}
