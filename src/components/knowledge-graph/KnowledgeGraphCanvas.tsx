import React, { useEffect, useMemo, useRef } from 'react';
import { Graph, ExtensionCategory, Line, Circle as G6CircleNode, register, type GraphData, type NodeData, type EdgeData } from '@antv/g6';
import { Circle as GCircle } from '@antv/g';
import { EntityKind, EntityNode, GraphEdge, GraphNode, MediaClass } from '../../data/types';

// Custom edge that adds a small marker continuously traveling source → target
// along the line, giving the graph a sense of live flow. Built by subclassing
// Line and upserting an extra Circle child whose offsetPath is the edge's
// key path, then animating offsetDistance 0 → 1 forever.
class FlyMarkerLine extends Line {
  render(attributes: any, container: any = this) {
    // Draw the line first so `this.shapeMap.key` exists.
    super.render(attributes, container);
    const keyPath = (this as any).shapeMap?.key;
    if (!keyPath) return;
    const stroke = (attributes?.stroke as string) || '#0f172a';
    const marker = (this as any).upsert(
      'fly-marker',
      GCircle,
      {
        cx: 0,
        cy: 0,
        r: 2.4,
        fill: stroke,
        opacity: 0.95,
        offsetPath: keyPath,
        offsetDistance: 0,
        pointerEvents: 'none',
      },
      container,
    );
    if (marker && !(marker as any).__flyMarkerAnimating) {
      (marker as any).__flyMarkerAnimating = true;
      try {
        (marker as any).animate(
          [{ offsetDistance: 0 }, { offsetDistance: 1 }],
          { duration: 2400, iterations: Infinity, easing: 'linear' },
        );
      } catch { /* offsetPath unavailable mid-resize; will retry next render */ }
    }
  }
}

register(ExtensionCategory.EDGE, 'fly-marker-line', FlyMarkerLine);

// Custom node that draws a ripple ring continuously emanating outward from the
// node center. Used for the primary case hub to draw the eye to it. The ring
// is a hollow stroke that grows and fades — so it doesn't occlude the node
// itself even when the animation reaches large radii.
class PulseCircle extends G6CircleNode {
  render(attributes: any, container: any = this) {
    super.render(attributes, container);
    const sizeAttr = (attributes?.size as number | number[]) ?? 18;
    const baseR = (Array.isArray(sizeAttr) ? Math.min(...sizeAttr) : sizeAttr) / 2;
    const color = (attributes?.fill as string) || PRIMARY_CASE_COLOR;
    const ring = (this as any).upsert(
      'pulse-ring',
      GCircle,
      {
        cx: 0,
        cy: 0,
        r: baseR,
        fill: 'transparent',
        stroke: color,
        lineWidth: 2,
        opacity: 0.7,
        pointerEvents: 'none',
      },
      container,
    );
    if (!ring) return;
    try { (ring as any).toBack(); } catch { /* parent not yet in scene */ }
    if (!(ring as any).__pulseAnimating) {
      (ring as any).__pulseAnimating = true;
      try {
        (ring as any).animate(
          [
            { r: baseR,       opacity: 0.7, lineWidth: 2 },
            { r: baseR * 2.6, opacity: 0,   lineWidth: 0.4 },
          ],
          { duration: 1600, iterations: Infinity, easing: 'ease-out' },
        );
      } catch { /* shape detached mid-render */ }
    }
  }
}

register(ExtensionCategory.NODE, 'pulse-circle', PulseCircle);

// Monochromatic slate palette — single hue, lightness-only variation so node
// types stay distinguishable without competing with the rest of the UI.
export const MEDIA_CLASS_COLORS: Record<MediaClass, string> = {
  pdf:      '#475569',
  image:    '#64748b',
  video:    '#334155',
  audio:    '#94a3b8',
  document: '#1e293b',
  text:     '#cbd5e1',
};

export const RELATIONSHIP_COLORS: Record<GraphEdge['relationship'], string> = {
  same_case:     '#9ca3af',
  same_officer:  '#3b82f6',
  same_date:     '#10b981',
  referenced_in: '#9ca3af',
};

export const ENTITY_KIND_COLORS: Record<EntityKind, string> = {
  officer:    '#334155',
  object:     '#56DB18',
  location:   '#852EE9',
  identifier: '#94a3b8',
  person:     '#E5484D',
};

// Lucide icon path bodies (24x24 viewBox, stroke-only). Inlined rather than
// imported from lucide-react/dist so we don't depend on the package's
// internal file layout — the SVG path data itself is the contract.
const LUCIDE_VIDEO     = '<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>';
const LUCIDE_IMAGE     = '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>';
const LUCIDE_MUSIC     = '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>';
const LUCIDE_FILE_TEXT = '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>';

