import { uploadBinaryFile, uploadTextFile, addFileToVectorStore } from '../utils/openaiClient';
import { getVectorStoreId } from '../storage/config';
import { addNodeToGraph, NodeInput } from './graphBuilder';
import { GraphNode } from '../data/types';

export interface DocumentMeta {
  caseId: string;
  officer: string;
  category: string;
  source?: string;
}

export async function processDocument(
  file: File,
  mimeType: string,
  mediaClass: GraphNode['media_class'],
  meta: DocumentMeta,
  onStatus: (msg: string) => void,
  fileUrl?: string,
): Promise<GraphNode> {
  onStatus(`Uploading ${file.name} to vector store…`);

  const fileId = await uploadBinaryFile(file);

  const storeId = getVectorStoreId();
  if (storeId) {
    onStatus('Adding to vector store…');
    await addFileToVectorStore(storeId, fileId);
  }

  onStatus('Building graph node…');
  const node = addNodeToGraph({
    title: file.name,
    mediaClass,
    mimeType,
    size: file.size,
    caseId: meta.caseId,
    officer: meta.officer,
    category: meta.category,
    source: meta.source,
    vector_file_id: fileId,
    fileUrl,
  } satisfies NodeInput);

  onStatus(`✓ ${file.name} ingested`);
  return node;
}
