import { chatCompletion } from '../utils/openaiClient';
import { GraphNode, SearchEvidenceResult, SearchOutput, EntityResult } from '../data/types';
import { VectorResult } from './vectorRetrieval';
import { QueryAnalysis, buildEntityResults } from './queryAnalysis';

const SYNTHESIS_SYSTEM = `You are an evidence search result synthesizer for a law enforcement evidence management system.
Given a search query, candidate evidence nodes from a graph, and vector search results,
produce a ranked, unified list of results with relevance explanations.

Return ONLY valid JSON with this structure (no markdown, no backticks):
{
  "summary": "Brief summary of what was found",
  "results": [
    {
      "evidence_id": "...",
      "title": "...",
      "media_class": "video|audio|image|document|text|pdf",
      "case_id": "...",
      "officer": "...",
      "category": "...",
      "relevance": "One sentence explaining why this matches the query",
      "excerpt": "Copy 1-2 sentences of raw text verbatim from the vector search results. Must be actual file content, not a description. Omit the field entirely if no vector text is available.",
      "confidence": "high|medium|low",
      "related_evidence": []
    }
  ],
  "suggestions": ["Follow-up query suggestion 1", "Follow-up query suggestion 2"]
}

Rank results by relevance. Include only genuinely relevant items. Keep relevance explanations concise.`;

export async function synthesizeResults(
  analysis: QueryAnalysis,
  graphNodes: GraphNode[],
  vectorResult: VectorResult | null,
  graph_context: { cases_involved: string[]; total_scoped: number }
): Promise<SearchOutput> {
  const entities = buildEntityResults(analysis);

  if (graphNodes.length === 0 && !vectorResult?.text) {
    return emptyOutput(analysis.entities.keywords, entities, graph_context);
  }

  const nodesSummary = graphNodes.slice(0, 30).map(n => ({
    id: n.id,
    title: n.title,
    media_class: n.media_class,
    case_id: n.case_id,
    officer: n.officer,
    category: n.category,
    description: n.description,
    objects_detected: n.objects_detected?.map(o => `${o.color ? o.color + ' ' : ''}${o.label}`).join(', '),
    date_recorded: n.date_recorded,
    thumbnailUrl: n.thumbnailUrl,
  }));

  const userContent = `Query: "${analysis.reformulated_query}"

Graph candidates (${graphNodes.length} nodes):
${JSON.stringify(nodesSummary, null, 2)}

Vector search text (use verbatim excerpts from this for the "excerpt" field):
${vectorResult?.text ?? '(no vector results)'}`;

  const raw = await chatCompletion(
    [
      { role: 'system', content: SYNTHESIS_SYSTEM },
      { role: 'user', content: userContent },
    ],
    { temperature: 0.2, max_tokens: 2000 }
  );

  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    const parsed = JSON.parse(cleaned);

    // Attach thumbnailUrl from graph nodes to results
    const nodeMap = Object.fromEntries(graphNodes.map(n => [n.id, n]));
    const results: SearchEvidenceResult[] = (parsed.results ?? []).map((r: SearchEvidenceResult) => {
      const node = nodeMap[r.evidence_id];
      return {
        ...r,
        excerpt: r.excerpt || (node?.description ? node.description.slice(0, 200) : undefined),
        thumbnailUrl: node?.thumbnailUrl,
        date_recorded: node?.date_recorded,
        source: node?.source,
      };
    });

    // Build entity list from graph nodes too (supplement query-extracted entities)
    const caseIds = [...new Set(results.map(r => r.case_id).filter(Boolean))];
    const supplementalEntities: EntityResult[] = caseIds
      .filter(id => !entities.some(e => e.id === id))
      .map(id => ({ type: 'case' as const, id, name: id.replace(/^case\s*/i, ''), subtitle: 'Case' }));

    return {
      summary: parsed.summary ?? '',
      results,
      entities: [...entities, ...supplementalEntities],
      chips: [], // chips are built upstream by buildFilterChips
      suggestions: parsed.suggestions ?? [],
      graph_context: {
        ...graph_context,
        total_matched: results.length,
        cases_involved: caseIds,
      },
    };
  } catch (err) {
    console.error('Synthesis parse error. Raw response:', raw, err);
    return emptyOutput(analysis.entities.keywords, entities, graph_context);
  }
}

function emptyOutput(
  _keywords: string[],
  entities: EntityResult[],
  graph_context: { cases_involved: string[]; total_scoped: number }
): SearchOutput {
  return {
    summary: '',
    results: [],
    entities,
    chips: [],
    suggestions: [],
    graph_context: { ...graph_context, total_matched: 0 },
  };
}
