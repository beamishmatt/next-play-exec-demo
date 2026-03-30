# Search 2.0 Takeover — Agentic Evidence Search Prototype

A high-fidelity prototype demonstrating agentic search and AI-assisted investigation over law enforcement evidence. The search UI is a full-screen command palette ("takeover") that runs a 4-step AI pipeline on every query to retrieve, scope, and synthesize results from an evidence vector store.


---

## Stack

| Layer | Technology |
|---|---|
| Framework | Vite 6 + React 18 + TypeScript (SWC) |
| Styling | Tailwind CSS v4 + custom CSS design tokens |
| Components | shadcn/ui + Radix UI primitives |
| AI / LLM | OpenAI GPT-4o + GPT-4o-mini |
| Vector search | OpenAI Vector Stores (Files API) |
| State | React local state + localStorage (graph + IDs) |
| Markdown | react-markdown + remark-gfm |

---

## Features

### Agentic Search Pipeline (`src/engine/`)

Every search query runs through a 4-step agentic pipeline:

```
Query → [1] Analysis → [2] Graph Scope → [3] Vector Retrieval → [4] Synthesis → Results
```

**Step 1 — Query Analysis** (`queryAnalysis.ts`)
- Parses natural language into structured intent using `gpt-4o-mini`
- Extracts entities: case IDs, officer names, date ranges, evidence types, locations, detected objects, categories
- Classifies intent: `lookup | investigation | comparison | timeline | relationship | object_search`
- Reformulates the query for optimal vector search
- Falls back to regex keyword parsing if the API is unavailable
- Produces auto-extracted filter chips displayed below the search bar

**Step 2 — Graph Scope** (`graphScope.ts`)
- Instant local operation — no API call
- Filters the full context graph using extracted entities (type → date → officer → case → category → objects)
- Fuzzy keyword fallback if strict filters return zero results
- Expands candidates by one hop along graph edges (same case, same officer, same date, referenced-in)
- Returns up to ~30 candidate `GraphNode[]` for synthesis

**Step 3 — Vector Retrieval** (`vectorRetrieval.ts`)
- Queries the OpenAI vector store with the reformulated query and a context hint (titles of scoped nodes)
- Returns up to 10 semantic chunks with verbatim excerpts
- Runs in parallel with query analysis and is awaited before synthesis

**Step 4 — Synthesis** (`synthesis.ts`)
- Combines graph candidates + vector chunks using `gpt-4o-mini`
- Returns all graph candidates ranked by semantic relevance
- Generates one-sentence relevance explanations and verbatim excerpts per result
- Assigns confidence levels (`high / medium / low`) per result
- Normalises case ID variants (`088142`, `2025-088142`, `PBPD-2025-088142` → same base)
- Generates follow-up query suggestions

---

### Search UI (`src/components/SearchTakeover.tsx`)

Full-screen command palette overlay triggered from the sidebar "Search" nav item.

- **Live search** — debounced 500ms, pipeline runs on each query
- **Progress indicator** — shows active pipeline step (Analyzing → Scoping → Retrieving → Synthesizing)
- **Filter chips** — auto-extracted from query analysis, individually removable
- **Entity cards** — related cases and officers surfaced as secondary results
- **Evidence results list** — ranked results with confidence badges, relevance excerpts, file-type icons
- **Preview panel** — 4:3 thumbnail (image/video) or file-type icon with metadata on hover/select
- **Multi-select** — per-row checkboxes + "select all" header with indeterminate state
- **Recent searches** — shown in empty state before any query is typed

---

### AI Assistant Panel (`src/components/AssistantPanel.tsx`)

Slides in from the right edge whenever one or more evidence items are selected.

- **Scoped to selection** — the assistant only sees the selected evidence items
- **Vector-backed context** — before each response, the assistant retrieves relevant chunks from the vector store filtered to only the selected items' files
- **Streaming responses** — tokens stream in real time
- **Thinking blocks** — collapsible `<thinking>` blocks show the assistant's reasoning process with a shimmer animation during streaming
- **Inline citations** — evidence IDs cited as `[EV-XXXXX]` render as hoverable superscript marks with tooltips
- **Draft report generation** — say "write a report" and the assistant emits a `<draft_report>` block that opens in a side drawer with preview/edit/copy modes
- **Multi-turn conversation** — full message history sent on each turn; "New chat" clears without deselecting evidence