function lucideDataUri(body: string, stroke = '#ffffff'): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" ` +
    `stroke="${stroke}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">` +
    body + `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const MEDIA_CLASS_ICON_SRC: Record<MediaClass, string> = {
  video:    lucideDataUri(LUCIDE_VIDEO),
  audio:    lucideDataUri(LUCIDE_MUSIC),
  image:    lucideDataUri(LUCIDE_IMAGE),
  pdf:      lucideDataUri(LUCIDE_FILE_TEXT),
  document: lucideDataUri(LUCIDE_FILE_TEXT),
  text:     lucideDataUri(LUCIDE_FILE_TEXT),
};

const CASE_SPOKE_COLOR = '#38bdf8';

function colorForCase(_caseId: string): string {
  return PRIMARY_CASE_COLOR;
}

const ENTITY_SHAPE: Record<EntityKind, string> = {
  officer:    'circle',
  object:     'circle',
  location:   'circle',
  identifier: 'circle',
  person:     'circle',
};

type Link = {
  source: string;
  target: string;
  relationship: GraphEdge['relationship'] | 'case_member';
};

export type CaseHub = {
  id: string;
  kind: 'case_hub';
  title: string;
  case_id: string;
  evidence_count: number;
  primary?: boolean;
};

export const PRIMARY_CASE_COLOR = '#6b7280';
export const EVIDENCE_COLOR = '#0088E9';

type CanvasNode = GraphNode | CaseHub | EntityNode;

function isCaseHub(n: CanvasNode): n is CaseHub {
  return (n as CaseHub).kind === 'case_hub';
}
function isEntity(n: CanvasNode): n is EntityNode {
  const k = (n as EntityNode).kind;
  return k === 'officer' || k === 'object' || k === 'location' || k === 'identifier' || k === 'person';
}

export type NodeScreenPosition = { x: number; y: number; radius: number };

type Props = {
  nodes: CanvasNode[];
  links: Link[];
  selectedNodeId: string | null;
  neighborIds: Set<string>;
  matchedIds: Set<string> | null;
  onNodeClick: (node: GraphNode | EntityNode | CaseHub) => void;
  onBackgroundClick: () => void;
  onSelectedNodePosition?: (pos: NodeScreenPosition | null) => void;
  fitViewSignal?: number;
};

export function KnowledgeGraphCanvas({
  nodes,
  links,
  selectedNodeId,
  neighborIds,
  matchedIds,
  onNodeClick,
  onBackgroundClick,
  onSelectedNodePosition,
  fitViewSignal,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const handlersRef = useRef({ onNodeClick, onBackgroundClick });
  handlersRef.current = { onNodeClick, onBackgroundClick };
  const nodeIndexRef = useRef(new Map<string, CanvasNode>());
  nodeIndexRef.current = new Map(nodes.map(n => [n.id, n]));

  const data: GraphData = useMemo(() => buildGraphData(nodes, links), [nodes, links]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const graph = new Graph({
      container: el,
      autoFit: 'view',
      background: 'transparent',
      node: {
        type: (d) => (d.data?.shape as string) ?? 'circle',
        style: {
          size: (d) => (d.data?.size as number) ?? 12,
          fill: (d) => (d.data?.color as string) ?? '#888',
          opacity: 1,
          labelOpacity: 1,
          stroke: '#ffffff',
          lineWidth: 1.6,
          shadowColor: 'rgba(15, 23, 42, 0.18)',
          shadowBlur: 4,
          shadowOffsetX: 0,
          shadowOffsetY: 1,
          // Halo is rendered behind the node; turned on per-state below.
          halo: false,
          haloFill: (d) => (d.data?.color as string) ?? '#888',
          haloOpacity: 0.22,
          haloLineWidth: 10,
          haloStroke: (d) => (d.data?.color as string) ?? '#888',
          // Icon (centered glyph or SVG image) — supplied per node where useful.
          icon: (d) => Boolean(d.data?.iconSrc || d.data?.iconText),
          iconSrc: (d) => (d.data?.iconSrc as string | undefined),
          iconWidth: (d) => (d.data?.iconSize as number | undefined) ?? 11,
          iconHeight: (d) => (d.data?.iconSize as number | undefined) ?? 11,
          iconText: (d) => (d.data?.iconText as string) ?? '',
          iconFill: '#ffffff',
          iconFontSize: (d) => (d.data?.iconFontSize as number) ?? 10,
          iconFontWeight: 700,
          labelText: (d) => (d.data?.label as string) ?? '',
          labelFill: (d) => (d.data?.labelFill as string) ?? '#1f2937',
          labelFontSize: 9,
          labelFontWeight: (d) => ((d.data?.kind as string) === 'case_hub' ? 600 : 500),
          labelPlacement: 'bottom',
          // Truncate long labels with an ellipsis instead of overflowing.
          labelWordWrap: true,
          labelWordWrapWidth: 90,
          labelMaxLines: 1,
          labelTextOverflow: 'ellipsis',
          labelBackground: true,
          labelBackgroundFill: 'rgba(255, 255, 255, 0.9)',
          labelBackgroundRadius: 4,
          labelBackgroundLineWidth: 1,
          labelBackgroundStroke: 'rgba(15, 23, 42, 0.08)',
          labelPadding: [2, 6],
          cursor: 'pointer',
        },
        state: {
          selected: {
            halo: true,
            haloOpacity: 0.35,
            haloLineWidth: 14,
            lineWidth: 2.4,
            stroke: '#0f172a',
            labelFontWeight: 700,
          },
          active: {
            halo: true,
            haloOpacity: 0.22,
            haloLineWidth: 10,
          },
          neighbor: {
            lineWidth: 2,
            stroke: '#0f172a',
          },
          inactive: {
            opacity: 0.16,
            labelOpacity: 0.16,
            shadowBlur: 0,
          },
        },
      },
      edge: {
        type: 'fly-marker-line',
        style: {
          stroke: (d) => (d.data?.color as string) ?? '#cbd5e1',
          lineWidth: 1,
          opacity: 0.7,
          endArrow: false,
          lineDash: (d) =>
            (d.data?.relationship as string) === 'referenced_in' ? [4, 4] : [],
        },
        state: {
          active: {
            stroke: '#0f172a',
            lineWidth: 1.8,
            opacity: 1,
            lineDash: [],
          },
          inactive: {
            opacity: 0.06,
          },
        },
      },
      layout: {
        type: 'd3-force',
        preventOverlap: true,
        collide: { radius: 28, strength: 1 },
        link: { distance: 90, strength: 0.7 },
        manyBody: { strength: -220 },
        center: { x: 0, y: 0, strength: 0.05 },
      },
      behaviors: [
        'drag-canvas',
        'zoom-canvas',
        'drag-element',
      ],
      animation: false,
    });

    graphRef.current = graph;
    graph.setData(data);
    graph.render().then(async () => {
      await graph.fitView({ padding: 32 });
    });

    graph.on('node:click', (evt: { target: { id: string } }) => {
      const id = evt.target.id;
      const n = nodeIndexRef.current.get(id);
      if (!n) return;
      handlersRef.current.onNodeClick(n);
    });
    graph.on('canvas:click', () => {
      handlersRef.current.onBackgroundClick();
    });

    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      graph.setSize(r.width, r.height);
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      graph.destroy();
      graphRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    graph.setData(data);
    graph.render();
  }, [data]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    const hasSelection = selectedNodeId !== null;
    const state: Record<string, string[]> = {};

    for (const n of nodes) {
      const s: string[] = [];
      if (hasSelection) {
        if (n.id === selectedNodeId) s.push('selected');
        else if (neighborIds.has(n.id)) s.push('neighbor');
        else s.push('inactive');
      } else if (matchedIds) {
        if (!matchedIds.has(n.id)) s.push('inactive');
      }
      state[n.id] = s;
    }
    for (const link of links) {
      const id = edgeId(link);
      const s: string[] = [];
      if (hasSelection) {
        const touches = link.source === selectedNodeId || link.target === selectedNodeId;
        s.push(touches ? 'active' : 'inactive');
      } else if (matchedIds) {
        const both = matchedIds.has(link.source) && matchedIds.has(link.target);
        if (!both) s.push('inactive');
      }
      state[id] = s;
    }

    graph.setElementState(state, false);
  }, [nodes, links, selectedNodeId, neighborIds, matchedIds]);

  // Pan + zoom to fit the matched-search subset. When matches clear (null),
  // re-fit the whole graph so the user isn't stranded zoomed-in on nothing.
  // Skipped while a node is selected — selection has its own viewport behavior.
  // Also skipped on the same render where the reset button fires, so the reset
  // effect's fit-all isn't immediately overridden by a search-driven refocus.
  const lastFocusSeenSignal = useRef<number | undefined>(undefined);
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    if (selectedNodeId) return;
    if (fitViewSignal !== lastFocusSeenSignal.current) {
      lastFocusSeenSignal.current = fitViewSignal;
      // Reset bumped this render — let the reset effect own the camera.
      return;
    }
    if (matchedIds === null) {
      graph.fitView({ padding: 32 }, { duration: 300, easing: 'ease-out' });
      return;
    }
    const ids = [...matchedIds].filter(id => nodeIndexRef.current.has(id));
    if (ids.length === 0) return;
    focusOnIds(graph, ids);
  }, [matchedIds, selectedNodeId, fitViewSignal]);

  // Reset signal: any value > 0 means the user clicked the Reset button.
  // Returns the graph to its on-page-load state by re-setting the full data
  // (which wipes any G6 state — selected/active/inactive — from every element),
  // re-running the layout so dragged nodes snap back, then re-fitting the view.
  useEffect(() => {
    if (!fitViewSignal) return;
    const graph = graphRef.current;
    if (!graph) return;
    (async () => {
      try {
        graph.setData(data);
        await graph.render();
        await graph.layout();
        await graph.fitView({ padding: 32 }, { duration: 300, easing: 'ease-out' });
      } catch { /* graph destroyed mid-reset */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitViewSignal]);

  // Push the selected node's screen-space position up to the parent on every
  // animation frame so the floating info card can sit next to the node and
  // track it through layout, drag, zoom, and pan. Stops on deselection.
  const positionCallbackRef = useRef(onSelectedNodePosition);
  positionCallbackRef.current = onSelectedNodePosition;
  useEffect(() => {
    if (!selectedNodeId) {
      positionCallbackRef.current?.(null);
      return;
    }
    let raf = 0;
    let lastX = NaN;
    let lastY = NaN;
    const tick = () => {
      const graph = graphRef.current;
      if (graph) {
        try {
          const canvasPos = graph.getElementPosition(selectedNodeId);
          if (Array.isArray(canvasPos)) {
            const vp = graph.getViewportByCanvas([canvasPos[0], canvasPos[1]]);
            const zoom = graph.getZoom();
            const radius = (UNIFORM_NODE_SIZE / 2) * zoom;
            if (vp[0] !== lastX || vp[1] !== lastY) {
              lastX = vp[0];
              lastY = vp[1];
              positionCallbackRef.current?.({ x: vp[0], y: vp[1], radius });
            }
          }
        } catch { /* node not yet laid out */ }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      positionCallbackRef.current?.(null);
    };
  }, [selectedNodeId]);

  return (
    <div
      ref={wrapperRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundImage:
          'radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.08) 1px, transparent 0)',
        backgroundSize: '20px 20px',
      }}
    />
  );
}

const UNIFORM_NODE_SIZE = 18;

function buildGraphData(nodes: CanvasNode[], links: Link[]): GraphData {
  const g6Nodes: NodeData[] = nodes.map(n => {
    if (isCaseHub(n)) {
      return {
        id: n.id,
        data: {
          kind: 'case_hub',
          shape: 'pulse-circle',
          color: PRIMARY_CASE_COLOR,
          size: UNIFORM_NODE_SIZE,
          label: n.title,
          labelFill: '#0f172a',
        },
      };
    }
    if (isEntity(n)) {
      const color = ENTITY_KIND_COLORS[n.kind];
      return {
        id: n.id,
        data: {
          kind: n.kind,
          shape: ENTITY_SHAPE[n.kind],
          color,
          size: UNIFORM_NODE_SIZE,
          label: n.label,
          labelFill: '#334155',
        },
      };
    }
    return {
      id: n.id,
      data: {
        kind: 'evidence',
        shape: 'circle',
        color: EVIDENCE_COLOR,
        size: UNIFORM_NODE_SIZE,
        label: n.title,
        labelFill: '#1f2937',
        iconSrc: MEDIA_CLASS_ICON_SRC[n.media_class],
      },
    };
  });

  const g6Edges: EdgeData[] = links.map(l => ({
    id: edgeId(l),
    source: l.source,
    target: l.target,
    data: {
      relationship: l.relationship,
      color: l.relationship === 'case_member'
        ? CASE_SPOKE_COLOR
        : RELATIONSHIP_COLORS[l.relationship as GraphEdge['relationship']] ?? '#cbd5e1',
    },
  }));

  return { nodes: g6Nodes, edges: g6Edges };
}

function edgeId(l: Link): string {
  return `${l.source}__${l.relationship}__${l.target}`;
}


function focusOnIds(graph: Graph, ids: string[], padding = 80): void {
  // 1. Compute the bbox of matched nodes in graph-space to pick a target zoom.
  // 2. Zoom to that level, then let G6's built-in focusElement handle the
  //    viewport translation — it already does the graph↔viewport coord math.
  const points = ids
    .map(id => {
      try { return graph.getElementPosition(id); }
      catch { return null; }
    })
    .filter((p): p is number[] => Array.isArray(p));
  if (points.length === 0) return;
  const xs = points.map(p => p[0]);
  const ys = points.map(p => p[1]);
  const w = Math.max(Math.max(...xs) - Math.min(...xs), 100);
  const h = Math.max(Math.max(...ys) - Math.min(...ys), 100);
  const [vw, vh] = graph.getSize();
  const sx = (vw - padding * 2) / w;
  const sy = (vh - padding * 2) / h;
  const zoom = Math.min(sx, sy, 1.6);
  const animation = { duration: 300, easing: 'ease-out' } as const;
  (async () => {
    try {
      await graph.zoomTo(zoom, animation);
      await graph.focusElement(ids, animation);
    } catch { /* graph destroyed mid-animation */ }
  })();
}
