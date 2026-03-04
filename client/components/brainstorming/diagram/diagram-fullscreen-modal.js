"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from "@/components/ui/dialog";
import { ReactFlowProvider } from "@xyflow/react";
import { DiagramInner } from "./diagram-inner";

export function DiagramFullscreenModal({
  isOpen,
  onClose,
  widgetId,
  widgetData,
  onUpdateWidget,
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[95vh] flex flex-col p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Fullscreen Diagram</DialogTitle>
          <DialogDescription>
            Fullscreen view of diagram widget
          </DialogDescription>
        </DialogHeader>
        <div
          className="flex-1 w-full h-full relative"
          onWheelCapture={(e) => e.stopPropagation()}
          onPointerDownCapture={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <ReactFlowProvider>
            <DiagramInner
              widgetId={widgetId}
              initialData={widgetData}
              onUpdateWidget={onUpdateWidget}
              isFullscreen={true}
            />
          </ReactFlowProvider>
        </div>
      </DialogContent>
    </Dialog>
  );
}
