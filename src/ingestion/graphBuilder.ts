import { ContextGraph, GraphNode, GraphEdge } from '../data/types';
import { getContextGraph, setContextGraph } from '../storage/config';

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

export function addNodeToGraph(input: NodeInput): GraphNode {
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
  updateMetadata(graph);
  setContextGraph(graph);

  return node;
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

function generateEdges(graph: ContextGraph, node: GraphNode): void {
  const existing = Object.values(graph.nodes).filter(n => n.id !== node.id);

  for (const other of existing) {
    // same_case
    if (other.case_id && other.case_id === node.case_id) {
      addEdge(graph, node.id, other.id, 'same_case', { case_id: node.case_id });
    }
    // same_officer
    else if (other.officer && other.officer === node.officer) {
      addEdge(graph, node.id, other.id, 'same_officer', { officer: node.officer });
    }
    // same_date (within 24h)
    else if (node.date_recorded && other.date_recorded) {
      const diff = Math.abs(
        new Date(node.date_recorded).getTime() - new Date(other.date_recorded).getTime()
      );
      if (diff <= 24 * 60 * 60 * 1000) {
        addEdge(graph, node.id, other.id, 'same_date', { date: node.date_recorded });
      }
    }
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
