"use client";

import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
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

const SIZE_CLASSES = {
  small: "min-w-[100px] min-h-[40px] text-xs px-2 py-1",
  medium: "min-w-[150px] min-h-[50px] text-sm px-3 py-2",
  large: "min-w-[200px] min-h-[70px] text-base px-4 py-3",
};

const BORDER_CLASSES = {
  solid: "border-2 border-primary/50",
  dashed: "border-2 border-dashed border-primary/50",
  none: "border-none shadow-md",
};

// CSS-based shape rendering
const SHAPE_STYLES = {
  rectangle: {},
  rounded: {},
  ellipse: {},
  diamond: {
    clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
  },
  parallelogram: {
    clipPath: "polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%)",
  },
  hexagon: {
    clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
  },
  triangle: {
    clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)",
  },
  "sticky-note": {},
};

const SHAPE_CLASSES = {
  rectangle: "rounded-md",
  rounded: "rounded-2xl",
  ellipse: "rounded-[50%]",
  diamond: "",
  parallelogram: "rounded-sm",
  hexagon: "",
  triangle: "",
  "sticky-note": "rounded-sm",
};

function DiagramNodeComponent({ id, data, selected }) {
  const { setNodes } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);

  const {
    text = "New Node",
    shape = DEFAULT_NODE_STYLES.shape,
    size = DEFAULT_NODE_STYLES.size,
    color = DEFAULT_NODE_STYLES.color,
    borderStyle = DEFAULT_NODE_STYLES.borderStyle,
    icon = DEFAULT_NODE_STYLES.icon,
  } = data;

  const [editText, setEditText] = useState(text);
  const inputRef = useRef(null);

  useEffect(() => {
    setEditText(text);
  }, [text]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const IconComponent = icon && LucideIcons[icon] ? LucideIcons[icon] : null;

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    if (!data.isPreview) setIsEditing(true);
  };

  const saveText = () => {
    setIsEditing(false);
    if (editText !== text) {
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

  // Determine if we need content rotation (for shapes using clip-path)
  const needsContentPadding =
    shape === "diamond" || shape === "triangle" || shape === "hexagon";

  // Sticky note has a fixed default yellow background and corner fold
  const isStickyNote = shape === "sticky-note";
  const bgColor = isStickyNote && color === "#ffffff" ? "#fef08a" : color;

  // Handle style — all 4 sides for full freeform connectivity
  const handleClassName =
    "opacity-0 group-hover:opacity-100 transition-opacity !w-3 !h-3 !border-2 !border-primary !bg-background";

  return (
    <div className="group">
      {/* Handles on all 4 sides — both source AND target for freeform flow */}
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        className={handleClassName}
        style={{ top: -6 }}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        className={handleClassName}
        style={{ top: -6 }}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        className={handleClassName}
        style={{ bottom: -6 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        className={handleClassName}
        style={{ bottom: -6 }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        className={handleClassName}
        style={{ left: -6 }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        className={handleClassName}
        style={{ left: -6 }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        className={handleClassName}
        style={{ right: -6 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className={handleClassName}
        style={{ right: -6 }}
      />

      <div
        onDoubleClick={handleDoubleClick}
        className={cn(
          "relative flex items-center justify-center text-center outline-none transition-shadow duration-200 break-words cursor-pointer",
          SIZE_CLASSES[size],
          BORDER_CLASSES[borderStyle],
          SHAPE_CLASSES[shape],
          selected
            ? "ring-2 ring-primary ring-offset-1"
            : "hover:ring-1 hover:ring-primary/50",
          needsContentPadding && "px-6 py-4",
        )}
        style={{
          backgroundColor: bgColor,
          ...SHAPE_STYLES[shape],
        }}
      >
        {/* Sticky note corner fold */}
        {isStickyNote && (
          <div
            className="absolute top-0 right-0 w-5 h-5"
            style={{
              background: `linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.08) 50%)`,
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
              style={{
                lineHeight: "1.2",
              }}
            />
          ) : (
            <span className="truncate whitespace-pre-wrap leading-tight w-full pointer-events-none">
              {text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export const DiagramNode = memo(DiagramNodeComponent);
