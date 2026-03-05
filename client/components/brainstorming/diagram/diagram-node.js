"use client";

import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, useReactFlow, NodeResizer } from "@xyflow/react";
import { cn } from "@/lib/utils";
import * as LucideIcons from "lucide-react";

// Default properties for a diagram node
export const DEFAULT_NODE_STYLES = {
  shape: "rectangle",
  size: "medium",
  color: "#ffffff",
  borderStyle: "solid",
  icon: null,
};

const SIZE_MAP = {
  small: { minWidth: 100, minHeight: 40, width: 120, height: 50 },
  medium: { minWidth: 150, minHeight: 50, width: 170, height: 60 },
  large: { minWidth: 200, minHeight: 70, width: 220, height: 85 },
};

const SIZE_CLASSES = {
  small: "text-xs",
  medium: "text-sm",
  large: "text-base",
};

const PADDING_CLASSES = {
  small: "px-2 py-1",
  medium: "px-3 py-2",
  large: "px-4 py-3",
};

const BORDER_CLASSES = {
  solid: "border-2 border-primary/50",
  dashed: "border-2 border-dashed border-primary/50",
  none: "border-none shadow-md",
};

// Shapes that use SVG for proper border (clip-path clips CSS border)
const SVG_SHAPES = ["diamond", "parallelogram", "hexagon", "triangle"];

// CSS-based shape rendering for non-SVG shapes
const SHAPE_STYLES = {
  rectangle: {},
  rounded: {},
  ellipse: {},
  diamond: {},
  parallelogram: {},
  hexagon: {},
  triangle: {},
  "sticky-note": {},
};

const SHAPE_CLASSES = {
  rectangle: "",
  rounded: "rounded-2xl",
  ellipse: "rounded-[50%]",
  diamond: "",
  parallelogram: "",
  hexagon: "",
  triangle: "",
  "sticky-note": "",
};

// SVG path definitions for shapes (normalized 0-1 coordinates)
const SHAPE_PATHS = {
  diamond: "M 0.5 0 L 1 0.5 L 0.5 1 L 0 0.5 Z",
  parallelogram: "M 0.15 0 L 1 0 L 0.85 1 L 0 1 Z",
  hexagon: "M 0.25 0 L 0.75 0 L 1 0.5 L 0.75 1 L 0.25 1 L 0 0.5 Z",
  triangle: "M 0.5 0 L 1 1 L 0 1 Z",
};

const SHAPE_CLIP_PATHS = {
  diamond: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
  parallelogram: "polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%)",
  hexagon: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
  triangle: "polygon(50% 0%, 100% 100%, 0% 100%)",
};

