import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Loader2, RotateCcw, Search } from 'lucide-react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { getContextGraph, loadContextGraph } from '../../storage/config';
import { EntityNode, GraphNode, MediaClass } from '../../data/types';
import {
  KnowledgeGraphCanvas,
  MEDIA_CLASS_COLORS,
  ENTITY_KIND_COLORS,
  PRIMARY_CASE_COLOR,
  EVIDENCE_COLOR,
  type CaseHub,
  type NodeScreenPosition,
} from './KnowledgeGraphCanvas';
import { agentSearch } from '../../engine/agentSearch';
import { AnimatedPlaceholder, useCyclingPlaceholder } from '../SearchDropdown';
import { HomeOverview, HomeArtifacts } from '../pages/HomePage';

const DOUBLE_CLICK_MS = 280;

type RelatedCase = { caseId: string; sharedEntities: EntityNode[] };

type Tab = 'evidence' | 'agents' | 'artifacts';

type FilterKey = 'media_class' | 'officer' | 'category';

type Filters = Record<FilterKey, Set<string>>;

type DateRange = { from: string; to: string };

const EMPTY_FILTERS: Filters = {
  media_class: new Set(),
  officer: new Set(),
  category: new Set(),
};

const EMPTY_DATE_RANGE: DateRange = { from: '', to: '' };

