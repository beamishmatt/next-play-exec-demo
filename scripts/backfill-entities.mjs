#!/usr/bin/env node
// Walks src/data/contextGraph.json, extracts entities (officer/object/location/identifier/person)
// from each evidence node, writes them into graph.entities, and adds referenced_in edges
// entity → evidence. Also strips legacy same_officer edges (now superseded by officer-hub).
// Run via `node scripts/backfill-entities.mjs`. Mirrors src/ingestion/entityExtractor.ts.
//
// Persons (suspects/witnesses/victims) are extracted via OpenAI gpt-4o-mini when
// OPENAI_API_KEY is set. Without a key, person extraction is skipped silently.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GRAPH_PATH = join(__dirname, '..', 'src', 'data', 'contextGraph.json');

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
const PLATE_RE = /\b(?:[A-Z]{3}[-\s]?\d{3,4}|\d{3}[-\s]?[A-Z]{3})\b/g;

function slugify(s) {
  return s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
}
function humanize(s) {
  return s.replace(/_/g, ' ');
}

function addMatches(out, corpus, re, subkind) {
  const seen = new Set();
  for (const m of corpus.matchAll(re)) {
    const raw = m[0].trim().replace(/\s+/g, ' ');
    if (seen.has(raw.toLowerCase())) continue;
    seen.add(raw.toLowerCase());
    const id = `identifier:${subkind}:${slugify(raw)}`;
    if (!out.has(id)) out.set(id, { id, kind: 'identifier', label: raw, subkind });
  }
}

async function extractEntities(node) {
  const out = new Map();

  if (node.officer) {
    const id = `officer:${slugify(node.officer)}`;
    out.set(id, { id, kind: 'officer', label: node.officer });
  }

  for (const obj of node.objects_detected ?? []) {
    const label = humanize(obj.label);
    const id = `object:${slugify(label)}`;
    if (!out.has(id)) out.set(id, { id, kind: 'object', label });
  }

  const corpus = [node.description ?? '', node.text_visible ?? '', node.title ?? '']
    .filter(Boolean)
    .join('\n');

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

  if (corpus) {
    addMatches(out, corpus, CASE_NUMBER_RE, 'case_number');
    addMatches(out, corpus, PHONE_RE, 'phone');
    addMatches(out, corpus, ADDRESS_RE, 'address');
    addMatches(out, corpus, PLATE_RE, 'license_plate');
  }

  for (const person of await extractPersonsLLM(node)) {
    const id = `person:${slugify(person.label)}`;
    if (!out.has(id)) {
      out.set(id, { id, kind: 'person', label: person.label, ...(person.role ? { subkind: person.role } : {}) });
    }
  }

  return [...out.values()];
}

const HAS_KEY = !!process.env.OPENAI_API_KEY;
if (!HAS_KEY) {
  console.warn('[backfill-entities] OPENAI_API_KEY not set — person extraction skipped.');
}

async function extractPersonsLLM(node) {
  if (!HAS_KEY) return [];
  const contextLines = [
    node.title ? `Title: ${node.title}` : null,
    node.description ? `Description: ${node.description}` : null,
    node.text_visible ? `Visible text: ${node.text_visible}` : null,
  ].filter(Boolean).join('\n');
  if (!contextLines) return [];

  const body = {
    model: 'gpt-4o-mini',
    temperature: 0,
    max_tokens: 200,
    messages: [
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
  };

  let raw = '';
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    raw = json.choices?.[0]?.message?.content ?? '';
  } catch {
    return [];
  }

  if (!raw) return [];

  const officerLower = (node.officer ?? '').toLowerCase();
  try {
    const parsed = JSON.parse(raw);
    const seen = new Set();
    const out = [];
    for (const p of parsed.persons ?? []) {
      const name = (p.name ?? '').trim();
      if (!name || !/\s/.test(name)) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      if (officerLower && (officerLower.includes(key) || key.includes(officerLower))) continue;
      seen.add(key);
      const role = (p.role ?? '').toLowerCase();
      const normalizedRole = role === 'suspect' || role === 'witness' || role === 'victim'
        ? role
        : (role ? 'other' : undefined);
      out.push({ label: name, role: normalizedRole });
    }
    return out;
  } catch {
    return [];
  }
}

