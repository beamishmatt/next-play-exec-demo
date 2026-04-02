import { SearchOutput, SearchEvidenceResult, GraphNode } from '../data/types';
import { getOpenAIKey } from '../utils/openaiClient';
import { getContextGraph, getVectorStoreId, setVectorStoreId, updateGraphNode } from '../storage/config';
import { analyzeQuery, buildFilterChips, buildEntityResults } from './queryAnalysis';
import { scopeGraph } from './graphScope';
import { synthesizeSummary } from './synthesis';
import { createVectorStore, chatCompletion } from '../utils/openaiClient';

/**
 * Generates a description for a graph node using its metadata, then persists it
 * to the graph so no future LLM call is needed.
 */
export async function generateAndSaveDescription(nodeId: string): Promise<string | null> {
  const graph = getContextGraph();
  const node = graph.nodes[nodeId];
  if (!node) return null;
  if (node.description) return node.description; // already have one

  const key = getOpenAIKey();
  if (!key) return null;

  const objectsList = node.objects_detected?.length
    ? node.objects_detected.map(o => `${o.color ? o.color + ' ' : ''}${o.label}`).join(', ')
    : null;

  const contextLines = [
    `Title: ${node.title}`,
    `Type: ${node.media_class}`,
    `Category: ${node.category}`,
    `Officer: ${node.officer}`,
    `Case: ${node.case_id}`,
    node.date_recorded ? `Date: ${node.date_recorded}` : null,
    node.scene_type ? `Scene: ${node.scene_type}` : null,
    node.lighting ? `Lighting: ${node.lighting}` : null,
    node.people_count != null ? `People visible: ${node.people_count}` : null,
    node.text_visible ? `Text visible: ${node.text_visible}` : null,
    objectsList ? `Objects detected: ${objectsList}` : null,
    node.source ? `Source: ${node.source}` : null,
  ].filter(Boolean).join('\n');

  try {
    const description = await chatCompletion([
      {
        role: 'system',
        content: 'You write concise 1–2 sentence descriptions for police evidence items based on metadata. Be factual and specific. Do not invent details not present in the metadata.',
      },
      {
        role: 'user',
        content: `Write a brief description for this evidence item:\n\n${contextLines}`,
      },
    ], { model: 'gpt-4o-mini', max_tokens: 120 });

    const trimmed = description.trim();
    if (trimmed) updateGraphNode(nodeId, { description: trimmed });
    return trimmed || null;
  } catch {
    return null;
  }
}

export type SearchStep = 'analyzing' | 'scoping' | 'retrieving' | 'synthesizing' | 'done';

export async function agentSearch(
  query: string,
  onProgress?: (step: SearchStep) => void,
  onPartialResults?: (results: SearchEvidenceResult[]) => void
): Promise<SearchOutput> {
  const graph = getContextGraph();
  const hasNodes = Object.keys(graph.nodes).length > 0;
  const hasKey = !!getOpenAIKey();

  // Without an API key, do local-only keyword search
  if (!hasKey) {
    return localSearch(query, graph);
  }

  // Ensure vector store exists on first run
  await ensureInfrastructure();

  // Phase 1: Analyze query (~1-2s)
  onProgress?.('analyzing');
  const analysis = await analyzeQuery(query);
  const chips = buildFilterChips(analysis);

  // Phase 1b: Scope graph (instant — pure local)
  onProgress?.('scoping');
  console.log('[search] analysis:', JSON.stringify(analysis, null, 2));
  const scopedNodes = hasNodes ? scopeGraph(graph, analysis) : [];
  console.log('[search] scopedNodes count:', scopedNodes.length);
  const caseIds = [...new Set(scopedNodes.map(n => n.case_id))];
  const entities = buildEntityResults(analysis);

  // Immediately emit all results — no LLM synthesis needed for the result list
  const immediateResults = scopedNodes.map(nodeToResult);
  onPartialResults?.(immediateResults);

  // Phase 2: Small LLM call for summary + suggestions only (~200 output tokens)
  onProgress?.('synthesizing');
  const { summary, suggestions } = await synthesizeSummary(analysis, scopedNodes);

  onProgress?.('done');

  return {
    summary,
    results: immediateResults,
    entities,
    chips,
    suggestions,
    graph_context: {
      cases_involved: caseIds,
      total_scoped: scopedNodes.length,
      total_matched: immediateResults.length,
    },
  };
}

// Convert a graph node to a search result (no LLM needed)
function nodeToResult(n: GraphNode): SearchEvidenceResult {
  return {
    evidence_id: n.id,
    title: n.title,
    media_class: n.media_class,
    case_id: n.case_id,
    officer: n.officer,
    category: n.category,
    excerpt: n.description,
    relevance: '',
    confidence: 'medium' as const,
    thumbnailUrl: n.thumbnailUrl,
    date_recorded: n.date_recorded,
    source: n.source,
  };
}

// Local-only search (no OpenAI key)
function localSearch(query: string, graph: ReturnType<typeof getContextGraph>): SearchOutput {
  const lower = query.toLowerCase();
  const nodes = Object.values(graph.nodes);

  const matched = nodes.filter(n =>
    n.title.toLowerCase().includes(lower) ||
    (n.description ?? '').toLowerCase().includes(lower) ||
    n.category.toLowerCase().includes(lower) ||
    n.officer.toLowerCase().includes(lower) ||
    n.case_id.toLowerCase().includes(lower)
  );

  const uniqueCaseIds = [...new Set(matched.map(n => n.case_id).filter(Boolean))];
  const uniqueOfficers = [...new Set(matched.map(n => n.officer).filter(Boolean))];

  const entities = buildEntityResults({
    intent: 'lookup',
    entities: {
      case_ids: uniqueCaseIds,
      officers: uniqueOfficers,
      dates: { start: null, end: null },
      evidence_types: [],
      locations: [],
      objects: [],
      keywords: query.split(' ').filter(w => w.length > 2),
      categories: [],
    },
    reformulated_query: query,
    search_strategy: 'local keyword match',
  });

  return {
    summary: matched.length > 0 ? `Found ${matched.length} matching items` : '',
    results: matched.map(nodeToResult),
    entities,
    chips: [],
    suggestions: [],
    graph_context: {
      cases_involved: [...new Set(matched.map(n => n.case_id))],
      total_scoped: nodes.length,
      total_matched: matched.length,
    },
  };
}

// Ensure vector store exists on first run
async function ensureInfrastructure(): Promise<void> {
  let storeId = getVectorStoreId();
  if (!storeId) {
    try {
      storeId = await createVectorStore('Evidence Search Store');
      setVectorStoreId(storeId);
    } catch (err) {
      console.warn('Could not create vector store:', err);
    }
  }
}
