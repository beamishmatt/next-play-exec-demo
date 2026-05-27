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
    const raw = await res.json() as ContextGraph;
    const normalized: ContextGraph = { ...raw, entities: raw.entities ?? {} };
    const { graph: pruned, changed } = pruneStaleReferences(normalized);
    _graph = pruned;
    // Persist back any stale references we cleaned up so the file no longer
    // resurrects them on subsequent loads.
    if (changed) {
      fetch('/api/graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pruned, null, 2),
      }).catch(() => { /* non-fatal */ });
    }
  } catch {
    _graph = emptyGraph();
  }
}

// Removes references to deleted evidence that may have been left behind in
// entity.evidence_ids, case.evidence_ids, or edges — and drops entities and
// cases that no longer reference any remaining node.
function pruneStaleReferences(graph: ContextGraph): { graph: ContextGraph; changed: boolean } {
  const nodeIds = new Set(Object.keys(graph.nodes));
  let changed = false;

  // Prune entity.evidence_ids; drop entities with no remaining references.
  const entities: Record<string, EntityNodeShape> = {};
  for (const [id, ent] of Object.entries(graph.entities ?? {})) {
    const filtered = ent.evidence_ids.filter(evId => nodeIds.has(evId));
    if (filtered.length === 0) {
      changed = true;
      continue;
    }
    if (filtered.length !== ent.evidence_ids.length) {
      changed = true;
      entities[id] = { ...ent, evidence_ids: filtered };
    } else {
      entities[id] = ent;
    }
  }

  // Prune case.evidence_ids; drop cases with no remaining evidence.
  const cases: ContextGraph['cases'] = {};
  for (const [caseId, meta] of Object.entries(graph.cases)) {
    const filtered = meta.evidence_ids.filter(evId => nodeIds.has(evId));
    if (filtered.length === 0) {
      changed = true;
      continue;
    }
    if (filtered.length !== meta.evidence_ids.length) {
      changed = true;
      cases[caseId] = { ...meta, evidence_ids: filtered };
    } else {
      cases[caseId] = meta;
    }
  }

  // Drop edges that reference any node/entity that no longer exists.
  const validIds = new Set([...nodeIds, ...Object.keys(entities)]);
  const edges = graph.edges.filter(e => validIds.has(e.source) && validIds.has(e.target));
  if (edges.length !== graph.edges.length) changed = true;

  return {
    graph: { ...graph, edges, cases, entities },
    changed,
  };
}

// Local alias so the prune helper doesn't depend on the full EntityNode import.
type EntityNodeShape = ContextGraph['entities'] extends Record<string, infer T> ? T : never;

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
    entities: {},
    metadata: { total_items: 0, last_updated: new Date().toISOString(), media_breakdown: {} },
  };
}
