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

  const terms = queryTerms(analysis);

  // No structured entities extracted — fuzzy match on keywords only, never fall back to reformulated query
  if (!hasEntityFilters) {
    const keywordTerms = analysis.entities.keywords
      .map(k => k.toLowerCase())
      .filter(k => k.length > 2 && !STOP_WORDS.has(k));
    if (keywordTerms.length === 0) return [];
    return scoredSort(fuzzyMatch(all, keywordTerms), analysis, keywordTerms, new Set());
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

  // Category — exact match only (partial match causes false positives with LLM fallback categories)
  if (entities.categories.length > 0) {
    candidates = candidates.filter(n =>
      entities.categories.some(c => n.category.toLowerCase() === c.toLowerCase())
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
    candidates = objectMatches;
  }

  // If strict filters eliminated everything, fall back to keyword-only fuzzy match
  // (avoids broad reformulated query terms like "evidence" matching everything)
  if (candidates.length === 0) {
    const keywordTerms = analysis.entities.keywords
      .map(k => k.toLowerCase())
      .filter(k => k.length > 2 && !STOP_WORDS.has(k));
    if (keywordTerms.length === 0) return [];
    const fallback = fuzzyMatch(all, keywordTerms);
    if (fallback.length === 0) return [];
    return scoredSort(fallback, analysis, keywordTerms, new Set());
  }

  // Track direct candidates before edge expansion — used for scoring
  const directIds = new Set(candidates.map(n => n.id));

  // Expand via edges — only non-same_case relationships to avoid pulling in entire cases
  const candidateIds = new Set(directIds);
  for (const edge of graph.edges) {
    if (edge.relationship === 'same_case') continue;
    if (candidateIds.has(edge.source)) candidateIds.add(edge.target);
    if (candidateIds.has(edge.target)) candidateIds.add(edge.source);
  }

  const scoped = all.filter(n => candidateIds.has(n.id));
  return scoredSort(scoped, analysis, terms, directIds);
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

function scoreNode(n: GraphNode, analysis: QueryAnalysis, terms: string[], directIds: Set<string>): number {
  let score = 0;
  const { entities } = analysis;

  const titleLower = n.title.toLowerCase();
  const descLower = (n.description ?? '').toLowerCase();

  // Direct filter match (not just edge-expanded)
  if (directIds.has(n.id)) score += 5;

  // Title keyword hits (high signal)
  for (const term of terms) {
    if (titleLower.includes(term)) score += 10;
  }

  // Description keyword hits
  for (const term of terms) {
    if (descLower.includes(term)) score += 3;
  }

  // Structured entity matches
  for (const caseId of entities.case_ids) {
    if (n.case_id.toLowerCase().includes(caseId.toLowerCase()) ||
        caseId.toLowerCase().includes(n.case_id.toLowerCase())) score += 15;
  }
  for (const officer of entities.officers) {
    if (n.officer.toLowerCase().includes(officer.toLowerCase()) ||
        officer.toLowerCase().includes(n.officer.toLowerCase())) score += 12;
  }
  for (const category of entities.categories) {
    if (n.category.toLowerCase().includes(category.toLowerCase())) score += 8;
  }
  for (const type of entities.evidence_types) {
    if (n.media_class.includes(type.toLowerCase())) score += 6;
  }

  // Object detection matches
  for (const searchObj of entities.objects) {
    for (const det of (n.objects_detected ?? [])) {
      if (det.label.toLowerCase().includes(searchObj.label.toLowerCase())) {
        score += 6;
        if (searchObj.color && det.color?.toLowerCase() === searchObj.color.toLowerCase()) score += 4;
      }
    }
  }

  return score;
}

function scoredSort(nodes: GraphNode[], analysis: QueryAnalysis, terms: string[], directIds: Set<string>): GraphNode[] {
  return nodes
    .map(n => ({ node: n, score: scoreNode(n, analysis, terms, directIds), isDirect: directIds.size > 0 && directIds.has(n.id) }))
    .sort((a, b) => {
      // Direct matches always rank above edge-expanded results
      if (a.isDirect !== b.isDirect) return a.isDirect ? -1 : 1;
      return b.score - a.score;
    })
    .map(({ node }) => node);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'the', 'and', 'or', 'for', 'not', 'but', 'nor', 'yet', 'so',
  'a', 'an', 'in', 'on', 'at', 'to', 'of', 'up', 'by', 'as',
  'is', 'it', 'its', 'was', 'are', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'with', 'from', 'that', 'this', 'these',
  'those', 'there', 'their', 'they', 'what', 'which', 'who', 'when',
  'where', 'how', 'any', 'all', 'some', 'than', 'then', 'into', 'about',
]);

function queryTerms(analysis: QueryAnalysis): string[] {
  return [
    ...analysis.reformulated_query.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w)),
    ...analysis.entities.keywords.map(k => k.toLowerCase()).filter(k => !STOP_WORDS.has(k)),
  ];
}

function fuzzyMatch(nodes: GraphNode[], terms: string[]): GraphNode[] {
  if (terms.length === 0) return [];

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
