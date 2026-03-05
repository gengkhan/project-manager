"use client";

import { memo, useState, useRef } from "react";
import { Handle, Position, NodeResizer } from "@xyflow/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Lock,
  Unlock,
  Trash2,
  ArrowUpToLine,
  ArrowDownToLine,
  ArrowUp,
  ArrowDown,
  ListTodo,
  BrainCircuit,
  Image,
  FileText,
  GripVertical,
  ImagePlus,
  Download,
} from "lucide-react";
import { TaskWidgetNode } from "./task-widget-node";
import { DiagramWidgetNode } from "./diagram/diagram-widget-node";
import { ImageWidgetNode } from "./image-widget-node";
import { TextWidgetNode } from "./text-widget-node";

const WIDGET_ICONS = {
  task: {
    icon: ListTodo,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    label: "Task",
  },
  mindmap: {
    icon: BrainCircuit,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    label: "Diagram",
  },
  diagram: {
    icon: BrainCircuit,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    label: "Diagram",
  },
  image: {
    icon: Image,
    color: "text-green-500",
    bg: "bg-green-500/10",
    label: "Gambar",
  },
  text: {
    icon: FileText,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    label: "Teks",
  },
};

const HANDLE_STYLE = {
  width: "0.8rem",
  height: "0.8rem",
};

