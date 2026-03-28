import { MediaClass } from '../data/types';

interface Classification {
  mediaClass: MediaClass;
  mimeType: string;
}

const EXT_MAP: Record<string, Classification> = {
  mp4:  { mediaClass: 'video',    mimeType: 'video/mp4' },
  mov:  { mediaClass: 'video',    mimeType: 'video/quicktime' },
  avi:  { mediaClass: 'video',    mimeType: 'video/x-msvideo' },
  webm: { mediaClass: 'video',    mimeType: 'video/webm' },
  mp3:  { mediaClass: 'audio',    mimeType: 'audio/mpeg' },
  wav:  { mediaClass: 'audio',    mimeType: 'audio/wav' },
  m4a:  { mediaClass: 'audio',    mimeType: 'audio/mp4' },
  jpg:  { mediaClass: 'image',    mimeType: 'image/jpeg' },
  jpeg: { mediaClass: 'image',    mimeType: 'image/jpeg' },
  png:  { mediaClass: 'image',    mimeType: 'image/png' },
  gif:  { mediaClass: 'image',    mimeType: 'image/gif' },
  webp: { mediaClass: 'image',    mimeType: 'image/webp' },
  pdf:  { mediaClass: 'pdf',      mimeType: 'application/pdf' },
  docx: { mediaClass: 'document', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  doc:  { mediaClass: 'document', mimeType: 'application/msword' },
  txt:  { mediaClass: 'text',     mimeType: 'text/plain' },
  csv:  { mediaClass: 'document', mimeType: 'text/csv' },
  json: { mediaClass: 'document', mimeType: 'application/json' },
};

export function classifyFile(file: File): Classification {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (EXT_MAP[ext]) return EXT_MAP[ext];

  // Fall back to MIME type
  const mime = file.type;
  if (mime.startsWith('video/'))     return { mediaClass: 'video',    mimeType: mime };
  if (mime.startsWith('audio/'))     return { mediaClass: 'audio',    mimeType: mime };
  if (mime.startsWith('image/'))     return { mediaClass: 'image',    mimeType: mime };
  if (mime === 'application/pdf')    return { mediaClass: 'pdf',      mimeType: mime };
  if (mime.startsWith('text/'))      return { mediaClass: 'text',     mimeType: mime };

  return { mediaClass: 'document', mimeType: mime || 'application/octet-stream' };
}
