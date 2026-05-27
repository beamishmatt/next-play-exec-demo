import { EntityKind, GraphNode } from '../data/types';
import { chatCompletion, getOpenAIKey } from '../utils/openaiClient';

export interface ExtractedEntity {
  id: string;          // stable key, e.g. "officer:james-martin"
  kind: EntityKind;
  label: string;       // display label
  subkind?: string;    // for 'identifier': "phone" | "license_plate" | "case_number" | "address"
                       // for 'person':     "suspect" | "witness" | "victim" | "other"
}

// Scene-type allowlist. Scanned case-insensitively against description + text_visible.
// Kept small + concrete so we don't promote generic words ("scene", "image", "area").
const LOCATION_KEYWORDS = [
  'bar', 'sidewalk', 'storefront', 'alley', 'park', 'intersection',
  'highway', 'parking lot', 'parking garage', 'driveway', 'porch',
  'doorway', 'doorbell', 'kitchen', 'bedroom', 'bathroom', 'hallway',
  'garage', 'basement', 'rooftop', 'street', 'crosswalk', 'gas station',
  'convenience store', 'apartment', 'lobby', 'stairwell', 'elevator',
];

const CASE_NUMBER_RE = /\b[A-Z]{2,6}-\d{4}-\d{4,8}\b/g;
const PHONE_RE = /\b(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
const ADDRESS_RE = /\b\d{1,5}\s+[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Ln|Lane|Dr|Drive|Way|Pl|Place|Ct|Court|Hwy|Highway)\b/g;
// Plate: 3 letters + 3-4 digits, or 3 digits + 3 letters. Common US patterns.
const PLATE_RE = /\b(?:[A-Z]{3}[-\s]?\d{3,4}|\d{3}[-\s]?[A-Z]{3})\b/g;

export async function extractEntities(node: GraphNode): Promise<ExtractedEntity[]> {
  const out = new Map<string, ExtractedEntity>();

  // Officer — always present, low cardinality, very useful as a hub.
  if (node.officer) {
    const id = `officer:${slugify(node.officer)}`;
    out.set(id, { id, kind: 'officer', label: node.officer });
  }

  // Objects — promote each detected label. Normalize underscores to spaces.
  for (const obj of node.objects_detected ?? []) {
    const label = humanize(obj.label);
    const id = `object:${slugify(label)}`;
    if (!out.has(id)) out.set(id, { id, kind: 'object', label });
  }

  const corpus = [node.description ?? '', node.text_visible ?? '', node.title ?? '']
    .filter(Boolean)
    .join('\n');

  // Locations — scene-keyword scan. Case-insensitive match against allowlist.
  if (corpus) {
    const lower = corpus.toLowerCase();
    for (const keyword of LOCATION_KEYWORDS) {
      if (lower.includes(keyword)) {
        const id = `location:${slugify(keyword)}`;
        if (!out.has(id)) out.set(id, { id, kind: 'location', label: keyword });
      }
    }
  }
  if (node.scene_type) {
    const label = humanize(node.scene_type).toLowerCase();
    const id = `location:${slugify(label)}`;
    if (!out.has(id)) out.set(id, { id, kind: 'location', label });
  }

  // Identifiers — regex pass.
  if (corpus) {
    addMatches(out, corpus, CASE_NUMBER_RE, 'case_number');
    addMatches(out, corpus, PHONE_RE, 'phone');
    addMatches(out, corpus, ADDRESS_RE, 'address');
    addMatches(out, corpus, PLATE_RE, 'license_plate');
  }

  // Persons — LLM pull from title + description + text_visible. We exclude
  // the node's officer so the officer hub doesn't get a duplicate person node.
  const persons = await extractPersonsLLM(node);
  for (const p of persons) {
    const id = `person:${slugify(p.label)}`;
    if (!out.has(id)) {
      out.set(id, { id, kind: 'person', label: p.label, subkind: p.role });
    }
  }

  return [...out.values()];
}

interface PersonHit { label: string; role?: string }

async function extractPersonsLLM(node: GraphNode): Promise<PersonHit[]> {
  if (!getOpenAIKey()) return [];
  const contextLines = [
    node.title ? `Title: ${node.title}` : null,
    node.description ? `Description: ${node.description}` : null,
    node.text_visible ? `Visible text: ${node.text_visible}` : null,
  ].filter(Boolean).join('\n');
  if (!contextLines) return [];

  const officerLower = (node.officer ?? '').toLowerCase();
  const raw = await chatCompletion(
    [
      {
        role: 'system',
        content:
          'Extract the proper names of civilian persons (suspects, witnesses, victims, persons of interest) referenced in police evidence metadata. ' +
          'Return ONLY valid JSON in the shape: {"persons":[{"name":"Firstname Lastname","role":"suspect|witness|victim|other"}]}. ' +
          'Rules: ' +
          '(1) DO NOT include law enforcement officers, detectives, or investigators. ' +
          '(2) Names must be capitalized proper names of real persons — not job titles, locations, organizations, or evidence-numbering tokens. ' +
          '(3) Only include names you are confident appear in the source — do not invent. ' +
          '(4) If no civilian persons are referenced, return {"persons":[]}.',
      },
      { role: 'user', content: contextLines },
    ],
    { model: 'gpt-4o-mini', temperature: 0, max_tokens: 200 },
  ).catch(() => '');

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as { persons?: Array<{ name?: string; role?: string }> };
    const seen = new Set<string>();
    const out: PersonHit[] = [];
    for (const p of parsed.persons ?? []) {
      const name = (p.name ?? '').trim();
      if (!name) continue;
      // Sanity: must contain a space (first + last). Single tokens are too
      // ambiguous and often hallucinated from slug fragments.
      if (!/\s/.test(name)) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      // Skip officer overlap to avoid duplicating the officer hub.
      if (officerLower && (officerLower.includes(key) || key.includes(officerLower))) continue;
      seen.add(key);
      out.push({ label: name, role: normalizeRole(p.role) });
    }
    return out;
  } catch {
    return [];
  }
}

function normalizeRole(role: string | undefined): string | undefined {
  if (!role) return undefined;
  const r = role.toLowerCase();
  if (r === 'suspect' || r === 'witness' || r === 'victim') return r;
  return 'other';
}

function addMatches(
  out: Map<string, ExtractedEntity>,
  corpus: string,
  re: RegExp,
  subkind: string,
): void {
  const seen = new Set<string>();
  for (const m of corpus.matchAll(re)) {
    const raw = m[0].trim();
    const normalized = raw.replace(/\s+/g, ' ');
    if (seen.has(normalized.toLowerCase())) continue;
    seen.add(normalized.toLowerCase());
    const id = `identifier:${subkind}:${slugify(normalized)}`;
    if (!out.has(id)) {
      out.set(id, { id, kind: 'identifier', subkind, label: normalized });
    }
  }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function humanize(s: string): string {
  return s.replace(/_/g, ' ');
}
