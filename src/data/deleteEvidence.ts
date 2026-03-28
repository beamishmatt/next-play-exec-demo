import { getContextGraph, setContextGraph, getVectorStoreId } from '../storage/config';
import { getOpenAIKey } from '../utils/openaiClient';

export async function deleteEvidence(uuid: string, vectorFileId?: string): Promise<void> {
  const graph = getContextGraph();
  const node = graph.nodes[uuid];
  if (!node) return;

  const apiKey = getOpenAIKey();

  // Delete from OpenAI
  if (vectorFileId && apiKey) {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'OpenAI-Beta': 'assistants=v2',
    };
    const storeId = getVectorStoreId();
    if (storeId) {
      await fetch(`https://api.openai.com/v1/vector_stores/${storeId}/files/${vectorFileId}`, {
        method: 'DELETE', headers,
      }).catch(() => { /* non-fatal */ });
    }
    await fetch(`https://api.openai.com/v1/files/${vectorFileId}`, {
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

  graph.metadata.total_items = Object.keys(graph.nodes).length;
  graph.metadata.last_updated = new Date().toISOString();

  setContextGraph(graph); // also fires evidenceGraphUpdated
}
