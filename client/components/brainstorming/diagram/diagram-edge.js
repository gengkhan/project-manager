"use client";

import { memo, useState, useRef, useEffect } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  getStraightPath,
  getBezierPath,
} from "@xyflow/react";
import { cn } from "@/lib/utils";

const ARROW_MARKERS = {
  "one-way": "url(#arrowhead)",
  "two-way": "url(#arrowhead)",
  none: "",
};

function DiagramEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
  selected,
}) {
  const {
    label = "",
    lineStyle = "solid",
    color = "#64748b",
    arrowType = "one-way",
    onLabelChange,
    isPreview = false,
  } = data || {};

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(label);
  const inputRef = useRef(null);

  useEffect(() => {
    setEditText(label);
  }, [label]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Choose path type based on line style
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const strokeDasharray =
    lineStyle === "dashed" ? "8,4" : lineStyle === "dotted" ? "2,4" : undefined;

  const handleLabelDoubleClick = (e) => {
    e.stopPropagation();
    if (!isPreview) setIsEditing(true);
  };

  const saveLabel = () => {
    setIsEditing(false);
    if (editText !== label && onLabelChange) {
      onLabelChange(id, editText);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveLabel();
    } else if (e.key === "Escape") {
      setEditText(label);
      setIsEditing(false);
    }
  };

  return (
    <>
      {/* SVG defs for arrow markers */}
      <svg style={{ position: "absolute", width: 0, height: 0 }}>
        <defs>
          <marker
            id="arrowhead"
            markerWidth="12"
            markerHeight="8"
            refX="10"
            refY="4"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M 0 0 L 12 4 L 0 8 z" fill={color} />
          </marker>
        </defs>
      </svg>

      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth: selected ? 2.5 : 1.5,
          strokeDasharray,
          ...style,
        }}
        markerEnd={
          arrowType === "one-way" || arrowType === "two-way"
            ? ARROW_MARKERS["one-way"]
            : ""
        }
        markerStart={arrowType === "two-way" ? ARROW_MARKERS["two-way"] : ""}
      />

      <EdgeLabelRenderer>
        <div
          className={cn(
            "absolute nodrag nopan pointer-events-auto",
            "transform -translate-x-1/2 -translate-y-1/2",
          )}
          style={{
            left: labelX,
            top: labelY,
          }}
          onDoubleClick={handleLabelDoubleClick}
        >
          {isEditing ? (
            <input
              ref={inputRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={saveLabel}
              onKeyDown={handleKeyDown}
              className="bg-background border rounded px-2 py-0.5 text-xs outline-none shadow-sm min-w-[60px] text-center"
              placeholder="Label..."
            />
          ) : (
            <div
              className={cn(
                "text-xs px-1.5 py-0.5 rounded cursor-pointer select-none transition-colors",
                label
                  ? "bg-background/90 border shadow-sm text-foreground"
                  : "text-transparent hover:bg-muted/50 hover:text-muted-foreground",
              )}
            >
              {label || "add label"}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const DiagramEdge = memo(DiagramEdgeComponent);
