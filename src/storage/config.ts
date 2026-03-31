import { ContextGraph, GraphNode } from '../data/types';

let _graph: ContextGraph | null = null;

// vectorStoreId and assistantId are OpenAI infrastructure IDs — they can stay in
// localStorage since they're the same for every user on the same dev server.
const LS = {
  vectorStoreId: 'config:vectorStoreId',
  assistantId: 'config:assistantId',
} as const;

function lsGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

export function getVectorStoreId(): string | null { return lsGet(LS.vectorStoreId); }
export function setVectorStoreId(id: string): void { lsSet(LS.vectorStoreId, id); }

export function getAssistantId(): string | null { return lsGet(LS.assistantId); }
export function setAssistantId(id: string): void { lsSet(LS.assistantId, id); }

export function getContextGraph(): ContextGraph {
  return _graph ?? emptyGraph();
}

export async function loadContextGraph(): Promise<void> {
  try {
    const res = await fetch('/api/graph');
    _graph = await res.json() as ContextGraph;
  } catch {
    _graph = emptyGraph();
  }
}

export function setContextGraph(graph: ContextGraph): void {
  _graph = graph;
  window.dispatchEvent(new CustomEvent('evidenceGraphUpdated'));
  // Persist to contextGraph.json on the dev server (fire-and-forget)
  fetch('/api/graph', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(graph, null, 2),
  }).catch(() => { /* non-fatal */ });
}

export function updateGraphNode(id: string, fields: Partial<GraphNode>): void {
  const graph = getContextGraph();
  if (!graph.nodes[id]) return;
  setContextGraph({
    ...graph,
    nodes: { ...graph.nodes, [id]: { ...graph.nodes[id], ...fields } },
  });
}

export function emptyGraph(): ContextGraph {
  return {
    nodes: {},
    edges: [],
    cases: {},
    metadata: { total_items: 0, last_updated: new Date().toISOString(), media_breakdown: {} },
  };
}
