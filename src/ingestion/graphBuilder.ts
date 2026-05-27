import { ContextGraph, GraphNode, GraphEdge } from '../data/types';
import { getContextGraph, setContextGraph } from '../storage/config';
import { extractEntities } from './entityExtractor';

function generateId(): string {
  return 'EV-' + Math.random().toString(36).slice(2, 10).toUpperCase();
}

export interface NodeInput {
  title: string;
  mediaClass: GraphNode['media_class'];
  mimeType: string;
  size: number;
  caseId: string;
  officer: string;
  category: string;
  source?: string;
  duration?: string;
  description?: string;
  objects_detected?: GraphNode['objects_detected'];
  scene_type?: string;
  lighting?: string;
  people_count?: number;
  text_visible?: string;
  vector_file_id?: string;
  thumbnailUrl?: string;
  fileUrl?: string;
  video_processing?: string;
  dateRecorded?: string;
}

export async function addNodeToGraph(input: NodeInput): Promise<GraphNode> {
  const graph = getContextGraph();
  const id = generateId();
  const now = new Date().toISOString();

  const node: GraphNode = {
    id,
    title: input.title,
    media_class: input.mediaClass,
    mime_type: input.mimeType,
    size: input.size,
    case_id: input.caseId,
    date_recorded: input.dateRecorded ?? now,
    date_ingested: now,
    officer: input.officer,
    category: input.category,
    source: input.source,
    duration: input.duration ?? null,
    status: 'complete',
    description: input.description,
    objects_detected: input.objects_detected ?? [],
    scene_type: input.scene_type,
    lighting: input.lighting,
    people_count: input.people_count,
    text_visible: input.text_visible,
    vector_file_id: input.vector_file_id,
    thumbnailUrl: input.thumbnailUrl,
    fileUrl: input.fileUrl,
    video_processing: input.video_processing ?? null,
    tags: [],
  };

  graph.nodes[id] = node;
  generateEdges(graph, node);
  upsertCase(graph, node);
  await upsertEntities(graph, node);
  updateMetadata(graph);
  setContextGraph(graph);

  return node;
}

async function upsertEntities(graph: ContextGraph, node: GraphNode): Promise<void> {
  if (!graph.entities) graph.entities = {};
  for (const ent of await extractEntities(node)) {
    const existing = graph.entities[ent.id];
    if (existing) {
      if (!existing.evidence_ids.includes(node.id)) {
        existing.evidence_ids.push(node.id);
      }
    } else {
      graph.entities[ent.id] = {
        id: ent.id,
        kind: ent.kind,
        label: ent.label,
        subkind: ent.subkind,
        evidence_ids: [node.id],
      };
    }
    // referenced_in edge entity → evidence
    addEdge(graph, ent.id, node.id, 'referenced_in', { entity_kind: ent.kind });
  }
}

function upsertCase(graph: ContextGraph, node: GraphNode): void {
  const existing = graph.cases[node.case_id];
  if (existing) {
    if (!existing.evidence_ids.includes(node.id)) {
      existing.evidence_ids.push(node.id);
    }
    // Update lead officer to most recent uploader
    existing.lead_officer = node.officer;
  } else {
    graph.cases[node.case_id] = {
      title: `Case ${node.case_id}`,
      status: 'active',
      lead_officer: node.officer,
      evidence_ids: [node.id],
      date_opened: node.date_ingested,
    };
  }
}

const MAX_EDGES_PER_NODE = 6;

const RELATIONSHIP_WEIGHT: Record<GraphEdge['relationship'], number> = {
  same_case: 3,
  same_officer: 2, // retained for back-compat; no longer emitted
  same_date: 1,
  referenced_in: 0,
};

type EdgeCandidate = {
  otherId: string;
  relationship: GraphEdge['relationship'];
  metadata: Record<string, unknown>;
  weight: number;
  dateDistance: number;
};

function generateEdges(graph: ContextGraph, node: GraphNode): void {
  const existing = Object.values(graph.nodes).filter(n => n.id !== node.id);
  const candidates: EdgeCandidate[] = [];

  for (const other of existing) {
    // Same-case and same-officer are rendered as hub nodes (case + officer entity)
    // with referenced_in spokes, so we don't emit pairwise edges for them here.
    if (other.case_id && other.case_id === node.case_id) continue;
    if (other.officer && other.officer === node.officer) continue;

    let relationship: GraphEdge['relationship'] | null = null;
    let metadata: Record<string, unknown> = {};

    if (node.date_recorded && other.date_recorded) {
      const diff = Math.abs(
        new Date(node.date_recorded).getTime() - new Date(other.date_recorded).getTime()
      );
      if (diff <= 24 * 60 * 60 * 1000) {
        relationship = 'same_date';
        metadata = { date: node.date_recorded };
      }
    }

    if (!relationship) continue;

    const dateDistance =
      node.date_recorded && other.date_recorded
        ? Math.abs(
            new Date(node.date_recorded).getTime() - new Date(other.date_recorded).getTime()
          )
        : Number.POSITIVE_INFINITY;

    candidates.push({
      otherId: other.id,
      relationship,
      metadata,
      weight: RELATIONSHIP_WEIGHT[relationship],
      dateDistance,
    });
  }

  // Strongest relationship first; closest in time breaks ties.
  candidates.sort((a, b) => b.weight - a.weight || a.dateDistance - b.dateDistance);

  const edgeCount = new Map<string, number>();
  for (const e of graph.edges) {
    edgeCount.set(e.source, (edgeCount.get(e.source) ?? 0) + 1);
    edgeCount.set(e.target, (edgeCount.get(e.target) ?? 0) + 1);
  }

  let added = 0;
  for (const c of candidates) {
    if (added >= MAX_EDGES_PER_NODE) break;
    if ((edgeCount.get(c.otherId) ?? 0) >= MAX_EDGES_PER_NODE) continue;
    addEdge(graph, node.id, c.otherId, c.relationship, c.metadata);
    edgeCount.set(c.otherId, (edgeCount.get(c.otherId) ?? 0) + 1);
    added++;
  }
}

function addEdge(
  graph: ContextGraph,
  source: string,
  target: string,
  relationship: GraphEdge['relationship'],
  metadata: Record<string, unknown>
): void {
  const exists = graph.edges.some(
    e => e.source === source && e.target === target && e.relationship === relationship
  );
  if (!exists) {
    graph.edges.push({ source, target, relationship, metadata });
  }
}

function updateMetadata(graph: ContextGraph): void {
  const nodes = Object.values(graph.nodes);
  const breakdown: Record<string, number> = {};
  for (const n of nodes) {
    breakdown[n.media_class] = (breakdown[n.media_class] ?? 0) + 1;
  }
  graph.metadata = {
    total_items: nodes.length,
    last_updated: new Date().toISOString(),
    media_breakdown: breakdown,
  };
}
