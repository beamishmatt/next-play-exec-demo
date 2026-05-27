#!/usr/bin/env node
// Rebuilds edges in src/data/contextGraph.json using the per-node cap rules
// from src/ingestion/graphBuilder.ts (MAX_EDGES_PER_NODE, RELATIONSHIP_WEIGHT,
// same_case > same_officer > same_date, ties broken by date proximity).
// Run via `node scripts/reprune-graph.mjs`.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GRAPH_PATH = join(__dirname, '..', 'src', 'data', 'contextGraph.json');

const MAX_EDGES_PER_NODE = 6;
const RELATIONSHIP_WEIGHT = { same_case: 3, same_officer: 2, same_date: 1, referenced_in: 0 };
const DAY_MS = 24 * 60 * 60 * 1000;

const graph = JSON.parse(readFileSync(GRAPH_PATH, 'utf8'));
const nodes = Object.values(graph.nodes);
const oldEdgeCount = graph.edges.length;

// Order nodes by ingest time so the pruning is deterministic and mirrors
// what the live builder would produce.
nodes.sort((a, b) => new Date(a.date_ingested).getTime() - new Date(b.date_ingested).getTime());

const edges = [];
const edgeCount = new Map();

function incr(id) {
  edgeCount.set(id, (edgeCount.get(id) ?? 0) + 1);
}

for (let i = 0; i < nodes.length; i++) {
  const node = nodes[i];
  const candidates = [];

  for (let j = 0; j < i; j++) {
    const other = nodes[j];
    // Same-case membership is rendered via a case-hub node and spoke edges.
    if (other.case_id && other.case_id === node.case_id) continue;

    let relationship = null;
    let metadata = {};

    if (other.officer && other.officer === node.officer) {
      relationship = 'same_officer';
      metadata = { officer: node.officer };
    } else if (node.date_recorded && other.date_recorded) {
      const diff = Math.abs(
        new Date(node.date_recorded).getTime() - new Date(other.date_recorded).getTime()
      );
      if (diff <= DAY_MS) {
        relationship = 'same_date';
        metadata = { date: node.date_recorded };
      }
    }

    if (!relationship) continue;

    const dateDistance =
      node.date_recorded && other.date_recorded
        ? Math.abs(
            new Date(node.date_recorded).getTime() - new Date(other.date_recorded).getTime()
          )
        : Number.POSITIVE_INFINITY;

    candidates.push({ otherId: other.id, relationship, metadata, weight: RELATIONSHIP_WEIGHT[relationship], dateDistance });
  }

  candidates.sort((a, b) => b.weight - a.weight || a.dateDistance - b.dateDistance);

  let added = 0;
  for (const c of candidates) {
    if (added >= MAX_EDGES_PER_NODE) break;
    if ((edgeCount.get(c.otherId) ?? 0) >= MAX_EDGES_PER_NODE) continue;
    edges.push({ source: node.id, target: c.otherId, relationship: c.relationship, metadata: c.metadata });
    incr(node.id);
    incr(c.otherId);
    added++;
  }
}

const byRel = {};
for (const e of edges) byRel[e.relationship] = (byRel[e.relationship] ?? 0) + 1;

graph.edges = edges;
graph.metadata = { ...graph.metadata, last_updated: new Date().toISOString() };

writeFileSync(GRAPH_PATH, JSON.stringify(graph, null, 2) + '\n');

console.log(`[reprune-graph] ${nodes.length} nodes`);
console.log(`[reprune-graph] edges: ${oldEdgeCount} -> ${edges.length}`);
console.log('[reprune-graph] by relationship:', byRel);