function WidgetNodeComponent({ id, data, selected }) {
  const {
    type = "text",
    isLocked = false,
    isCollapsed = false,
    widgetData = {},
    onUpdate,
    onDelete,
    onLayerChange,
  } = data;

  // Image widget: ref for replace-image file input
  const imageReplaceRef = useRef(null);

  const widgetInfo = WIDGET_ICONS[type] || WIDGET_ICONS.text;
  const Icon = widgetInfo.icon;

  const handleToggleCollapse = () => {
    onUpdate?.(id, { isCollapsed: !isCollapsed });
  };

  const handleToggleLock = () => {
    onUpdate?.(id, { isLocked: !isLocked });
  };

  const handleDelete = () => {
    onDelete?.(id);
  };

  // Widget-specific content
  const renderContent = () => {
    switch (type) {
      case "task":
        return (
          <TaskWidgetNode
            widgetId={id}
            widgetData={widgetData}
            onUpdateWidget={(wId, data) => onUpdate?.(wId, data)}
          />
        );
      case "mindmap":
      case "diagram":
        return (
          <DiagramWidgetNode
            widgetId={id}
            widgetData={widgetData}
            onUpdateWidget={(wId, data) => onUpdate?.(wId, data)}
          />
        );
      case "image":
        return (
          <ImageWidgetNode
            widgetId={id}
            widgetData={widgetData}
            onUpdateWidget={(wId, data) => onUpdate?.(wId, data)}
          />
        );
      case "text":
        return (
          <TextWidgetNode
            widgetId={id}
            widgetData={widgetData}
            onUpdateWidget={(wId, data) => onUpdate?.(wId, data)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="group w-full h-full relative">
      {/* Resizer - only when selected and not locked */}
      <NodeResizer
        isVisible={selected && !isLocked}
        minWidth={200}
        minHeight={80}
        onResizeEnd={(e, params) => {
          onUpdate?.(id, {
            width: Math.round(params.width),
            height: Math.round(params.height),
            x: Math.round(params.x),
            y: Math.round(params.y),
          });
        }}
        lineClassName="!border-primary/50"
        handleClassName="!w-2.5 !h-2.5 !bg-primary !border-2 !border-background !rounded-sm"
      />

      {/* Connection handles — one per side, visible on hover */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className="transition-all duration-200 opacity-0 group-hover:opacity-100 hover:!opacity-100"
        style={HANDLE_STYLE}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="transition-all duration-200 opacity-0 group-hover:opacity-100 hover:!opacity-100"
        style={HANDLE_STYLE}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="transition-all duration-200 opacity-0 group-hover:opacity-100 hover:!opacity-100"
        style={HANDLE_STYLE}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="transition-all duration-200 opacity-0 group-hover:opacity-100 hover:!opacity-100"
        style={HANDLE_STYLE}
      />

      <div
        className={`bg-background border rounded-lg shadow-sm transition-shadow flex flex-col w-full h-full ${
          selected ? "ring-2 ring-primary/50 shadow-md" : "hover:shadow-md"
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center gap-2 px-3 py-2 border-b ${widgetInfo.bg} cursor-grab`}
        >
          <Icon className={`h-4 w-4 ${widgetInfo.color} shrink-0`} />
          <span className="text-sm font-medium truncate flex-1">
            {widgetData.title || widgetInfo.label}
          </span>

          <div className="flex items-center gap-0.5 shrink-0">
            {isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}

            {/* Collapse toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleCollapse();
              }}
            >
              {isCollapsed ? (
                <ChevronRight className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>

            {/* Context menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <ArrowUpToLine className="h-4 w-4 mr-2" />
                    Layer
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem
                      onClick={() => onLayerChange?.(id, "front")}
                    >
                      <ArrowUpToLine className="h-4 w-4 mr-2" />
                      Bring to Front
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onLayerChange?.(id, "back")}
                    >
                      <ArrowDownToLine className="h-4 w-4 mr-2" />
                      Send to Back
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onLayerChange?.(id, "forward")}
                    >
                      <ArrowUp className="h-4 w-4 mr-2" />
                      Bring Forward
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onLayerChange?.(id, "backward")}
                    >
                      <ArrowDown className="h-4 w-4 mr-2" />
                      Send Backward
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem onClick={handleToggleLock}>
                  {isLocked ? (
                    <Unlock className="h-4 w-4 mr-2" />
                  ) : (
                    <Lock className="h-4 w-4 mr-2" />
                  )}
                  {isLocked ? "Unlock" : "Lock Position"}
                </DropdownMenuItem>

                {/* Image-specific actions */}
                {type === "image" && widgetData?.imageUrl && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => imageReplaceRef.current?.click()}
                    >
                      <ImagePlus className="h-4 w-4 mr-2" />
                      Ganti Gambar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        if (widgetData?.imageUrl) {
                          const link = document.createElement("a");
                          link.href = widgetData.imageUrl;
                          link.download =
                            widgetData.originalFileName || "image";
                          link.target = "_blank";
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                  </>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Hapus Widget
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Hidden file input for image replace */}
            {type === "image" && (
              <input
                ref={imageReplaceRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const ALLOWED = [
                      "image/jpeg",
                      "image/png",
                      "image/gif",
                      "image/webp",
                    ];
                    if (!ALLOWED.includes(file.type)) {
                      return;
                    }
                    if (file.size > 1024 * 1024) {
                      return;
                    }
                    // Upload via ImgBB API or fallback to base64
                    const doUpload = async () => {
                      try {
                        let url;
                        const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
                        if (apiKey) {
                          const base64 = await new Promise(
                            (resolve, reject) => {
                              const reader = new FileReader();
                              reader.onload = (ev) =>
                                resolve(ev.target.result.split(",")[1]);
                              reader.onerror = reject;
                              reader.readAsDataURL(file);
                            },
                          );
                          const formData = new FormData();
                          formData.append("key", apiKey);
                          formData.append("image", base64);
                          const resp = await fetch(
                            "https://api.imgbb.com/1/upload",
                            { method: "POST", body: formData },
                          );
                          const data = await resp.json();
                          if (data.success) {
                            url = data.data.url;
                          } else {
                            throw new Error("ImgBB upload failed");
                          }
                        } else {
                          url = await new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = (ev) => resolve(ev.target.result);
                            reader.onerror = reject;
                            reader.readAsDataURL(file);
                          });
                        }
                        onUpdate?.(id, {
                          data: {
                            ...widgetData,
                            imageUrl: url,
                            imageSource: "upload",
                            originalFileName: file.name,
                            title: file.name,
                          },
                        });
                      } catch (err) {
                        console.error("Replace image error:", err);
                      }
                    };
                    doUpload();
                  }
                  if (e.target) e.target.value = "";
                }}
              />
            )}
          </div>
        </div>

        {/* Content (hidden when collapsed) */}
        {!isCollapsed && (
          <div className="flex-1 overflow-auto bg-muted/10 rounded-b-lg">
            {renderContent()}
          </div>
        )}
      </div>
    </div>
  );
}

export const WidgetNode = memo(WidgetNodeComponent);
