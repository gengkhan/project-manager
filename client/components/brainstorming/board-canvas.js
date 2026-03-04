"use client";

import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import {
  ReactFlow,
  MiniMap,
  Background,
  BackgroundVariant,
  useReactFlow,
  useViewport,
  ReactFlowProvider,
  applyNodeChanges,
  applyEdgeChanges,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { WidgetNode } from "./widget-node";
import { ConnectionEdge } from "./connection-edge";
import { CanvasToolbar } from "./canvas-toolbar";
import { toast } from "sonner";

// Map handle position to side string
const positionToSide = {
  top: "top",
  bottom: "bottom",
  left: "left",
  right: "right",
};

function getSideFromHandleId(handleId) {
  if (!handleId) return "right";
  return positionToSide[handleId] || "right";
}

// Convert a widget from API to a React Flow node
function widgetToNode(w, handlers, isReadOnly) {
  return {
    id: w._id,
    type: "widget",
    position: { x: w.x, y: w.y },
    data: {
      type: w.type,
      isLocked: w.isLocked,
      isCollapsed: w.isCollapsed,
      widgetData: w.data || {},
      onUpdate: isReadOnly ? undefined : handlers.onUpdate,
      onDelete: isReadOnly ? undefined : handlers.onDelete,
      onLayerChange: isReadOnly ? undefined : handlers.onLayerChange,
    },
    style: {
      width: w.width,
      height: w.isCollapsed ? "auto" : w.height,
      zIndex: w.zIndex,
    },
    draggable: !w.isLocked && !isReadOnly,
    connectable: !isReadOnly,
  };
}

// Convert a connection from API to a React Flow edge
function connectionToEdge(c, onDelete, isReadOnly) {
  return {
    id: c._id,
    source: c.fromWidgetId,
    target: c.toWidgetId,
    sourceHandle: c.fromSide,
    targetHandle: c.toSide,
    type: "connection",
    data: {
      lineStyle: c.lineStyle,
      color: c.color,
      arrowType: c.arrowType,
      label: c.label,
      onDelete: isReadOnly ? undefined : onDelete,
    },
  };
}

// ── Inner Canvas (needs ReactFlowProvider above) ────
function CanvasInner({
  widgets,
  connections,
  onAddWidget,
  onUpdateWidget,
  onDeleteWidget,
  onAddConnection,
  onUpdateConnection,
  onDeleteConnection,
  isReadOnly = false,
}) {
  const { zoomIn, zoomOut, fitView, getZoom } = useReactFlow();
  const viewport = useViewport();
  const [showMinimap, setShowMinimap] = useState(false);

  // Use refs for handlers to avoid stale closures in node data
  const handlersRef = useRef({});

  // ── Widget handlers (stable via ref) ────────────
  const handleWidgetUpdate = useCallback(
    (widgetId, updates) => {
      onUpdateWidget?.(widgetId, updates);
    },
    [onUpdateWidget],
  );

  const handleWidgetDelete = useCallback(
    (widgetId) => {
      onDeleteWidget?.(widgetId);
    },
    [onDeleteWidget],
  );

  const handleLayerChange = useCallback(
    (widgetId, direction) => {
      const widget = widgets.find((w) => w._id === widgetId);
      if (!widget) return;

      const zIndexes = widgets.map((w) => w.zIndex);
      const maxZ = Math.max(...zIndexes, 0);
      const minZ = Math.min(...zIndexes, 0);

      let newZIndex = widget.zIndex;
      switch (direction) {
        case "front":
          newZIndex = maxZ + 1;
          break;
        case "back":
          newZIndex = minZ - 1;
          break;
        case "forward":
          newZIndex = widget.zIndex + 1;
          break;
        case "backward":
          newZIndex = widget.zIndex - 1;
          break;
      }

      onUpdateWidget?.(widgetId, { zIndex: newZIndex });
    },
    [widgets, onUpdateWidget],
  );

  const handleConnectionDelete = useCallback(
    (connectionId) => {
      onDeleteConnection?.(connectionId);
    },
    [onDeleteConnection],
  );

  // Keep handlers ref in sync
  handlersRef.current = {
    onUpdate: handleWidgetUpdate,
    onDelete: handleWidgetDelete,
    onLayerChange: handleLayerChange,
  };

  // ── LOCAL state for React Flow nodes/edges ──────
  // This prevents the feedback loop: we manage internal state and only
  // sync TO the API on explicit user actions (drag stop, resize stop).
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  // Track which widget IDs we know about to detect additions/removals
  const prevWidgetIdsRef = useRef(new Set());

  // ── Sync widgets → nodes (only on external changes) ──
  useEffect(() => {
    const currentIds = new Set(widgets.map((w) => w._id));
    const prevIds = prevWidgetIdsRef.current;

    // Full rebuild on first load or when widgets are added/removed
    const added = widgets.filter((w) => !prevIds.has(w._id));
    const removed = [...prevIds].filter((id) => !currentIds.has(id));

    if (prevIds.size === 0 || added.length > 0 || removed.length > 0) {
      // Rebuild: keep existing node positions for unchanged widgets,
      // add new ones from API data
      setNodes((prevNodes) => {
        const nodeMap = new Map(prevNodes.map((n) => [n.id, n]));
        return widgets.map((w) => {
          const existing = nodeMap.get(w._id);
          if (existing) {
            return {
              ...existing,
              // Update position from widget data (for socket-driven moves)
              position: { x: w.x, y: w.y },
              data: {
                type: w.type,
                isLocked: w.isLocked,
                isCollapsed: w.isCollapsed,
                widgetData: w.data || {},
                onUpdate: isReadOnly ? undefined : handlersRef.current.onUpdate,
                onDelete: isReadOnly ? undefined : handlersRef.current.onDelete,
                onLayerChange: isReadOnly
                  ? undefined
                  : handlersRef.current.onLayerChange,
              },
              style: {
                width: w.width,
                height: w.isCollapsed ? "auto" : w.height,
                zIndex: w.zIndex,
              },
              draggable: !w.isLocked && !isReadOnly,
              connectable: !isReadOnly,
            };
          }
          // New node
          return widgetToNode(w, handlersRef.current, isReadOnly);
        });
      });
    } else {
      // Only data/property changes (no add/remove) — update in place
      setNodes((prevNodes) => {
        const widgetMap = new Map(widgets.map((w) => [w._id, w]));
        return prevNodes.map((node) => {
          const w = widgetMap.get(node.id);
          if (!w) return node;
          return {
            ...node,
            // Update position from widget data (for socket-driven moves)
            position: { x: w.x, y: w.y },
            data: {
              type: w.type,
              isLocked: w.isLocked,
              isCollapsed: w.isCollapsed,
              widgetData: w.data || {},
              onUpdate: isReadOnly ? undefined : handlersRef.current.onUpdate,
              onDelete: isReadOnly ? undefined : handlersRef.current.onDelete,
              onLayerChange: isReadOnly
                ? undefined
                : handlersRef.current.onLayerChange,
            },
            style: {
              width: w.width,
              height: w.isCollapsed ? "auto" : w.height,
              zIndex: w.zIndex,
            },
            draggable: !w.isLocked && !isReadOnly,
            connectable: !isReadOnly,
          };
        });
      });
    }

    prevWidgetIdsRef.current = currentIds;
  }, [widgets, isReadOnly]);

  // ── Sync connections → edges ────────────────────
  useEffect(() => {
    setEdges(
      connections.map((c) =>
        connectionToEdge(c, handlersRef.current.onDelete, isReadOnly),
      ),
    );
  }, [connections, isReadOnly]);

  // Also keep edge delete handler fresh
  useEffect(() => {
    setEdges((prev) =>
      prev.map((e) => ({
        ...e,
        data: {
          ...e.data,
          onDelete: isReadOnly ? undefined : handleConnectionDelete,
        },
      })),
    );
  }, [handleConnectionDelete, isReadOnly]);

  // ── React Flow change handlers (local state only) ──
  const onNodesChange = useCallback((changes) => {
    // Apply ALL changes to local state so React Flow can track
    // dragging, selection, dimensions etc. internally.
    // We do NOT call the API here — that happens in onNodeDragStop.
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange = useCallback((changes) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  // ── Persist position on drag stop ───────────────
  const onNodeDragStop = useCallback(
    (_event, node) => {
      onUpdateWidget?.(node.id, {
        x: Math.round(node.position.x),
        y: Math.round(node.position.y),
      });
    },
    [onUpdateWidget],
  );

  // ── Connect ─────────────────────────────────────
  const onConnect = useCallback(
    (params) => {
      if (isReadOnly) return;

      const connectionData = {
        fromWidgetId: params.source,
        fromSide: getSideFromHandleId(params.sourceHandle),
        toWidgetId: params.target,
        toSide: getSideFromHandleId(params.targetHandle),
      };

      onAddConnection?.(connectionData);
    },
    [onAddConnection, isReadOnly],
  );

  // ── Reconnect ───────────────────────────────────
  const onReconnect = useCallback(
    (oldEdge, newConnection) => {
      if (isReadOnly) return;

      const updates = {
        fromWidgetId: newConnection.source,
        fromSide: getSideFromHandleId(newConnection.sourceHandle),
        toWidgetId: newConnection.target,
        toSide: getSideFromHandleId(newConnection.targetHandle),
      };

      onUpdateConnection?.(oldEdge.id, updates);
    },
    [onUpdateConnection, isReadOnly],
  );

  // ── Keyboard Delete ─────────────────────────────
  const onEdgesDelete = useCallback(
    (deletedEdges) => {
      if (isReadOnly) return;
      deletedEdges.forEach((edge) => {
        onDeleteConnection?.(edge.id);
      });
    },
    [onDeleteConnection, isReadOnly],
  );

  const onNodesDelete = useCallback(
    (deletedNodes) => {
      if (isReadOnly) return;
      deletedNodes.forEach((node) => {
        onDeleteWidget?.(node.id);
      });
    },
    [onDeleteWidget, isReadOnly],
  );

  // ── Add widget from toolbar ─────────────────────
  const handleAddWidget = useCallback(
    (type) => {
      const zoom = getZoom();
      const centerX = (-viewport.x + 400) / zoom;
      const centerY = (-viewport.y + 300) / zoom;

      onAddWidget?.({
        type,
        x: Math.round(centerX + Math.random() * 100 - 50),
        y: Math.round(centerY + Math.random() * 100 - 50),
        width: type === "image" ? 350 : 300,
        height: type === "image" ? 250 : 200,
      });
    },
    [onAddWidget, viewport],
  );

  // ── Node & Edge types ───────────────────────────
  const nodeTypes = useMemo(() => ({ widget: WidgetNode }), []);
  const edgeTypes = useMemo(() => ({ connection: ConnectionEdge }), []);

  return (
    <div className="w-full h-full relative">
      <CanvasToolbar
        onAddWidget={handleAddWidget}
        onZoomIn={() => zoomIn()}
        onZoomOut={() => zoomOut()}
        onFitView={() => fitView({ padding: 0.2 })}
        onToggleMinimap={() => setShowMinimap((v) => !v)}
        showMinimap={showMinimap}
        onExport={() => toast.info("Export akan diimplementasikan segera")}
        zoom={viewport.zoom}
      />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onReconnect={onReconnect}
        onEdgesDelete={onEdgesDelete}
        onNodesDelete={onNodesDelete}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={4}
        defaultEdgeOptions={{
          type: "connection",
        }}
        connectionMode="loose"
        connectionLineStyle={{
          stroke: "#3b82f6",
          strokeWidth: 3,
        }}
        isValidConnection={(connection) =>
          connection.source !== connection.target
        }
        snapToGrid
        snapGrid={[10, 10]}
        deleteKeyCode={isReadOnly ? null : "Delete"}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="hsl(var(--muted-foreground) / 0.15)"
        />
        {showMinimap && (
          <MiniMap
            nodeColor="hsl(var(--primary) / 0.3)"
            maskColor="hsl(var(--background) / 0.8)"
            className="!bg-background/80 !border !border-border !rounded-lg !shadow-lg"
            pannable
            zoomable
          />
        )}
      </ReactFlow>
    </div>
  );
}

// ── Exported wrapper with Provider ────────────────
export function BoardCanvas(props) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
