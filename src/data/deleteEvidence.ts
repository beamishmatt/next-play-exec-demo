import { getContextGraph, setContextGraph, getVectorStoreId } from '../storage/config';
import { getOpenAIKey } from '../utils/openaiClient';

export async function deleteEvidence(uuid: string, vectorFileId?: string): Promise<void> {
  const graph = getContextGraph();
  const node = graph.nodes[uuid];
  if (!node) return;

  // Delete from OpenAI via proxy
  if (vectorFileId) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const headers: Record<string, string> = { 'OpenAI-Beta': 'assistants=v2' };
    const storeId = getVectorStoreId();
    if (storeId) {
      await fetch(`${origin}/api/openai/vector_stores/${storeId}/files/${vectorFileId}`, {
        method: 'DELETE', headers,
      }).catch(() => { /* non-fatal */ });
    }
    await fetch(`${origin}/api/openai/files/${vectorFileId}`, {
      method: 'DELETE', headers,
    }).catch(() => { /* non-fatal */ });
  }

  // Remove from graph
  delete graph.nodes[uuid];
  graph.edges = graph.edges.filter(e => e.source !== uuid && e.target !== uuid);

  const caseEntry = graph.cases[node.case_id];
  if (caseEntry) {
    caseEntry.evidence_ids = caseEntry.evidence_ids.filter(id => id !== uuid);
    if (caseEntry.evidence_ids.length === 0) {
      delete graph.cases[node.case_id];
    }
  }

  // Prune the deleted evidence from every entity's evidence_ids. Drop entities
  // that no longer reference any remaining evidence so they don't render as
  // orphan nodes.
  if (graph.entities) {
    for (const [entId, ent] of Object.entries(graph.entities)) {
      if (!ent.evidence_ids.includes(uuid)) continue;
      ent.evidence_ids = ent.evidence_ids.filter(id => id !== uuid);
      if (ent.evidence_ids.length === 0) {
        delete graph.entities[entId];
      }
    }
  }

  graph.metadata.total_items = Object.keys(graph.nodes).length;
  graph.metadata.last_updated = new Date().toISOString();

  setContextGraph(graph); // also fires evidenceGraphUpdated
}