export function KnowledgeGraphPanel({
  onVisibleEvidenceChange,
  onTabChange,
}: {
  onVisibleEvidenceChange?: (items: GraphNode[]) => void;
  onTabChange?: (tab: Tab) => void;
} = {}) {
  const navigate = useNavigate();
  // Ref so the once-bound event listeners can call the latest onTabChange
  // without re-binding on every render.
  const onTabChangeRef = useRef(onTabChange);
  onTabChangeRef.current = onTabChange;
  const [version, setVersion] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  // When the user hovers a citation in chat, treat it as a transient
  // selection — it overrides the user's clicked selection until the hover
  // ends. Camera also focuses on it via `focusNodeId` on the canvas.
  const [hoveredCitationId, setHoveredCitationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [dateRange, setDateRange] = useState<DateRange>(EMPTY_DATE_RANGE);
  const [activeTab, setActiveTab] = useState<Tab>('agents');
  const [agentMatchedIds, setAgentMatchedIds] = useState<Set<string> | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [fitViewSignal, setFitViewSignal] = useState(0);
  const [selectedNodePos, setSelectedNodePos] = useState<NodeScreenPosition | null>(null);
  const searchVersion = useRef(0);

  const handleReset = useCallback(() => {
    window.location.reload();
  }, []);

  // Load graph on mount and re-read whenever ingestion updates it.
  useEffect(() => {
    let mounted = true;
    loadContextGraph().finally(() => {
      if (!mounted) return;
      setLoaded(true);
      setVersion(v => v + 1);
    });
    const handler = () => setVersion(v => v + 1);
    window.addEventListener('evidenceGraphUpdated', handler);
    const hoverHandler = (e: Event) => {
      const detail = (e as CustomEvent<{ evidenceId: string | null }>).detail;
      setHoveredCitationId(detail?.evidenceId ?? null);
    };
    window.addEventListener('chat:citation-hover', hoverHandler);
    // Explicit "View on graph" click from chat: switch to Investigate, select
    // the node permanently, and use the hover-focus channel briefly to pan
    // the camera. Clearing it after the pan completes leaves the selection
    // alone (it's stored in selectedNodeId, not the transient hover state).
    const focusHandler = (e: Event) => {
      const detail = (e as CustomEvent<{ nodeId: string }>).detail;
      if (!detail?.nodeId) return;
      setActiveTab('evidence');
      onTabChangeRef.current?.('evidence');
      setSelectedNodeId(detail.nodeId);
      setHoveredCitationId(detail.nodeId);
      setTimeout(() => setHoveredCitationId(null), 800);
    };
    window.addEventListener('graph:focus-node', focusHandler);
    return () => {
      mounted = false;
      window.removeEventListener('evidenceGraphUpdated', handler);
      window.removeEventListener('chat:citation-hover', hoverHandler);
      window.removeEventListener('graph:focus-node', focusHandler);
    };
  }, []);

  // While a citation is hovered, the hovered node id wins. The user's actual
  // clicked selection stays in `selectedNodeId` underneath and is restored as
  // soon as the hover ends.
  const effectiveSelectedNodeId = hoveredCitationId ?? selectedNodeId;

  const graph = useMemo(() => getContextGraph(), [version]);

  const nodes = useMemo<GraphNode[]>(() => Object.values(graph.nodes), [graph]);

  const entities = useMemo<EntityNode[]>(
    () => Object.values(graph.entities ?? {}),
    [graph],
  );

  // Case membership is rendered as hub-and-spoke: one synthetic hub node per
  // case, with a spoke to each evidence node in that case. This replaces the
  // dense pairwise same_case mesh.
  const caseHubs = useMemo<CaseHub[]>(() => {
    return Object.entries(graph.cases).map(([caseId, meta]) => ({
      id: `case:${caseId}`,
      kind: 'case_hub' as const,
      title: meta.title || caseId,
      case_id: caseId,
      evidence_count: meta.evidence_ids.length,
    }));
  }, [graph]);

  const canvasNodes = useMemo(
    () => [...caseHubs, ...entities, ...nodes],
    [caseHubs, entities, nodes],
  );

  const visibleLinks = useMemo(() => {
    const caseSpokes = nodes
      .filter(n => n.case_id && graph.cases[n.case_id])
      .map(n => ({ source: `case:${n.case_id}`, target: n.id, relationship: 'case_member' as const }));
    const edgeLinks = graph.edges.map(e => ({ source: e.source, target: e.target, relationship: e.relationship }));
    return [...caseSpokes, ...edgeLinks];
  }, [graph, nodes]);

  const neighborIds = useMemo(() => {
    if (!effectiveSelectedNodeId) return new Set<string>();
    const ids = new Set<string>();
    for (const e of visibleLinks) {
      if (e.source === effectiveSelectedNodeId) ids.add(e.target);
      else if (e.target === effectiveSelectedNodeId) ids.add(e.source);
    }
    return ids;
  }, [effectiveSelectedNodeId, visibleLinks]);

  const filterOptions = useMemo(() => {
    const collect = (pick: (n: GraphNode) => string | undefined) => {
      const set = new Set<string>();
      for (const n of nodes) {
        const v = pick(n);
        if (v) set.add(v);
      }
      return [...set].sort();
    };
    return {
      media_class: collect(n => n.media_class),
      officer:     collect(n => n.officer),
      category:    collect(n => n.category),
    } satisfies Record<FilterKey, string[]>;
  }, [nodes]);

  // Natural-language search via the same agent as the utility bar.
  // For queries < 3 chars, fall back to local substring match for instant feedback.
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 3) {
      setAgentMatchedIds(null);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const version = ++searchVersion.current;
    const t = setTimeout(async () => {
      try {
        const result = await agentSearch(q, undefined, (partial) => {
          if (version !== searchVersion.current) return;
          setAgentMatchedIds(new Set(partial.map(r => r.evidence_id)));
          setIsSearching(false);
        });
        if (version !== searchVersion.current) return;
        setAgentMatchedIds(new Set(result.results.map(r => r.evidence_id)));
      } catch {
        // leave previous results in place
      } finally {
        if (version === searchVersion.current) setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const matchedIds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const hasQuery = q.length > 0;
    const hasFilters = (Object.keys(filters) as FilterKey[]).some(k => filters[k].size > 0);
    const hasDate = dateRange.from !== '' || dateRange.to !== '';
    if (!hasQuery && !hasFilters && !hasDate) return null;
    // Date inputs return YYYY-MM-DD; compare against ISO date_recorded directly as strings.
    const fromBound = dateRange.from || '';
    const toBound = dateRange.to ? `${dateRange.to}T23:59:59.999Z` : '';
    // For longer queries, defer to agentSearch results; for short queries, substring-match.
    const useAgent = q.length >= 3 && agentMatchedIds !== null;
    const ids = new Set<string>();
    for (const n of nodes) {
      if (hasQuery) {
        if (useAgent) {
          if (!agentMatchedIds.has(n.id)) continue;
        } else if (!(n.title.toLowerCase().includes(q) || n.id.toLowerCase().includes(q))) {
          continue;
        }
      }
      if (filters.media_class.size > 0 && !filters.media_class.has(n.media_class)) continue;
      if (filters.officer.size > 0 && !filters.officer.has(n.officer)) continue;
      if (filters.category.size > 0 && !filters.category.has(n.category)) continue;
      if (fromBound && (!n.date_recorded || n.date_recorded < fromBound)) continue;
      if (toBound && (!n.date_recorded || n.date_recorded > toBound)) continue;
      ids.add(n.id);
    }
    // Include entities that reference any matched evidence so they stay visible too.
    for (const ent of entities) {
      if (ent.evidence_ids.some(evId => ids.has(evId))) ids.add(ent.id);
    }
    // Include case hubs whose evidence is in the match set so the hub and its
    // case-member spokes don't fade out alongside the matched evidence.
    const matchedCaseIds = new Set<string>();
    for (const n of nodes) {
      if (ids.has(n.id) && n.case_id && graph.cases[n.case_id]) {
        matchedCaseIds.add(n.case_id);
      }
    }
    for (const caseId of matchedCaseIds) ids.add(`case:${caseId}`);
    return ids;
  }, [nodes, entities, graph, searchQuery, agentMatchedIds, filters, dateRange]);

  // Emit currently-visible evidence (matched by the graph's search/filters)
  // so the home chat can scope its context to what the user is exploring.
  // When matchedIds is null, no scope is active — emit empty so the assistant
  // requires the user to search/filter first.
  useEffect(() => {
    if (!onVisibleEvidenceChange) return;
    if (matchedIds === null) {
      onVisibleEvidenceChange([]);
      return;
    }
    onVisibleEvidenceChange(nodes.filter(n => matchedIds.has(n.id)));
  }, [matchedIds, nodes, onVisibleEvidenceChange]);

  const toggleFilterValue = useCallback((key: FilterKey, value: string) => {
    setFilters(prev => {
      const next = new Set(prev[key]);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return { ...prev, [key]: next };
    });
  }, []);

  const clearFilter = useCallback((key: FilterKey) => {
    setFilters(prev => ({ ...prev, [key]: new Set() }));
  }, []);

  // Single click selects; second click within DOUBLE_CLICK_MS opens detail
  // (evidence only — entities and case hubs have no detail page).
  const lastClickRef = useRef<{ id: string; at: number } | null>(null);
  const handleNodeClick = useCallback((node: GraphNode | EntityNode | CaseHub) => {
    const now = Date.now();
    const last = lastClickRef.current;
    const isEvidence = !!(node as GraphNode).media_class;
    if (isEvidence && last && last.id === node.id && now - last.at < DOUBLE_CLICK_MS) {
      lastClickRef.current = null;
      navigate(`/evidence/item/${encodeURIComponent(node.id)}`);
      return;
    }
    lastClickRef.current = { id: node.id, at: now };
    setSelectedNodeId(node.id);
  }, [navigate]);

  const handleBackgroundClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const selectedNode = effectiveSelectedNodeId ? graph.nodes[effectiveSelectedNodeId] : null;
  const selectedEntity = effectiveSelectedNodeId ? (graph.entities ?? {})[effectiveSelectedNodeId] : null;
  const selectedCaseHub = useMemo(() => {
    if (!effectiveSelectedNodeId || !effectiveSelectedNodeId.startsWith('case:')) return null;
    return caseHubs.find(h => h.id === effectiveSelectedNodeId) ?? null;
  }, [effectiveSelectedNodeId, caseHubs]);

  // For a selected case, find every other case that shares at least one entity
  // (person / officer / location / object / identifier). The shared entity is
  // what visually bridges the two cases on the graph, so it's the right thing
  // to surface in the overlay.
  const relatedCases = useMemo(() => {
    if (!selectedCaseHub) return [] as RelatedCase[];
    const thisCaseId = selectedCaseHub.case_id;
    const evidenceInCase = (graph.cases[thisCaseId]?.evidence_ids ?? []);
    const evidenceSet = new Set(evidenceInCase);
    const byOtherCase = new Map<string, EntityNode[]>();
    for (const ent of entities) {
      const touchesThis = ent.evidence_ids.some(id => evidenceSet.has(id));
      if (!touchesThis) continue;
      const otherCases = new Set<string>();
      for (const evId of ent.evidence_ids) {
        const ev = graph.nodes[evId];
        if (!ev || ev.case_id === thisCaseId) continue;
        if (graph.cases[ev.case_id]) otherCases.add(ev.case_id);
      }
      for (const other of otherCases) {
        const list = byOtherCase.get(other) ?? [];
        list.push(ent);
        byOtherCase.set(other, list);
      }
    }
    return [...byOtherCase.entries()]
      .map(([caseId, ents]) => ({ caseId, sharedEntities: ents }))
      .sort((a, b) => b.sharedEntities.length - a.sharedEntities.length);
  }, [selectedCaseHub, entities, graph]);

  return (
    <div
      style={{
        flex: '1 1 auto',
        minWidth: 0,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Top rail — matches ChatDrawer header height (64px) and border */}
      <div
        style={{
          height: 64,
          flexShrink: 0,
          padding: '0 20px',
          borderBottom: '1px solid var(--border)',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'flex-end',
          gap: 4,
        }}
      >
        <TabButton
          label="Dashboard"
          active={activeTab === 'agents'}
          onClick={() => { setActiveTab('agents'); onTabChange?.('agents'); }}
        />
        <TabButton
          label="Investigate"
          active={activeTab === 'evidence'}
          onClick={() => { setActiveTab('evidence'); onTabChange?.('evidence'); }}
        />
        <TabButton
          label="Artifacts"
          active={activeTab === 'artifacts'}
          onClick={() => { setActiveTab('artifacts'); onTabChange?.('artifacts'); }}
        />
      </div>

      {/* Tab content */}
      <div style={{ position: 'relative', flex: '1 1 auto', minHeight: 0 }}>
        {activeTab === 'evidence' ? (
          <>
            {loaded && nodes.length > 0 ? (
              <KnowledgeGraphCanvas
                nodes={canvasNodes}
                links={visibleLinks}
                selectedNodeId={effectiveSelectedNodeId}
                neighborIds={neighborIds}
                matchedIds={matchedIds}
                onNodeClick={handleNodeClick}
                onBackgroundClick={handleBackgroundClick}
                onSelectedNodePosition={setSelectedNodePos}
                fitViewSignal={fitViewSignal}
                focusNodeId={hoveredCitationId}
              />
            ) : (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)', fontSize: 13 }}>
                {loaded ? 'No evidence in the graph yet.' : 'Loading graph…'}
              </div>
            )}

            <SearchOverlay
              value={searchQuery}
              onChange={setSearchQuery}
              isSearching={isSearching}
              matchCount={matchedIds?.size}
              filters={filters}
              filterOptions={filterOptions}
              onToggleFilter={toggleFilterValue}
              onClearFilter={clearFilter}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              onReset={handleReset}
            />

            {selectedNode && (
              <NodeInfoOverlay
                node={selectedNode}
                onOpen={() => navigate(`/evidence/item/${encodeURIComponent(selectedNode.id)}`)}
                onClose={() => setSelectedNodeId(null)}
              />
            )}

            {selectedEntity && !selectedNode && (
              <EntityInfoOverlay
                entity={selectedEntity}
                anchor={selectedNodePos}
                evidenceTitles={selectedEntity.evidence_ids
                  .map(id => graph.nodes[id])
                  .filter(Boolean)
                  .slice(0, 8)}
                onOpenEvidence={(id) => navigate(`/evidence/item/${encodeURIComponent(id)}`)}
                onClose={() => setSelectedNodeId(null)}
              />
            )}

            {selectedCaseHub && !selectedNode && !selectedEntity && (
              <CaseInfoOverlay
                hub={selectedCaseHub}
                anchor={selectedNodePos}
                leadOfficer={graph.cases[selectedCaseHub.case_id]?.lead_officer}
                status={graph.cases[selectedCaseHub.case_id]?.status}
                relatedCases={relatedCases}
                onSelectEntity={(id) => setSelectedNodeId(id)}
                onSelectCase={(caseId) => setSelectedNodeId(`case:${caseId}`)}
                onClose={() => setSelectedNodeId(null)}
              />
            )}

            <Legend />
          </>
        ) : activeTab === 'artifacts' ? (
          <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '24px 20px 32px' }}>
            <HomeArtifacts />
          </div>
        ) : (
          <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '24px 20px 32px' }}>
            <HomeOverview />
          </div>
        )}

      </div>
    </div>
  );
}

