import { useState, useEffect } from 'react';
import { Evidence, FileType, Category, GraphNode } from './types';
import { getContextGraph } from '../storage/config';

function mediaClassToFileType(mediaClass: GraphNode['media_class']): FileType {
  if (mediaClass === 'video') return 'video';
  if (mediaClass === 'audio') return 'audio';
  if (mediaClass === 'image') return 'image';
  return 'other';
}

function graphNodeToEvidence(node: GraphNode): Evidence {
  return {
    uuid: node.id,
    id: node.case_id,
    title: node.title,
    owner: node.officer,
    uploadedBy: node.officer,
    addedBy: node.officer,
    uploadedOn: new Date(node.date_ingested),
    recordedOn: new Date(node.date_recorded),
    duration: node.duration ?? 'N/A',
    status: 'active',
    fileType: mediaClassToFileType(node.media_class),
    category: node.category as Category,
    thumbnailUrl: node.thumbnailUrl ?? '',
    description: node.description,
    source: node.source,
    vector_file_id: node.vector_file_id,
    objects_detected: node.objects_detected,
  };
}

function loadEvidence(): Evidence[] {
  const graph = getContextGraph();
  return Object.values(graph.nodes).map(graphNodeToEvidence);
}

export function useGraphEvidence(): Evidence[] {
  const [evidence, setEvidence] = useState<Evidence[]>(loadEvidence);

  useEffect(() => {
    const handler = () => setEvidence(loadEvidence());
    window.addEventListener('evidenceGraphUpdated', handler);
    return () => window.removeEventListener('evidenceGraphUpdated', handler);
  }, []);

  return evidence;
}
