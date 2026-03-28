# Search 2.0 Takeover — Agentic Evidence Search Prototype

A high-fidelity prototype demonstrating agentic search over law enforcement evidence, built on a mock Axon Evidence platform. The search UI is a full-screen command palette ("takeover") that uses a 4-step AI pipeline to retrieve and synthesize results from an evidence vector store.

## Stack

- **Framework:** Vite + React 18 + TypeScript (SWC)
- **Styling:** Tailwind CSS v4 + custom CSS design tokens
- **Components:** shadcn/ui
- **AI:** OpenAI GPT-4o (vision + chat) + Assistants API (vector store retrieval)

## Features

### Agentic Search (`src/engine/`)
A 4-step pipeline runs on every query:
1. **Query Analysis** — extracts intent, entities, filters, and time references
2. **Graph Scope** — narrows the search to relevant nodes in the context graph
3. **Vector Retrieval** — semantic search against the OpenAI vector store
4. **Synthesis** — ranks and annotates results with relevance explanations

### Evidence Ingestion (`src/ingestion/`)
Upload any evidence file and it is classified, analyzed, and pushed to the vector store:
- **Images** — GPT-4o vision analysis: scene type, objects detected, people count, visible text
- **Videos** — metadata extraction + browser-side thumbnail capture (full transcription requires server-side ffmpeg)
- **Documents / PDFs / Audio** — text extraction and upload

### Search UI (`src/components/SearchTakeover.tsx`)
- Full-screen overlay triggered from the sidebar
- Auto-extracted filter chips (case ID, officer, category, date)
- Entity cards for related cases
- Evidence results list with highlighted excerpts
- Live preview panel with image/video thumbnail at 4:3 ratio

### Context Graph (`src/storage/config.ts`)
Nodes and relationships from ingested evidence are persisted to localStorage and used to scope vector searches.

## Setup

```bash
npm install
```

Create a `.env` file in the project root:

```
VITE_OPENAI_API_KEY=sk-...
```

```bash
npm run dev
```

Dev server runs at `http://localhost:3000`.

The vector store and assistant are created automatically on first use and their IDs are persisted to localStorage.

## Project Structure

```
src/
  engine/         # 4-step agentic search pipeline
  ingestion/      # File classification, image/video/document processors
  components/
    SearchTakeover.tsx    # Main search UI
    pages/
      EvidenceDetailPage.tsx  # Evidence viewer with media player
      UploadPage.tsx          # Ingestion UI
  data/           # Mock cases, evidence, types
  storage/        # localStorage wrappers for vector store ID, graph
  utils/          # OpenAI SDK client
```
