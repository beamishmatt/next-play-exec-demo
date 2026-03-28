import { SearchOutput } from '../data/types';
import { getOpenAIKey } from '../utils/openaiClient';
import { getContextGraph, getVectorStoreId, setVectorStoreId } from '../storage/config';
import { analyzeQuery, buildFilterChips, buildEntityResults } from './queryAnalysis';
import { scopeGraph } from './graphScope';
import { retrieveFromVector } from './vectorRetrieval';
import { synthesizeResults } from './synthesis';
import { createVectorStore } from '../utils/openaiClient';

export type SearchStep = 'analyzing' | 'scoping' | 'retrieving' | 'synthesizing' | 'done';

export async function agentSearch(
  query: string,
  onProgress?: (step: SearchStep) => void
): Promise<SearchOutput> {
  const graph = getContextGraph();
  const hasNodes = Object.keys(graph.nodes).length > 0;
  const hasKey = !!getOpenAIKey();

  // Without an API key, do local-only keyword search
  if (!hasKey) {
    return localSearch(query, graph);
  }

  // Ensure vector store + assistant exist on first run
  await ensureInfrastructure();

  // Step 1: Query analysis
  onProgress?.('analyzing');
  const analysis = await analyzeQuery(query);
  const chips = buildFilterChips(analysis);

  // Step 2: Graph scoping
  onProgress?.('scoping');
  const scopedNodes = hasNodes ? scopeGraph(graph, analysis) : [];
  const caseIds = [...new Set(scopedNodes.map(n => n.case_id))];

  // Step 3: Vector retrieval — always run when nodes exist, to get actual file text for excerpts
  const needsVector = hasNodes;
  let vectorResult = null;
  if (needsVector) {
    onProgress?.('retrieving');
    const storeId = getVectorStoreId();
    if (storeId) {
      try {
        vectorResult = await retrieveFromVector(storeId, analysis.reformulated_query, scopedNodes);
      } catch (err) {
        console.warn('Vector retrieval failed, continuing with graph results:', err);
      }
    }
  }

  // Step 4: Synthesis
  onProgress?.('synthesizing');
  const output = await synthesizeResults(analysis, scopedNodes, vectorResult, {
    cases_involved: caseIds,
    total_scoped: scopedNodes.length,
  });

  onProgress?.('done');

  return { ...output, chips };
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
    results: matched.map(n => ({
      evidence_id: n.id,
      title: n.title,
      media_class: n.media_class,
      case_id: n.case_id,
      officer: n.officer,
      category: n.category,
      excerpt: n.description ? n.description.slice(0, 200) : undefined,
      relevance: 'Matches search keywords',
      confidence: 'medium' as const,
      thumbnailUrl: n.thumbnailUrl,
      date_recorded: n.date_recorded,
      source: n.source,
    })),
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