const graph = JSON.parse(readFileSync(GRAPH_PATH, 'utf8'));
graph.entities = {};

// Drop legacy same_officer edges; preserve other relationships.
const oldEdgeCount = graph.edges.length;
graph.edges = graph.edges.filter(e => e.relationship !== 'same_officer' && e.relationship !== 'referenced_in');
const droppedEdges = oldEdgeCount - graph.edges.length;

const byKind = {};
const nodes = Object.values(graph.nodes);
for (let i = 0; i < nodes.length; i++) {
  const node = nodes[i];
  if (HAS_KEY) process.stdout.write(`\r[backfill-entities] extracting ${i + 1}/${nodes.length}…`);
  for (const ent of await extractEntities(node)) {
    const existing = graph.entities[ent.id];
    if (existing) {
      if (!existing.evidence_ids.includes(node.id)) existing.evidence_ids.push(node.id);
    } else {
      graph.entities[ent.id] = {
        id: ent.id,
        kind: ent.kind,
        label: ent.label,
        ...(ent.subkind ? { subkind: ent.subkind } : {}),
        evidence_ids: [node.id],
      };
      byKind[ent.kind] = (byKind[ent.kind] ?? 0) + 1;
    }
    graph.edges.push({
      source: ent.id,
      target: node.id,
      relationship: 'referenced_in',
      metadata: { entity_kind: ent.kind },
    });
  }
}
if (HAS_KEY) process.stdout.write('\n');

// ── Surname resolution pass ───────────────────────────────────────────────────
// Some evidence references a suspect by surname only (e.g. "interview-mccall")
// and the LLM correctly refused to invent a first name. Attach those references
// to existing full-name person hubs when the surname is unique among persons.
const personHubs = Object.values(graph.entities).filter(e => e.kind === 'person');
const surnameToHub = new Map();
for (const hub of personHubs) {
  const parts = hub.label.trim().split(/\s+/);
  const surname = parts[parts.length - 1].toLowerCase();
  if (surname.length < 4) continue; // skip ambiguous short tokens
  if (surnameToHub.has(surname)) surnameToHub.set(surname, null); // ambiguous
  else surnameToHub.set(surname, hub);
}
let surnameAttachments = 0;
for (const node of Object.values(graph.nodes)) {
  const haystack = [node.title ?? '', node.description ?? '', node.text_visible ?? '']
    .join(' ').toLowerCase();
  for (const [surname, hub] of surnameToHub) {
    if (!hub) continue;
    if (!new RegExp(`(^|[^a-z])${surname}([^a-z]|$)`).test(haystack)) continue;
    if (hub.evidence_ids.includes(node.id)) continue;
    hub.evidence_ids.push(node.id);
    graph.edges.push({
      source: hub.id,
      target: node.id,
      relationship: 'referenced_in',
      metadata: { entity_kind: 'person', via: 'surname' },
    });
    surnameAttachments++;
  }
}

graph.metadata = { ...graph.metadata, last_updated: new Date().toISOString() };

writeFileSync(GRAPH_PATH, JSON.stringify(graph, null, 2) + '\n');

if (surnameAttachments > 0) console.log(`[backfill-entities] surname pass attached ${surnameAttachments} extra evidence link(s)`);

console.log(`[backfill-entities] ${Object.keys(graph.entities).length} entities created`);
console.log('[backfill-entities] by kind:', byKind);
console.log(`[backfill-entities] dropped ${droppedEdges} legacy same_officer/referenced_in edges`);
console.log(`[backfill-entities] total edges now: ${graph.edges.length}`);
