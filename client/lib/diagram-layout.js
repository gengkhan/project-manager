import dagre from "dagre";

const NODE_WIDTH = 150;
const NODE_HEIGHT = 50;

/**
 * Auto-arrange nodes using dagre graph layout.
 * Works with any graph structure (not just trees).
 *
 * @param {Array} nodes - React Flow nodes
 * @param {Array} edges - React Flow edges
 * @param {string} direction - Layout direction: "TB" (top-bottom) or "LR" (left-right)
 * @returns {{ nodes: Array, edges: Array }}
 */
export function getLayoutedElements(nodes, edges, direction = "TB") {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === "LR";
  dagreGraph.setGraph({ rankdir: direction, nodesep: 100, ranksep: 150 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: node.style?.width || NODE_WIDTH,
      height: node.style?.height || NODE_HEIGHT,
    });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: isHorizontal ? "left" : "top",
      sourcePosition: isHorizontal ? "right" : "bottom",
      position: {
        x: nodeWithPosition.x - (node.style?.width || NODE_WIDTH) / 2,
        y: nodeWithPosition.y - (node.style?.height || NODE_HEIGHT) / 2,
      },
    };
  });

  return { nodes: newNodes, edges };
}
