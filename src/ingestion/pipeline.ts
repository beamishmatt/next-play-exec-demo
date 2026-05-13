import { GraphNode } from '../data/types';
import { classifyFile } from './classifier';
import { processDocument, DocumentMeta } from './documentProcessor';
import { processImage } from './imageProcessor';
import { processVideo } from './videoProcessor';
import { getOpenAIKey } from '../utils/openaiClient';
import { getVectorStoreId, setVectorStoreId } from '../storage/config';
import { createVectorStore } from '../utils/openaiClient';

async function saveFileToServer(file: File): Promise<string | undefined> {
  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const base64 = dataUrl.split(',')[1];
    const res = await fetch('/api/upload-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, data: base64 }),
    });
    if (!res.ok) return undefined;
    const { fileUrl } = await res.json();
    return fileUrl as string;
  } catch {
    return undefined;
  }
}

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

      const fileUrl = await saveFileToServer(file);

      let node: GraphNode;

      if (mediaClass === 'image') {
        node = await processImage(file, mimeType, meta, log, fileUrl);
      } else if (mediaClass === 'video') {
        node = await processVideo(file, mimeType, meta, log, fileUrl);
      } else {
        // document, pdf, text, audio
        node = await processDocument(file, mimeType, mediaClass, meta, log, fileUrl);
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
