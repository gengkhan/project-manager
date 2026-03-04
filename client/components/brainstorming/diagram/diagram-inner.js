"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Background,
  BackgroundVariant,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { DiagramNode, DEFAULT_NODE_STYLES } from "./diagram-node";
import { DiagramEdge } from "./diagram-edge";
import { DiagramToolbar } from "./diagram-toolbar";
import { DiagramPalette } from "./diagram-palette";
import { getLayoutedElements } from "@/lib/diagram-layout";
import { v4 as uuidv4 } from "uuid";

const nodeTypes = {
  diagramNode: DiagramNode,
};

const edgeTypes = {
  diagramEdge: DiagramEdge,
};

function generateId() {
  return uuidv4().substring(0, 8);
}

export function DiagramInner({
  widgetId,
  initialData,
  onUpdateWidget,
  isFullscreen = false,
  onToggleFullscreen,
  isPreview = false,
}) {
  const { fitView, screenToFlowPosition } = useReactFlow();

  // ── Parse initial data ─────────────────────────────
  const initialNodes = useMemo(() => {
    if (!initialData?.nodes || initialData.nodes.length === 0) {
      return [];
    }
    return initialData.nodes.map((n) => ({
      id: n._id,
      type: "diagramNode",
      position: { x: n.x, y: n.y },
      data: {
        text: n.text,
        shape: n.shape || "rectangle",
        size: n.size || "medium",
        color: n.color || "#ffffff",
        borderStyle: n.borderStyle || "solid",
        icon: n.icon || null,
        isPreview,
      },
    }));
  }, [initialData?.nodes, isPreview]);

  const initialEdges = useMemo(() => {
    // Handle new "edges" format
    if (initialData?.edges) {
      return initialData.edges.map((e) => ({
        id: e._id,
        source: e.source,
        target: e.target,
        type: "diagramEdge",
        data: {
          label: e.label || "",
          lineStyle: e.lineStyle || "solid",
          color: e.color || "#64748b",
          arrowType: e.arrowType || "one-way",
          isPreview,
        },
      }));
    }

    // Backward compat: handle old mind-map format
    const edges = [];

    // Convert old parent-child relationships to edges
    if (initialData?.nodes) {
      initialData.nodes.forEach((n) => {
        if (n.parentId) {
          edges.push({
            id: `e-${n.parentId}-${n._id}`,
            source: n.parentId,
            target: n._id,
            type: "diagramEdge",
            data: {
              label: "",
              lineStyle: "solid",
              color: "#64748b",
              arrowType: "one-way",
              isPreview,
            },
          });
        }
      });
    }

    // Convert old crossLinks to edges
    if (initialData?.crossLinks) {
      initialData.crossLinks.forEach((c) => {
        edges.push({
          id: c._id,
          source: c.fromNodeId,
          target: c.toNodeId,
          type: "diagramEdge",
          data: {
            label: c.label || "",
            lineStyle: "dashed",
            color: "#f59e0b",
            arrowType: "none",
            isPreview,
          },
        });
      });
    }

    return edges;
  }, [initialData, isPreview]);

  const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);
  const [menu, setMenu] = useState(null);
  const [edgeMenu, setEdgeMenu] = useState(null);

  // ── Debounced API sync ─────────────────────────────
  const saveTimeoutRef = useRef(null);

  const syncToApi = useCallback(
    (currentNodes, currentEdges) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        const apiNodes = currentNodes.map((n) => ({
          _id: n.id,
          text: n.data.text,
          x: Math.round(n.position.x),
          y: Math.round(n.position.y),
          shape: n.data.shape,
          size: n.data.size,
          color: n.data.color,
          borderStyle: n.data.borderStyle,
          icon: n.data.icon,
        }));

        const apiEdges = currentEdges.map((e) => ({
          _id: e.id,
          source: e.source,
          target: e.target,
          label: e.data?.label || "",
          lineStyle: e.data?.lineStyle || "solid",
          color: e.data?.color || "#64748b",
          arrowType: e.data?.arrowType || "one-way",
        }));

        onUpdateWidget(widgetId, {
          data: {
            title: initialData?.title || "Diagram",
            nodes: apiNodes,
            edges: apiEdges,
          },
        });
      }, 500);
    },
    [widgetId, initialData?.title, onUpdateWidget],
  );

  // ── Edge label change handler ─────────────────────
  const handleEdgeLabelChange = useCallback(
    (edgeId, newLabel) => {
      setEdges((eds) => {
        const result = eds.map((e) =>
          e.id === edgeId ? { ...e, data: { ...e.data, label: newLabel } } : e,
        );
        if (!isPreview) syncToApi(nodes, result);
        return result;
      });
    },
    [setEdges, nodes, syncToApi, isPreview],
  );

  // Inject the label change handler into edge data
  const edgesWithHandler = useMemo(
    () =>
      edges.map((e) => ({
        ...e,
        data: {
          ...e.data,
          onLabelChange: handleEdgeLabelChange,
        },
      })),
    [edges, handleEdgeLabelChange],
  );

  // ── Node/Edge change handlers ─────────────────────
  const onNodesChange = useCallback(
    (changes) => {
      setNodes((nds) => {
        const result = applyNodeChanges(changes, nds);
        const isSignificantChange = changes.some(
          (c) => c.type === "position" || c.type === "remove",
        );
        if (isSignificantChange && !isPreview) syncToApi(result, edges);
        return result;
      });
    },
    [setNodes, edges, syncToApi, isPreview],
  );

  const onEdgesChange = useCallback(
    (changes) => {
      setEdges((eds) => {
        const result = applyEdgeChanges(changes, eds);
        const isSignificantChange = changes.some(
          (c) => c.type === "remove" || c.type === "add",
        );
        if (isSignificantChange && !isPreview) syncToApi(nodes, result);
        return result;
      });
    },
    [setEdges, nodes, syncToApi, isPreview],
  );

  const onConnect = useCallback(
    (connection) => {
      setEdges((eds) => {
        const newEdge = {
          ...connection,
          id: `e-${generateId()}`,
          type: "diagramEdge",
          data: {
            label: "",
            lineStyle: "solid",
            color: "#64748b",
            arrowType: "one-way",
          },
        };
        const result = addEdge(newEdge, eds);
        if (!isPreview) syncToApi(nodes, result);
        return result;
      });
    },
    [setEdges, nodes, syncToApi, isPreview],
  );

  // ── Event handlers ────────────────────────────────
  const stopPropagation = (e) => e.stopPropagation();

  const handleAutoArrange = useCallback(() => {
    setMenu(null);
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges,
      "TB",
    );
    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
    syncToApi(layoutedNodes, layoutedEdges);

    setTimeout(() => fitView({ padding: 0.2 }), 50);
  }, [nodes, edges, setNodes, setEdges, fitView, syncToApi]);

  const onExport = useCallback(() => {
    toast.success("Feature Export will be available soon.");
  }, []);

  const handleAddNode = useCallback(
    (shapeType) => {
      const centerPos = screenToFlowPosition({
        x: typeof window !== "undefined" ? window.innerWidth / 2 : 500,
        y: typeof window !== "undefined" ? window.innerHeight / 2 : 500,
      });

      const newNodeId = generateId();

      let newShape = shapeType;
      let newText = "New Node";
      let newBorderStyle = "solid";
      let newColor = "#ffffff";

      if (shapeType === "text") {
        newShape = "rectangle";
        newBorderStyle = "none";
        newText = "Text Label";
      } else if (shapeType === "sticky-note") {
        newColor = "#fef08a";
        newText = "Note";
      }

      const newNode = {
        id: newNodeId,
        type: "diagramNode",
        position: centerPos,
        data: {
          ...DEFAULT_NODE_STYLES,
          text: newText,
          shape: newShape,
          borderStyle: newBorderStyle,
          color: newColor,
        },
        selected: true,
      };

      const newNodes = nodes
        .map((n) => ({ ...n, selected: false }))
        .concat(newNode);
      setNodes(newNodes);
      syncToApi(newNodes, edges);
    },
    [nodes, edges, setNodes, syncToApi, screenToFlowPosition],
  );

  const onPaneClick = useCallback(() => {
    setMenu(null);
    setEdgeMenu(null);
  }, []);

  const onPaneDoubleClick = useCallback(
    (event) => {
      // Double-click on canvas → create a new rectangle node at click position
      if (isPreview) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNodeId = generateId();
      const newNode = {
        id: newNodeId,
        type: "diagramNode",
        position,
        data: {
          ...DEFAULT_NODE_STYLES,
          text: "New Node",
        },
        selected: true,
      };

      const newNodes = nodes
        .map((n) => ({ ...n, selected: false }))
        .concat(newNode);
      setNodes(newNodes);
      syncToApi(newNodes, edges);
    },
    [nodes, edges, setNodes, syncToApi, screenToFlowPosition, isPreview],
  );

  const onNodeContextMenu = useCallback(
    (event, node) => {
      event.preventDefault();
      setMenu({
        id: node.id,
        top: event.clientY,
        left: event.clientX,
      });
    },
    [setMenu],
  );

  const onPaneContextMenu = useCallback(
    (event) => {
      event.preventDefault();
      setMenu(null);
      setEdgeMenu(null);
    },
    [setMenu],
  );

  const onEdgeContextMenu = useCallback((event, edge) => {
    event.preventDefault();
    setMenu(null);
    setEdgeMenu({
      id: edge.id,
      top: event.clientY,
      left: event.clientX,
      data: edge.data || {},
    });
  }, []);

  const updateEdgeStyle = useCallback(
    (edgeId, updates) => {
      const newEdges = edges.map((e) =>
        e.id === edgeId ? { ...e, data: { ...e.data, ...updates } } : e,
      );
      setEdges(newEdges);
      syncToApi(nodes, newEdges);
      setEdgeMenu(null);
    },
    [edges, nodes, setEdges, syncToApi],
  );

  const deleteEdge = useCallback(
    (edgeId) => {
      const newEdges = edges.filter((e) => e.id !== edgeId);
      setEdges(newEdges);
      syncToApi(nodes, newEdges);
      setEdgeMenu(null);
    },
    [edges, nodes, setEdges, syncToApi],
  );

  const deleteNode = useCallback(
    (nodeId) => {
      const newNodes = nodes.filter((n) => n.id !== nodeId);
      const newEdges = edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId,
      );
      setNodes(newNodes);
      setEdges(newEdges);
      syncToApi(newNodes, newEdges);
      setMenu(null);
    },
    [nodes, edges, setNodes, setEdges, syncToApi],
  );

  const duplicateNode = useCallback(
    (nodeId) => {
      const sourceNode = nodes.find((n) => n.id === nodeId);
      if (!sourceNode) return;

      const newNodeId = generateId();
      const newNode = {
        id: newNodeId,
        type: "diagramNode",
        position: {
          x: sourceNode.position.x + 30,
          y: sourceNode.position.y + 30,
        },
        data: { ...sourceNode.data },
        selected: true,
      };

      const newNodes = nodes
        .map((n) => ({ ...n, selected: false }))
        .concat(newNode);
      setNodes(newNodes);
      syncToApi(newNodes, edges);
      setMenu(null);
      setEdgeMenu(null);
    },
    [nodes, edges, setNodes, syncToApi],
  );

  const updateNodeStyle = useCallback(
    (nodeId, updates) => {
      const newNodes = nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n,
      );
      setNodes(newNodes);
      syncToApi(newNodes, edges);
      setMenu(null);
    },
    [nodes, edges, setNodes, syncToApi],
  );

  // ── Keyboard shortcuts ─────────────────────────────
  const handleKeyDown = useCallback(
    (e) => {
      const selectedNodes = nodes.filter((n) => n.selected);
      if (selectedNodes.length === 0) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        selectedNodes.forEach((n) => deleteNode(n.id));
      }
    },
    [nodes, deleteNode],
  );

  // ── Color presets for context menu ────────────────
  const COLOR_PRESETS = [
    { color: "#ffffff", label: "White", bg: "bg-white" },
    { color: "#fef08a", label: "Yellow", bg: "bg-yellow-200" },
    { color: "#bfdbfe", label: "Blue", bg: "bg-blue-200" },
    { color: "#bbf7d0", label: "Green", bg: "bg-green-200" },
    { color: "#fecaca", label: "Red", bg: "bg-red-200" },
    { color: "#e9d5ff", label: "Purple", bg: "bg-purple-200" },
    { color: "#fed7aa", label: "Orange", bg: "bg-orange-200" },
  ];

  const SHAPE_OPTIONS = [
    { shape: "rectangle", label: "Rectangle" },
    { shape: "rounded", label: "Rounded" },
    { shape: "ellipse", label: "Ellipse" },
    { shape: "diamond", label: "Diamond" },
    { shape: "parallelogram", label: "Parallelogram" },
    { shape: "hexagon", label: "Hexagon" },
    { shape: "triangle", label: "Triangle" },
    { shape: "sticky-note", label: "Sticky Note" },
  ];

  const LINE_STYLE_OPTIONS = [
    { style: "solid", label: "Solid" },
    { style: "dashed", label: "Dashed" },
    { style: "dotted", label: "Dotted" },
  ];

  const ARROW_OPTIONS = [
    { type: "none", label: "No Arrow" },
    { type: "one-way", label: "One-way →" },
    { type: "two-way", label: "Two-way ↔" },
  ];

  const EDGE_COLOR_PRESETS = [
    { color: "#64748b", label: "Gray" },
    { color: "#3b82f6", label: "Blue" },
    { color: "#ef4444", label: "Red" },
    { color: "#22c55e", label: "Green" },
    { color: "#f59e0b", label: "Amber" },
    { color: "#8b5cf6", label: "Purple" },
    { color: "#06b6d4", label: "Cyan" },
  ];

  return (
    <div
      className="w-full h-full relative focus:outline-none"
      onWheelCapture={stopPropagation}
      onPointerDownCapture={stopPropagation}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      onClick={() => {
        setMenu(null);
        setEdgeMenu(null);
      }}
    >
      <DiagramToolbar
        onAutoArrange={handleAutoArrange}
        onExport={onExport}
        onFullscreen={onToggleFullscreen}
        isFullscreen={isFullscreen}
      />

      {!isPreview && isFullscreen && (
        <DiagramPalette onAddNode={handleAddNode} />
      )}

      {/* Context menu */}
      {menu && (
        <div
          className="fixed z-50 min-w-44 bg-popover text-popover-foreground rounded-md border shadow-md p-1 font-sans text-sm"
          style={{ top: menu.top, left: menu.left }}
        >
          <div className="px-2 py-1.5 font-medium border-b mb-1">
            Node Actions
          </div>

          {/* Color presets */}
          <div className="px-2 py-1.5 text-xs text-muted-foreground">Color</div>
          <div className="flex gap-1 px-2 pb-1.5">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.color}
                className="w-5 h-5 rounded-full border border-border hover:ring-2 hover:ring-primary/50 transition-all"
                style={{ backgroundColor: preset.color }}
                onClick={() =>
                  updateNodeStyle(menu.id, { color: preset.color })
                }
                title={preset.label}
              />
            ))}
          </div>

          <div className="h-px bg-border my-1" />

          {/* Shape options */}
          <div className="px-2 py-1.5 text-xs text-muted-foreground">Shape</div>
          {SHAPE_OPTIONS.map((opt) => (
            <button
              key={opt.shape}
              className="w-full text-left px-2 py-1 hover:bg-muted rounded-sm text-xs"
              onClick={() => updateNodeStyle(menu.id, { shape: opt.shape })}
            >
              {opt.label}
            </button>
          ))}

          <div className="h-px bg-border my-1" />

          <button
            className="w-full text-left px-2 py-1.5 hover:bg-muted rounded-sm"
            onClick={() => duplicateNode(menu.id)}
          >
            Duplicate
          </button>
          <button
            className="w-full text-left px-2 py-1.5 hover:bg-muted text-destructive rounded-sm"
            onClick={() => deleteNode(menu.id)}
          >
            Delete Node
          </button>
        </div>
      )}

      {/* Edge context menu */}
      {edgeMenu && (
        <div
          className="fixed z-50 min-w-44 bg-popover text-popover-foreground rounded-md border shadow-md p-1 font-sans text-sm"
          style={{ top: edgeMenu.top, left: edgeMenu.left }}
        >
          <div className="px-2 py-1.5 font-medium border-b mb-1">
            Edge Style
          </div>

          {/* Line style */}
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            Line Style
          </div>
          {LINE_STYLE_OPTIONS.map((opt) => (
            <button
              key={opt.style}
              className={cn(
                "w-full text-left px-2 py-1 hover:bg-muted rounded-sm text-xs",
                edgeMenu.data?.lineStyle === opt.style &&
                  "bg-muted font-medium",
              )}
              onClick={() =>
                updateEdgeStyle(edgeMenu.id, { lineStyle: opt.style })
              }
            >
              {opt.label}
            </button>
          ))}

          <div className="h-px bg-border my-1" />

          {/* Edge color */}
          <div className="px-2 py-1.5 text-xs text-muted-foreground">Color</div>
          <div className="flex gap-1 px-2 pb-1.5">
            {EDGE_COLOR_PRESETS.map((preset) => (
              <button
                key={preset.color}
                className={cn(
                  "w-5 h-5 rounded-full border border-border hover:ring-2 hover:ring-primary/50 transition-all",
                  edgeMenu.data?.color === preset.color &&
                    "ring-2 ring-primary",
                )}
                style={{ backgroundColor: preset.color }}
                onClick={() =>
                  updateEdgeStyle(edgeMenu.id, { color: preset.color })
                }
                title={preset.label}
              />
            ))}
          </div>

          <div className="h-px bg-border my-1" />

          {/* Arrow type */}
          <div className="px-2 py-1.5 text-xs text-muted-foreground">Arrow</div>
          {ARROW_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              className={cn(
                "w-full text-left px-2 py-1 hover:bg-muted rounded-sm text-xs",
                edgeMenu.data?.arrowType === opt.type && "bg-muted font-medium",
              )}
              onClick={() =>
                updateEdgeStyle(edgeMenu.id, { arrowType: opt.type })
              }
            >
              {opt.label}
            </button>
          ))}

          <div className="h-px bg-border my-1" />

          <button
            className="w-full text-left px-2 py-1.5 hover:bg-muted text-destructive rounded-sm"
            onClick={() => deleteEdge(edgeMenu.id)}
          >
            Delete Edge
          </button>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edgesWithHandler}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        onDoubleClick={onPaneDoubleClick}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: "diagramEdge" }}
        fitView
        minZoom={0.2}
        panOnScroll={true}
        zoomOnScroll={true}
        panOnDrag={true}
        connectionMode="loose"
      >
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}