function DiagramNodeComponent({ id, data, selected }) {
  const { setNodes } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const nodeRef = useRef(null);

  const {
    text = "New Node",
    shape = DEFAULT_NODE_STYLES.shape,
    size = DEFAULT_NODE_STYLES.size,
    color = DEFAULT_NODE_STYLES.color,
    borderStyle = DEFAULT_NODE_STYLES.borderStyle,
    icon = DEFAULT_NODE_STYLES.icon,
    width,
    height,
    isPreview,
    onNodeResize,
    onTextChange,
  } = data;

  const [editText, setEditText] = useState(text);
  //...
  const inputRef = useRef(null);
  const resizeTimeoutRef = useRef(null);

  const sizeDims = SIZE_MAP[size] || SIZE_MAP.medium;
  const nodeWidth = width ?? sizeDims.width;
  const nodeHeight = height ?? sizeDims.height;
  const minW = sizeDims.minWidth;
  const minH = sizeDims.minHeight;

  useEffect(() => {
    setEditText(text);
  }, [text]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const needsContentPadding =
    shape === "diamond" || shape === "triangle" || shape === "hexagon";

  const IconComponent = icon && LucideIcons[icon] ? LucideIcons[icon] : null;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      const el = inputRef.current;
      el.style.height = "auto";
      const scrollH = el.scrollHeight;
      el.style.height = scrollH + "px";

      const paddingOffset =
        (IconComponent ? 24 : 0) + (needsContentPadding ? 40 : 24);
      const expectedHeight = Math.max(minH, scrollH + paddingOffset);

      if (Math.abs(expectedHeight - nodeHeight) > 4) {
        if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
        resizeTimeoutRef.current = setTimeout(() => {
          if (onNodeResize) {
            onNodeResize(id, { width: nodeWidth, height: expectedHeight });
          } else {
            setNodes((nds) =>
              nds.map((node) =>
                node.id === id
                  ? {
                      ...node,
                      style: { ...node.style, height: expectedHeight },
                      data: { ...node.data, height: expectedHeight },
                    }
                  : node,
              ),
            );
          }
        }, 10);
      }
    }
  }, [
    editText,
    isEditing,
    minH,
    nodeHeight,
    nodeWidth,
    id,
    onNodeResize,
    setNodes,
    IconComponent,
    needsContentPadding,
  ]);

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    if (!isPreview) setIsEditing(true);
  };

  const saveText = () => {
    setIsEditing(false);
    if (editText !== text) {
      if (data.onTextChange) {
        data.onTextChange(id, editText);
      } else {
        setNodes((nds) =>
          nds.map((node) => {
            if (node.id === id) {
              return {
                ...node,
                data: {
                  ...node.data,
                  text: editText,
                },
              };
            }
            return node;
          }),
        );
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      saveText();
    } else if (e.key === "Escape") {
      setEditText(text);
      setIsEditing(false);
    }
  };
  const isStickyNote = shape === "sticky-note";
  const bgColor = isStickyNote && color === "#ffffff" ? "#fef08a" : color;
  const useSvgShape = SVG_SHAPES.includes(shape);
  const borderColor = "#94a3b8";

  const handleClassName =
    "opacity-0 group-hover:opacity-100 transition-opacity !w-3 !h-3 !border-2 !border-primary !bg-background";
  const handleOffset = 6;

  return (
    <div ref={nodeRef} className="group w-full h-full relative">
      {/* NodeResizer - only when selected and not preview */}
      {!isPreview && (
        <NodeResizer
          isVisible={selected}
          minWidth={minW}
          minHeight={minH}
          onResizeEnd={(e, params) => {
            const w = Math.round(params.width);
            const h = Math.round(params.height);
            if (onNodeResize) {
              onNodeResize(id, { width: w, height: h });
            } else {
              setNodes((nds) =>
                nds.map((node) =>
                  node.id === id
                    ? {
                        ...node,
                        style: { ...node.style, width: w, height: h },
                        data: { ...node.data, width: w, height: h },
                      }
                    : node,
                ),
              );
            }
          }}
          lineClassName="!border-primary/50"
          handleClassName="!w-2.5 !h-2.5 !bg-primary !border-2 !border-background !rounded-sm"
        />
      )}

      {/* Handles on all 4 sides */}
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        className={handleClassName}
        style={{ top: -handleOffset }}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        className={handleClassName}
        style={{ top: -handleOffset }}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        className={handleClassName}
        style={{ bottom: -handleOffset }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        className={handleClassName}
        style={{ bottom: -handleOffset }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        className={handleClassName}
        style={{ left: -handleOffset }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        className={handleClassName}
        style={{ left: -handleOffset }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        className={handleClassName}
        style={{ right: -handleOffset }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className={handleClassName}
        style={{ right: -handleOffset }}
      />

      {useSvgShape ? (
        /* SVG-based shape rendering — proper borders for diamond, parallelogram, hexagon, triangle */
        <div
          className="relative w-full h-full"
          style={{ isolation: "isolate" }}
        >
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 1 1"
            preserveAspectRatio="none"
          >
            <path
              d={SHAPE_PATHS[shape]}
              fill={bgColor}
              stroke={borderStyle !== "none" ? borderColor : "none"}
              strokeWidth={borderStyle !== "none" ? 1 : 0}
              strokeDasharray={
                borderStyle === "dashed"
                  ? "0.04 1"
                  : borderStyle === "dotted"
                    ? "0.01 1"
                    : undefined
              }
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div
            onDoubleClick={handleDoubleClick}
            className={cn(
              "absolute inset-0 flex items-center justify-center text-center outline-none transition-shadow duration-200 break-words cursor-pointer",
              SIZE_CLASSES[size],
              PADDING_CLASSES[size],
              selected
                ? "ring-2 ring-primary ring-offset-1"
                : "hover:ring-1 hover:ring-primary/50",
              needsContentPadding && "px-6 py-4",
            )}
            style={{
              clipPath: SHAPE_CLIP_PATHS[shape],
              backgroundColor: "transparent",
            }}
          >
            <div className="flex flex-col items-center gap-1 max-w-full overflow-hidden w-full px-1">
              {IconComponent && !isEditing && (
                <IconComponent className="h-4 w-4 shrink-0" />
              )}
              {isEditing ? (
                <textarea
                  ref={inputRef}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={saveText}
                  onKeyDown={handleKeyDown}
                  className="nodrag nowheel resize-none bg-transparent outline-none w-full text-center scrollbar-none"
                  rows={Math.max(1, editText.split("\n").length)}
                  style={{ lineHeight: "1.2" }}
                />
              ) : (
                <span className="truncate whitespace-pre-wrap leading-tight w-full pointer-events-none">
                  {text}
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* CSS-based shape for rectangle, rounded, ellipse, sticky-note */
        <div
          onDoubleClick={handleDoubleClick}
          className={cn(
            "w-full h-full relative flex items-center justify-center text-center outline-none transition-shadow duration-200 break-words cursor-pointer box-border",
            SIZE_CLASSES[size],
            PADDING_CLASSES[size],
            BORDER_CLASSES[borderStyle],
            SHAPE_CLASSES[shape],
            selected
              ? "ring-2 ring-primary ring-offset-1"
              : "hover:ring-1 hover:ring-primary/50",
          )}
          style={{
            backgroundColor: bgColor,
          }}
        >
          {isStickyNote && (
            <div
              className="absolute top-0 right-0 w-5 h-5 pointer-events-none rotate-x-180"
              style={{
                background: `linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.3) 50%)`,
              }}
            />
          )}
          <div className="flex flex-col items-center gap-1 max-w-full overflow-hidden w-full px-1">
            {IconComponent && !isEditing && (
              <IconComponent className="h-4 w-4 shrink-0" />
            )}
            {isEditing ? (
              <textarea
                ref={inputRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onBlur={saveText}
                onKeyDown={handleKeyDown}
                className="nodrag nowheel resize-none bg-transparent outline-none w-full text-center scrollbar-none"
                rows={Math.max(1, editText.split("\n").length)}
                style={{ lineHeight: "1.2" }}
              />
            ) : (
              <span className="truncate whitespace-pre-wrap leading-tight w-full pointer-events-none">
                {text}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const DiagramNode = memo(DiagramNodeComponent);
