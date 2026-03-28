import { searchVectorStore, VectorStoreChunk } from '../utils/openaiClient';
import { GraphNode } from '../data/types';

export interface VectorResult {
  text: string;
  fileIds: string[];
}

export async function retrieveFromVector(
  storeId: string,
  reformulatedQuery: string,
  scopedNodes: GraphNode[]
): Promise<VectorResult> {
  const contextHint =
    scopedNodes.length > 0
      ? ` Focus on: ${scopedNodes.map(n => n.title).join(', ')}.`
      : '';

  const chunks: VectorStoreChunk[] = await searchVectorStore(
    storeId,
    reformulatedQuery + contextHint,
    10
  );

  return {
    text: chunks.map(c => c.text).join('\n\n'),
    fileIds: [...new Set(chunks.map(c => c.fileId))],
  };
}
