import { ContextGraph, GraphNode } from '../data/types';
import { QueryAnalysis } from './queryAnalysis';

export function scopeGraph(graph: ContextGraph, analysis: QueryAnalysis): GraphNode[] {
  const all = Object.values(graph.nodes);
  if (all.length === 0) return [];

  const { entities } = analysis;
  const hasEntityFilters =
    entities.evidence_types.length > 0 ||
    entities.officers.length > 0 ||
    entities.case_ids.length > 0 ||
    entities.categories.length > 0 ||
    entities.objects.length > 0 ||
    entities.dates.start ||
    entities.dates.end;

  // No structured entities extracted — go straight to fuzzy keyword match
  if (!hasEntityFilters) {
    return fuzzyMatch(all, analysis.reformulated_query, entities.keywords);
  }

  let candidates = [...all];

  // Evidence type — partial match
  if (entities.evidence_types.length > 0) {
    candidates = candidates.filter(n =>
      entities.evidence_types.some(t => n.media_class.includes(t.toLowerCase()))
    );
  }

  // Date range
  if (entities.dates.start) {
    candidates = candidates.filter(n => n.date_recorded >= entities.dates.start!);
  }
  if (entities.dates.end) {
    candidates = candidates.filter(n => n.date_recorded <= entities.dates.end!);
  }

  // Officer — partial match both ways
  if (entities.officers.length > 0) {
    candidates = candidates.filter(n =>
      entities.officers.some(o =>
        n.officer.toLowerCase().includes(o.toLowerCase()) ||
        o.toLowerCase().includes(n.officer.toLowerCase())
      )
    );
  }

  // Case ID — partial match
  if (entities.case_ids.length > 0) {
    candidates = candidates.filter(n =>
      entities.case_ids.some(id =>
        n.case_id.toLowerCase().includes(id.toLowerCase()) ||
        id.toLowerCase().includes(n.case_id.toLowerCase())
      )
    );
  }

  // Category — partial match
  if (entities.categories.length > 0) {
    candidates = candidates.filter(n =>
      entities.categories.some(c =>
        n.category.toLowerCase().includes(c.toLowerCase()) ||
        c.toLowerCase().includes(n.category.toLowerCase())
      )
    );
  }

  // Detected objects — partial match
  if (entities.objects.length > 0) {
    const objectMatches = candidates.filter(n =>
      entities.objects.some(searchObj =>
        (n.objects_detected ?? []).some(det =>
          det.label.toLowerCase().includes(searchObj.label.toLowerCase()) &&
          (!searchObj.color || det.color?.toLowerCase() === searchObj.color.toLowerCase())
        )
      )
    );
    if (objectMatches.length > 0) candidates = objectMatches;
  }

  // If strict filters eliminated everything, fall back to fuzzy match across all nodes
  if (candidates.length === 0) {
    return fuzzyMatch(all, analysis.reformulated_query, entities.keywords);
  }

  // Expand via edges
  const candidateIds = new Set(candidates.map(n => n.id));
  for (const edge of graph.edges) {
    if (candidateIds.has(edge.source)) candidateIds.add(edge.target);
    if (candidateIds.has(edge.target)) candidateIds.add(edge.source);
  }

  return all.filter(n => candidateIds.has(n.id));
}

const STOP_WORDS = new Set([
  'the', 'and', 'or', 'for', 'not', 'but', 'nor', 'yet', 'so',
  'a', 'an', 'in', 'on', 'at', 'to', 'of', 'up', 'by', 'as',
  'is', 'it', 'its', 'was', 'are', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'with', 'from', 'that', 'this', 'these',
  'those', 'there', 'their', 'they', 'what', 'which', 'who', 'when',
  'where', 'how', 'any', 'all', 'some', 'than', 'then', 'into', 'about',
]);

function fuzzyMatch(nodes: GraphNode[], reformulatedQuery: string, keywords: string[]): GraphNode[] {
  // Combine reformulated query words + explicit keywords
  const terms = [
    ...reformulatedQuery.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w)),
    ...keywords.map(k => k.toLowerCase()).filter(k => !STOP_WORDS.has(k)),
  ];

  if (terms.length === 0) return nodes; // no terms — return everything

  return nodes.filter(n => {
    const haystack = [
      n.title,
      n.description ?? '',
      n.category,
      n.officer,
      n.case_id,
      n.source ?? '',
      ...(n.objects_detected ?? []).map(o => o.label),
      ...(n.tags ?? []),
    ].join(' ').toLowerCase();

    return terms.some(t => haystack.includes(t));
  });
}
