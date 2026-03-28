import { chatCompletion, uploadTextFile, addFileToVectorStore } from '../utils/openaiClient';
import { getVectorStoreId } from '../storage/config';
import { addNodeToGraph, NodeInput } from './graphBuilder';
import { GraphNode, ObjectDetected } from '../data/types';
import { DocumentMeta } from './documentProcessor';

const VISION_PROMPT = `You are analyzing evidence for a law enforcement evidence management system.
Analyze this image thoroughly.

Return ONLY valid JSON with this exact structure (no markdown, no backticks):
{
  "description": "Detailed natural language description of the scene",
  "objects": [
    {
      "label": "object name (use specific terms: sedan, SUV, pickup_truck, handgun, rifle, knife, badge, body_camera, taser, evidence_marker, etc.)",
      "color": "primary color if applicable, null otherwise",
      "confidence": "high | medium | low",
      "position": "location in image (center, left, right, foreground, background, etc.)",
      "count": 1
    }
  ],
  "scene_type": "type (outdoor_street, indoor_residence, parking_lot, intersection, crime_scene, office, interrogation_room, etc.)",
  "lighting": "lighting conditions (daylight, nighttime_artificial, dawn_dusk, indoor_fluorescent, etc.)",
  "weather": "if outdoor (clear, rainy, overcast, snowy, etc.) or null",
  "people_count": 0,
  "people_descriptions": [],
  "text_visible": "any readable text in the image or null",
  "notable_details": "anything relevant to law enforcement (damage, injuries, contraband, weapons, evidence markers)"
}`;

interface VisionResult {
  description: string;
  objects: ObjectDetected[];
  scene_type: string;
  lighting: string;
  people_count: number;
  text_visible: string | null;
  notable_details: string;
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Downscale to a small JPEG thumbnail so it persists in the JSON graph without bloating it
function fileToThumbnailDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const maxW = 320, maxH = 180;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Thumbnail generation failed')); };
    img.src = objectUrl;
  });
}

export async function processImage(
  file: File,
  mimeType: string,
  meta: DocumentMeta,
  onStatus: (msg: string) => void
): Promise<GraphNode> {
  onStatus(`Analyzing ${file.name} with vision…`);

  const base64 = await fileToBase64(file);

  const raw = await chatCompletion([
    {
      role: 'user',
      content: [
        { type: 'text', text: VISION_PROMPT },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'high' } },
      ],
    },
  ]);

  let vision: VisionResult;
  try {
    vision = JSON.parse(raw);
  } catch {
    vision = {
      description: `Image file: ${file.name}`,
      objects: [],
      scene_type: 'unknown',
      lighting: 'unknown',
      people_count: 0,
      text_visible: null,
      notable_details: '',
    };
  }

  // Upload analysis text to vector store
  onStatus('Uploading analysis to vector store…');
  const analysisText = `Evidence: ${file.name}
Case: ${meta.caseId} | Officer: ${meta.officer} | Category: ${meta.category}

Description: ${vision.description}

Scene: ${vision.scene_type} | Lighting: ${vision.lighting}
People: ${vision.people_count}
Objects detected: ${vision.objects.map(o => `${o.color ? o.color + ' ' : ''}${o.label}`).join(', ')}
${vision.text_visible ? `Text visible: ${vision.text_visible}` : ''}
${vision.notable_details ? `Notable: ${vision.notable_details}` : ''}`;

  const fileId = await uploadTextFile(analysisText, file.name.replace(/\.[^.]+$/, '') + '_analysis.txt');
  const storeId = getVectorStoreId();
  if (storeId) {
    await addFileToVectorStore(storeId, fileId);
  }

  // Downscaled JPEG thumbnail — small enough to persist in the JSON graph across reloads
  const thumbnailUrl = await fileToThumbnailDataUrl(file);

  onStatus('Building graph node…');
  const node = addNodeToGraph({
    title: file.name,
    mediaClass: 'image',
    mimeType,
    size: file.size,
    caseId: meta.caseId,
    officer: meta.officer,
    category: meta.category,
    source: meta.source,
    description: vision.description,
    objects_detected: vision.objects,
    scene_type: vision.scene_type,
    lighting: vision.lighting,
    people_count: vision.people_count,
    text_visible: vision.text_visible ?? undefined,
    vector_file_id: fileId,
    thumbnailUrl,
  } satisfies NodeInput);

  onStatus(`✓ ${file.name} analyzed and ingested`);
  return node;
}