const OVERLAY_WIDTH = 300;
const OVERLAY_GAP = 14;

function overlayPositionStyle(anchor: NodeScreenPosition | null | undefined, containerWidth?: number): React.CSSProperties {
  // Fallback: top-right of the panel if we don't yet know the node's screen position.
  if (!anchor) return { top: 12, right: 12 };
  const offset = (anchor.radius || 9) + OVERLAY_GAP;
  // Default: card sits to the right of the node. Flip to the left if the right
  // edge would clip the panel (rough heuristic — uses parent width when known).
  const placeRight = !containerWidth || anchor.x + offset + OVERLAY_WIDTH < containerWidth - 12;
  const left = placeRight ? anchor.x + offset : Math.max(12, anchor.x - offset - OVERLAY_WIDTH);
  return { left, top: Math.max(12, anchor.y - 24) };
}

function NodeInfoOverlay({
  node,
  onOpen,
  onClose,
}: {
  node: GraphNode;
  onOpen: () => void;
  onClose: () => void;
}) {
  const isImage = node.media_class === 'image' || (node.mime_type ?? '').startsWith('image/');
  const isDoc = node.media_class === 'pdf' || node.media_class === 'document' || node.media_class === 'text';
  const previewUrl = node.thumbnailUrl || node.fileUrl;
  return (
    <div
      style={{
        position: 'absolute',
        left: 16,
        bottom: 16,
        width: OVERLAY_WIDTH,
        background: '#ffffff',
        border: '1px solid var(--border)',
        borderRadius: 10,
        boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
        fontSize: 12,
        color: 'var(--text-strong)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {isImage && previewUrl && (
        <img
          src={previewUrl}
          alt={node.title}
          style={{
            width: '100%',
            height: 168,
            objectFit: 'cover',
            display: 'block',
            background: 'var(--fill-weaker)',
          }}
        />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: MEDIA_CLASS_COLORS[node.media_class as MediaClass] ?? '#888888',
              marginTop: 4,
              flexShrink: 0,
            }}
          />
          <div style={{ fontWeight: 600, lineHeight: 1.3, flex: 1, wordBreak: 'break-word' }}>{node.title}</div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', padding: 0, fontSize: 16, lineHeight: 1 }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {isDoc && node.description && (
          <div
            style={{
              fontSize: 11,
              lineHeight: 1.45,
              color: 'var(--muted-foreground)',
              display: '-webkit-box',
              WebkitLineClamp: 5,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {node.description}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {node.media_class && <Chip>{node.media_class}</Chip>}
          {node.category && <Chip>{node.category}</Chip>}
          {node.officer && <Chip>{node.officer}</Chip>}
          {node.case_id && <Chip>{node.case_id}</Chip>}
          {node.date_recorded && <Chip>{formatDateChip(node.date_recorded)}</Chip>}
        </div>

        <button
          onClick={onOpen}
          style={{
            marginTop: 2,
            padding: '6px 10px',
            fontSize: 12,
            fontWeight: 500,
            color: '#ffffff',
            background: 'var(--text-strong)',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Open evidence →
        </button>
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 99,
        background: 'var(--fill-weaker)',
        color: 'var(--text-strong)',
        fontSize: 10.5,
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
        border: '1px solid var(--border)',
      }}
    >
      {children}
    </span>
  );
}

function formatDateChip(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function EntityInfoOverlay({
  entity,
  anchor,
  evidenceTitles,
  onOpenEvidence,
  onClose,
}: {
  entity: EntityNode;
  anchor: NodeScreenPosition | null;
  evidenceTitles: GraphNode[];
  onOpenEvidence: (id: string) => void;
  onClose: () => void;
}) {
  const KIND_LABEL: Record<EntityNode['kind'], string> = {
    officer: 'Officer',
    object: 'Object',
    location: 'Location',
    identifier: 'Identifier',
    person: 'Person',
  };
  const color = ENTITY_KIND_COLORS[entity.kind];
  return (
    <div
      style={{
        position: 'absolute',
        left: 16,
        bottom: 16,
        width: OVERLAY_WIDTH,
        background: '#ffffff',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '12px 14px',
        boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
        fontSize: 12,
        color: 'var(--text-strong)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span
          style={{
            display: 'inline-block',
            width: 10,
            height: 10,
            borderRadius: 2,
            background: color,
            marginTop: 4,
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {KIND_LABEL[entity.kind]}{entity.subkind ? ` · ${entity.subkind.replace('_', ' ')}` : ''}
          </div>
          <div style={{ fontWeight: 600, lineHeight: 1.3 }}>{entity.label}</div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', padding: 0, fontSize: 16, lineHeight: 1 }}
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
        Appears in {entity.evidence_ids.length} {entity.evidence_ids.length === 1 ? 'item' : 'items'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {evidenceTitles.map(ev => (
          <button
            key={ev.id}
            onClick={() => onOpenEvidence(ev.id)}
            style={{
              textAlign: 'left',
              background: 'none',
              border: 'none',
              padding: '4px 6px',
              borderRadius: 4,
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-strong)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {ev.title}
            </span>
            {ev.case_id && (
              <span
                style={{
                  fontSize: 10,
                  color: 'var(--muted-foreground)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {ev.case_id}
              </span>
            )}
          </button>
        ))}
        {entity.evidence_ids.length > evidenceTitles.length && (
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)', padding: '4px 6px' }}>
            +{entity.evidence_ids.length - evidenceTitles.length} more
          </div>
        )}
      </div>
    </div>
  );
}

function CaseInfoOverlay({
  hub,
  anchor,
  leadOfficer,
  status,
  relatedCases,
  onSelectEntity,
  onSelectCase,
  onClose,
}: {
  hub: CaseHub;
  anchor: NodeScreenPosition | null;
  leadOfficer?: string;
  status?: string;
  relatedCases: RelatedCase[];
  onSelectEntity: (id: string) => void;
  onSelectCase: (caseId: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: 16,
        bottom: 16,
        width: OVERLAY_WIDTH,
        background: '#ffffff',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '12px 14px',
        boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
        fontSize: 12,
        color: 'var(--text-strong)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span
          style={{
            display: 'inline-block',
            width: 10,
            height: 10,
            borderRadius: 2,
            background: PRIMARY_CASE_COLOR,
            marginTop: 4,
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Case{status ? ` · ${status}` : ''}
          </div>
          <div style={{ fontWeight: 600, lineHeight: 1.3 }}>{hub.case_id}</div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', padding: 0, fontSize: 16, lineHeight: 1 }}
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted-foreground)', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div>{hub.evidence_count} {hub.evidence_count === 1 ? 'evidence item' : 'evidence items'}</div>
        {leadOfficer && <div>Lead: {leadOfficer}</div>}
      </div>
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
        <div style={{ fontSize: 10, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
          {relatedCases.length === 0 ? 'No related cases' : `Related cases (${relatedCases.length})`}
        </div>
        {relatedCases.length === 0 && (
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
            No shared entities link this case to another.
          </div>
        )}
        {relatedCases.map(rc => (
          <div key={rc.caseId} style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingBottom: 8 }}>
            <button
              onClick={() => onSelectCase(rc.caseId)}
              style={{
                textAlign: 'left',
                background: 'none',
                border: 'none',
                padding: '2px 0',
                fontSize: 12,
                fontWeight: 600,
                color: '#0088E9',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {rc.caseId}
            </button>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {rc.sharedEntities.map(ent => (
                <button
                  key={ent.id}
                  onClick={() => onSelectEntity(ent.id)}
                  title={ent.kind}
                  style={{
                    background: 'rgba(0,0,0,0.04)',
                    border: '1px solid var(--border)',
                    borderRadius: 999,
                    padding: '2px 8px',
                    fontSize: 10,
                    color: 'var(--text-strong)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: ENTITY_KIND_COLORS[ent.kind],
                    }}
                  />
                  {ent.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const LEGEND_ITEMS: { color: string; label: string }[] = [
  { color: EVIDENCE_COLOR,                label: 'Evidence' },
  { color: PRIMARY_CASE_COLOR,            label: 'Case' },
  { color: ENTITY_KIND_COLORS.officer,    label: 'Officer' },
  { color: ENTITY_KIND_COLORS.person,     label: 'Person' },
  { color: ENTITY_KIND_COLORS.object,     label: 'Object' },
  { color: ENTITY_KIND_COLORS.location,   label: 'Location' },
  { color: ENTITY_KIND_COLORS.identifier, label: 'Identifier' },
];

function Legend() {
  return (
    <div
      style={{
        position: 'absolute',
        right: 16,
        bottom: 16,
        display: 'flex',
        flexDirection: 'row',
        gap: 6,
        pointerEvents: 'none',
      }}
    >
      {LEGEND_ITEMS.map(item => (
        <div
          key={item.label}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 99,
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid var(--border)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            fontSize: 11,
            lineHeight: 1.2,
            color: 'var(--text-strong)',
            whiteSpace: 'nowrap',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: item.color,
              flexShrink: 0,
            }}
          />
          {item.label}
        </div>
      ))}
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        background: 'none',
        border: 'none',
        padding: '0 16px',
        height: 44,
        fontSize: 16,
        fontWeight: active ? 600 : 500,
        color: active ? 'var(--text-strong)' : 'var(--muted-foreground)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        marginBottom: -1,
        borderBottom: `2px solid ${active ? 'var(--text-strong)' : 'transparent'}`,
      }}
    >
      {label}
    </button>
  );
}


const FILTER_LABELS: Record<FilterKey, string> = {
  media_class: 'Type',
  officer:     'Officer',
  category:    'Category',
};

function SearchOverlay({
  value,
  onChange,
  isSearching,
  matchCount,
  filters,
  filterOptions,
  onToggleFilter,
  onClearFilter,
  dateRange,
  onDateRangeChange,
  onReset,
}: {
  value: string;
  onChange: (v: string) => void;
  isSearching: boolean;
  matchCount: number | undefined;
  filters: Filters;
  filterOptions: Record<FilterKey, string[]>;
  onToggleFilter: (key: FilterKey, value: string) => void;
  onClearFilter: (key: FilterKey) => void;
  dateRange: DateRange;
  onDateRangeChange: (r: DateRange) => void;
  onReset: () => void;
}) {
  const cyclingPlaceholder = useCyclingPlaceholder(!value);
  return (
    <div
      style={{
        position: 'absolute',
        top: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(820px, calc(100% - 48px))',
        background: 'rgba(255, 255, 255, 0.45)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        border: '1px solid rgba(255, 255, 255, 0.55)',
        borderRadius: 18,
        padding: 12,
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.10)',
      }}
    >
      <form
        onSubmit={(e) => e.preventDefault()}
        style={{
          position: 'relative',
          background: 'rgba(255, 255, 255, 0.85)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Search size={16} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
        {!value && (
          <AnimatedPlaceholder
            text={cyclingPlaceholder}
            left={40}
            right={14}
            fontSize={14}
            color="var(--muted-foreground)"
          />
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder=""
          style={{
            flex: 1,
            minWidth: 0,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 14,
            color: 'var(--text-strong)',
            fontFamily: 'inherit',
          }}
        />
        {isSearching && (
          <Loader2 size={13} style={{ color: 'var(--muted-foreground)', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
        )}
        {value && (
          <>
            {!isSearching && matchCount !== undefined && (
              <span style={{ fontSize: 11, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
                {matchCount} {matchCount === 1 ? 'match' : 'matches'}
              </span>
            )}
            <button
              type="button"
              onClick={() => onChange('')}
              style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', padding: 0, fontSize: 16, lineHeight: 1 }}
              aria-label="Clear"
            >
              ×
            </button>
          </>
        )}
      </form>

      {/* Filter chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '0 2px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flex: 1, minWidth: 0 }}>
          <FilterChipDropdown
            key="media_class"
            label={FILTER_LABELS.media_class}
            options={filterOptions.media_class}
            selected={filters.media_class}
            onToggle={(v) => onToggleFilter('media_class', v)}
            onClear={() => onClearFilter('media_class')}
          />
          <DateRangeChipDropdown
            value={dateRange}
            onChange={onDateRangeChange}
          />
          <FilterChipDropdown
            key="officer"
            label={FILTER_LABELS.officer}
            options={filterOptions.officer}
            selected={filters.officer}
            onToggle={(v) => onToggleFilter('officer', v)}
            onClear={() => onClearFilter('officer')}
          />
          <FilterChipDropdown
            key="category"
            label={FILTER_LABELS.category}
            options={filterOptions.category}
            selected={filters.category}
            onToggle={(v) => onToggleFilter('category', v)}
            onClear={() => onClearFilter('category')}
          />
        </div>
        <button
          type="button"
          onClick={onReset}
          aria-label="Reset graph"
          title="Reset graph"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 99,
            border: '1px solid var(--border)',
            background: 'rgba(255,255,255,0.85)',
            color: 'var(--foreground)',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'background 0.12s',
          }}
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
}

function FilterChipDropdown({
  label,
  options,
  selected,
  onToggle,
  onClear,
}: {
  label: string;
  options: string[];
  selected: Set<string>;
  onToggle: (value: string) => void;
  onClear: () => void;
}) {
  const active = selected.size > 0;
  const summary = active
    ? selected.size === 1
      ? truncateLabel([...selected][0], 24)
      : `${selected.size} selected`
    : label;
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px 4px 12px',
            borderRadius: 99,
            cursor: 'pointer',
            fontSize: 12,
            lineHeight: 1.2,
            fontWeight: active ? 600 : 500,
            border: `1px solid ${active ? 'transparent' : 'var(--border)'}`,
            backgroundColor: active ? 'var(--foreground)' : 'rgba(255,255,255,0.85)',
            color: active ? 'var(--raised)' : 'var(--foreground)',
            transition: 'all 0.12s',
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
          }}
        >
          {active && <span style={{ fontSize: 'inherit', fontWeight: 700, lineHeight: 'inherit' }}>{label}:</span>}
          <span style={{ fontSize: 'inherit', lineHeight: 'inherit' }}>{summary}</span>
          <ChevronDown size={13} style={{ opacity: 0.7 }} />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align="start"
        sideOffset={6}
        style={{
          width: 240,
          padding: 0,
          maxHeight: 320,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          fontSize: 12,
          fontFamily: 'inherit',
          color: 'var(--text-strong)',
          background: '#ffffff',
          border: '1px solid var(--border)',
          borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.10)',
          zIndex: 50,
          outline: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-strong)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
          {active && (
            <button
              type="button"
              onClick={onClear}
              style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', padding: 0, fontSize: 11, fontFamily: 'inherit' }}
            >
              Clear
            </button>
          )}
        </div>
        <div style={{ overflowY: 'auto', padding: 4 }}>
          {options.length === 0 && (
            <div style={{ padding: 12, fontSize: 12, color: 'var(--muted-foreground)' }}>No values</div>
          )}
          {options.map(opt => {
            const isOn = selected.has(opt);
            return (
              <label
                key={opt}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '5px 8px',
                  borderRadius: 5,
                  fontSize: 12,
                  lineHeight: 1.3,
                  color: 'var(--text-strong)',
                  cursor: 'pointer',
                  background: isOn ? 'var(--fill-weaker)' : 'transparent',
                }}
              >
                <input
                  type="checkbox"
                  checked={isOn}
                  onChange={() => onToggle(opt)}
                  style={{ margin: 0, width: 12, height: 12, cursor: 'pointer', flexShrink: 0 }}
                />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'inherit', lineHeight: 'inherit' }}>
                  {truncateLabel(opt, 32)}
                </span>
              </label>
            );
          })}
        </div>
      </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

function truncateLabel(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

function DateRangeChipDropdown({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (r: DateRange) => void;
}) {
  const active = value.from !== '' || value.to !== '';
  const summary = active
    ? `${formatShortDate(value.from)} → ${formatShortDate(value.to)}`
    : 'Date range';
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px 4px 12px',
            borderRadius: 99,
            cursor: 'pointer',
            fontSize: 12,
            lineHeight: 1.2,
            fontWeight: active ? 600 : 500,
            border: `1px solid ${active ? 'transparent' : 'var(--border)'}`,
            backgroundColor: active ? 'var(--foreground)' : 'rgba(255,255,255,0.85)',
            color: active ? 'var(--raised)' : 'var(--foreground)',
            transition: 'all 0.12s',
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
          }}
        >
          {active && <span style={{ fontSize: 'inherit', fontWeight: 700, lineHeight: 'inherit' }}>Date:</span>}
          <span style={{ fontSize: 'inherit', lineHeight: 'inherit' }}>{summary}</span>
          <ChevronDown size={13} style={{ opacity: 0.7 }} />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          style={{
            width: 260,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            fontSize: 12,
            fontFamily: 'inherit',
            color: 'var(--text-strong)',
            background: '#ffffff',
            border: '1px solid var(--border)',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.10)',
            zIndex: 50,
            outline: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-strong)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date range</span>
            {active && (
              <button
                type="button"
                onClick={() => onChange({ from: '', to: '' })}
                style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', padding: 0, fontSize: 11, fontFamily: 'inherit' }}
              >
                Clear
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }}>
            <DateField
              label="From"
              value={value.from}
              max={value.to || undefined}
              onChange={(v) => onChange({ ...value, from: v })}
            />
            <DateField
              label="To"
              value={value.to}
              min={value.from || undefined}
              onChange={(v) => onChange({ ...value, to: v })}
            />
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

function DateField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--muted-foreground)' }}>
      <span style={{ fontSize: 11, lineHeight: 1.2 }}>{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        style={{
          fontSize: 13,
          padding: '6px 8px',
          border: '1px solid var(--border)',
          borderRadius: 6,
          background: '#ffffff',
          color: 'var(--text-strong)',
          fontFamily: 'inherit',
          outline: 'none',
          width: '100%',
          boxSizing: 'border-box',
        }}
      />
    </label>
  );
}

function formatShortDate(iso: string): string {
  if (!iso) return '…';
  // iso is YYYY-MM-DD from <input type="date">
  const [, m, d] = iso.split('-');
  return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
}

