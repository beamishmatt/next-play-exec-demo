export interface DraftReport {
  title: string;
  body: string;
}

export function parseDraft(content: string): { content: string; draft: DraftReport | null } {
  const OPEN_RE = /<draft_report(?:\s+title="([^"]*)")?>/;
  const CLOSE = '</draft_report>';
  const openMatch = content.match(OPEN_RE);
  if (!openMatch || openMatch.index === undefined) return { content, draft: null };
  const openIdx = openMatch.index;
  const closeIdx = content.indexOf(CLOSE, openIdx);
  if (closeIdx === -1) {
    // Draft tag open but not yet closed — hide the draft region during streaming
    return { content: content.slice(0, openIdx).trim(), draft: null };
  }
  const title = openMatch[1] || 'Draft Report';
  const body = content.slice(openIdx + openMatch[0].length, closeIdx).trim();
  const remaining = (content.slice(0, openIdx) + content.slice(closeIdx + CLOSE.length)).trim();
  return { content: remaining, draft: { title, body } };
}

export const DRAFT_PANEL_WIDTH = 560;
