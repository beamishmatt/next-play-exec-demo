import { uploadTextFile, addFileToVectorStore } from '../utils/openaiClient';
import { getVectorStoreId } from '../storage/config';
import { addNodeToGraph, NodeInput } from './graphBuilder';
import { GraphNode } from '../data/types';
import { DocumentMeta } from './documentProcessor';

export async function processVideo(
  file: File,
  mimeType: string,
  meta: DocumentMeta,
  onStatus: (msg: string) => void,
  fileUrl?: string,
): Promise<GraphNode> {
  onStatus(`Processing video metadata for ${file.name}…`);

  // Prototype: metadata-only (full pipeline requires ffmpeg + Whisper)
  const durationEstimate = estimateDuration(file.size);
  const thumbnailUrl = await extractVideoThumbnail(file);

  const metadataDoc = `Evidence: ${file.name}
Case: ${meta.caseId} | Officer: ${meta.officer} | Category: ${meta.category}
File type: ${mimeType} | Size: ${(file.size / 1024 / 1024).toFixed(1)} MB
Estimated duration: ${durationEstimate}
Source: ${meta.source ?? 'Unknown'}

Note: Full video processing (audio transcription + keyframe analysis) requires server-side ffmpeg pipeline.
This entry represents the video file for search and retrieval purposes.`;

  onStatus('Uploading metadata to vector store…');
  const fileId = await uploadTextFile(metadataDoc, file.name.replace(/\.[^.]+$/, '') + '_metadata.txt');
  const storeId = getVectorStoreId();
  if (storeId) {
    await addFileToVectorStore(storeId, fileId);
  }

  onStatus('Building graph node…');
  const node = addNodeToGraph({
    title: file.name,
    mediaClass: 'video',
    mimeType,
    size: file.size,
    caseId: meta.caseId,
    officer: meta.officer,
    category: meta.category,
    source: meta.source,
    duration: durationEstimate,
    vector_file_id: fileId,
    thumbnailUrl: thumbnailUrl ?? undefined,
    fileUrl,
    video_processing: 'metadata_only',
  } satisfies NodeInput);

  onStatus(`✓ ${file.name} ingested (metadata only)`);
  return node;
}

function estimateDuration(bytes: number): string {
  // Very rough: ~1 MB/s for compressed video
  const seconds = Math.round(bytes / 1_000_000);
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `00:${m}:${s}`;
}

async function extractVideoThumbnail(file: File): Promise<string | null> {
  return new Promise(resolve => {
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = URL.createObjectURL(file);
      video.currentTime = 1;
      video.onloadeddata = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
        URL.revokeObjectURL(video.src);
      };
      video.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}