---

### Evidence Ingestion (`src/ingestion/`)

Upload any evidence file and it is classified, analyzed, and pushed to the OpenAI vector store.

- **Images** — GPT-4o vision analysis: scene type, lighting, objects detected, people count, visible text
- **Videos** — browser-side metadata extraction + thumbnail capture at 1s; full transcription requires server-side ffmpeg
- **Documents / PDFs / Audio** — text extraction and direct upload to vector store
- **Context graph** — every ingested item becomes a `GraphNode`; relationships (`same_case`, `same_officer`, `same_date`, `referenced_in`) are written as `GraphEdge`s to the graph persisted in localStorage

---

### Context Graph (`src/storage/config.ts`)

A lightweight in-memory + localStorage graph that powers the scoping step without API calls.

- Nodes: evidence items with full metadata
- Edges: typed relationships between items
- Persisted to localStorage and restored on page load
- Vector store ID and assistant ID also persisted here (created lazily on first run)

---

## Setup

**1. Install dependencies**

```bash
npm install
```

**2. Configure your OpenAI API key**

Create a `.env` file in the project root:

```env
VITE_OPENAI_API_KEY=sk-...
```

> The vector store and assistant are created automatically on first use. Their IDs are persisted to `localStorage` so they are reused across sessions.

**3. Start the dev server**

```bash
npm run dev
```

Dev server runs at `http://localhost:3000`.

---

## Project Structure

```
src/
├── engine/
│   ├── agentSearch.ts        # Orchestrator — runs the 4-step pipeline
│   ├── queryAnalysis.ts      # Step 1: NL → structured intent + entities
│   ├── graphScope.ts         # Step 2: local graph filtering + edge expansion
│   ├── vectorRetrieval.ts    # Step 3: OpenAI vector store semantic search
│   ├── synthesis.ts          # Step 4: ranking + relevance annotation
│   └── assistantChat.ts      # Streaming chat engine for the assistant panel
│
├── components/
│   ├── SearchTakeover.tsx    # Main search UI — command palette overlay
│   ├── AssistantPanel.tsx    # AI investigation panel (slides in on selection)
│   ├── pages/
│   │   ├── EvidencePage.tsx  # Evidence list page
│   │   └── UploadPage.tsx    # Ingestion UI
│   └── ui/                   # shadcn/ui component library
│
├── ingestion/                # File classification and processor modules
├── data/
│   ├── types.ts              # All TypeScript types (Evidence, GraphNode, SearchOutput, …)
│   └── contextGraph.json     # Seed graph data (mock evidence corpus)
├── storage/
│   └── config.ts             # localStorage wrappers (vector store ID, graph, assistant ID)
└── utils/
    └── openaiClient.ts       # OpenAI SDK singleton + vector store helpers
```

---

## How It Works — End to End

```
User types a query
    │
    ▼
[queryAnalysis] — GPT-4o-mini extracts intent, entities, filter chips
    │
    ├──────────────────────────────────────┐
    ▼                                      ▼
[graphScope]                        [vectorRetrieval]
  Local graph filter + edge expand   Semantic search → chunks
    │                                      │
    └──────────────────────────────────────┘
                         │
                         ▼
                   [synthesis]
                    GPT-4o-mini ranks candidates,
                    annotates with excerpts + confidence
                         │
                         ▼
                  SearchOutput displayed in UI

User selects evidence items
    │
    ▼
AssistantPanel opens
    │
    ▼
User sends message → vector search scoped to selected files
    │
    ▼
GPT-4o streams response with thinking block + inline citations
    │
    ▼ (optional)
<draft_report> → DraftDrawer (preview / edit / copy)
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_OPENAI_API_KEY` | Yes | OpenAI API key with access to Chat Completions, Files API, and Vector Stores |

---

## Notes

- The prototype runs entirely client-side. The OpenAI API key is exposed in the browser — this is intentional for a prototype and should never be done in production.
- The mock evidence corpus lives in `src/data/contextGraph.json`. Add or modify nodes there to change the searchable dataset.
- Video transcription beyond thumbnail capture requires a server-side ffmpeg pipeline (not included in this prototype).
