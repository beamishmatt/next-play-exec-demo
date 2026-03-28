import { GraphNode } from '../data/types';
import { classifyFile } from './classifier';
import { processDocument, DocumentMeta } from './documentProcessor';
import { processImage } from './imageProcessor';
import { processVideo } from './videoProcessor';
import { getOpenAIKey } from '../utils/openaiClient';
import { getVectorStoreId, setVectorStoreId } from '../storage/config';
import { createVectorStore } from '../utils/openaiClient';

export interface IngestMeta extends DocumentMeta {}

export interface IngestResult {
  file: File;
  node?: GraphNode;
  error?: string;
}

export type StatusCallback = (fileIndex: number, message: string) => void;

export async function ingestFiles(
  files: File[],
  meta: IngestMeta,
  onStatus: StatusCallback
): Promise<IngestResult[]> {
  if (!getOpenAIKey()) {
    throw new Error('No OpenAI API key configured. Add VITE_OPENAI_API_KEY to your .env file.');
  }

  // Ensure infrastructure exists
  await ensureInfrastructure();

  const results: IngestResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const log = (msg: string) => onStatus(i, msg);

    try {
      const { mediaClass, mimeType } = classifyFile(file);
      log(`Classified as ${mediaClass}`);

      let node: GraphNode;

      if (mediaClass === 'image') {
        node = await processImage(file, mimeType, meta, log);
      } else if (mediaClass === 'video') {
        node = await processVideo(file, mimeType, meta, log);
      } else {
        // document, pdf, text, audio
        node = await processDocument(file, mimeType, mediaClass, meta, log);
      }

      results.push({ file, node });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log(`✗ Error: ${message}`);
      results.push({ file, error: message });
    }
  }

  return results;
}

async function ensureInfrastructure(): Promise<void> {
  let storeId = getVectorStoreId();
  if (!storeId) {
    storeId = await createVectorStore('Evidence Search Store');
    setVectorStoreId(storeId);
  }
}
