# Agentic Search Prototype — Build Plan
## Evidence.com: Takeover Search (Option B)

**Last updated:** March 27, 2026
**Status:** Ready to build

---

## 1. Executive Summary

High-fidelity prototype of agentic search on a mock evidence.com platform. Users upload evidence, it gets ingested into a context graph + vector store, then search it using a full-screen takeover experience launched from the sidebar with filters, rich results, and an AI assist panel.

| Decision | Choice | Rationale |
|---|---|---|
| AI provider | OpenAI (single provider) | GPT-4o for reasoning + Assistants API for managed vector retrieval |
| API calls | Live during search | Realistic demo experience |
| Object detection | Structured vision prompting (GPT-4o) | Single provider, evidence-specific vocabulary, no extra infra |
| Evidence upload | In-app upload flow | Self-contained prototype, no external scripts |
| Key management | `.env` file (`OPENAI_API_KEY`) | Key never in code or UI |
| Visual fidelity | High — match evidence.com design language | Dark sidebar, gold active state, utilitarian table layout, category badges |

---

## 2. Configuration

### Environment
```
# .env
OPENAI_API_KEY=sk-...
```

### Startup Behavior
1. App loads → reads `OPENAI_API_KEY` from environment
2. On first run: creates OpenAI vector store + assistant, persists IDs to local storage
3. On subsequent runs: loads existing vector store + assistant IDs from storage
4. App is immediately usable — upload evidence, search it

### Local Storage Keys
```
config:vectorStoreId   → OpenAI vector store ID
config:assistantId     → OpenAI assistant ID
config:contextGraph    → JSON context graph
```

---

## 3. Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        REACT APP                                  │
│                                                                    │
│  ┌──────────────────────┐     ┌────────────────────────────────┐ │
│  │    APP SHELL           │     │    INGESTION PIPELINE          │ │
│  │  (evidence.com mock)   │     │  - In-app file upload          │ │
│  │                        │     │  - Classify → Extract → Analyze│ │
│  │  ┌──────────────────┐ │     │  - Build graph + push to store │ │
│  │  │ SEARCH TAKEOVER   │ │     │  - Processing log UI           │ │
│  │  │ (Option B)        │ │     └────────────────────────────────┘ │
│  │  │                   │ │                                        │
│  │  │ Filters | Results │ │                                        │
│  │  │         | AI Panel│ │                                        │
│  │  └──────────────────┘ │                                        │
│  └────────┬──────────────┘                                        │
│           │                                                        │
│  ┌────────▼──────────────────────────────────────────────────────┐ │
│  │              AGENTIC SEARCH ENGINE                             │ │
│  │                                                                │ │
│  │  1. QUERY ANALYSIS         (GPT-4o chat completion)           │ │
│  │     → Classify intent, extract entities (case IDs, names,     │ │
│  │       dates, objects, locations, evidence types)               │ │
│  │                                                                │ │
│  │  2. GRAPH SCOPING           (local JSON traversal)            │ │
│  │     → Filter nodes by entities + objects_detected              │ │
│  │     → Expand via edges (same_case, same_incident)             │ │
│  │                                                                │ │
│  │  3. VECTOR RETRIEVAL        (OpenAI Assistants API)           │ │
│  │     → file_search against vector store                        │ │
│  │     → Scoped by graph candidates                              │ │
│  │                                                                │ │
│  │  4. SYNTHESIS               (GPT-4o chat completion)          │ │
│  │     → Merge graph + vector results → summary, ranked          │ │
│  │       results, citations, follow-up suggestions               │ │
│  └───────────────────────────────────────────────────────────────┘ │
│           │                          │                              │
│  ┌────────▼──────────┐    ┌─────────▼────────────────────┐        │
│  │  CONTEXT GRAPH     │    │  OPENAI VECTOR STORE          │        │
│  │  (JSON, persisted  │    │  (Assistants API file_search)  │        │
│  │   locally)         │    │  + Assistant configured        │        │
│  └───────────────────┘    └────────────────────────────────┘        │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 4. Ingestion Pipeline (In-App)

### Flow
1. Drop files onto the upload zone (or use file picker / "Import evidence" button)
2. Each file is classified by media type (MIME type + extension fallback)
3. Processing runs per-file with real-time status updates in a log panel
4. For each file: extract content → analyze → build graph node → push to vector store
5. Context graph and vector store IDs are persisted to local storage

### Media Type Processing

#### Machine-Readable Documents (PDF, DOCX, TXT, CSV, JSON)
```
File → Upload directly to OpenAI Files API → Add to vector store
     → Extract metadata (filename, size, type)
     → Create graph node with metadata
```
- OpenAI's file_search handles text extraction and chunking internally
- Graph node stores: filename, type, size, case_id, officer, category, timestamps

#### Non-Machine-Readable Documents (Scanned PDFs, photographed documents)
```
File → Send to GPT-4o vision as image → Get OCR text + description
     → Create .txt with extracted content → Upload to vector store
     → Create graph node with ocr_applied: true
```
- Use GPT-4o vision to both read text and describe the document
- Flag confidence level in graph node
- Text file uploaded to vector store contains the OCR output

#### Images (JPG, PNG — scene photos, evidence photos)
```
File → Read as base64 → Send to GPT-4o vision with structured prompt
     → Get: description + object inventory + scene metadata
     → Create .txt with analysis → Upload to vector store
     → Create graph node with objects_detected array
```
- **Structured vision prompt returns both natural language AND structured JSON** (see Section 5)
- The text file uploaded to vector store contains the full description for semantic search
- The graph node contains the structured object data for filtering/scoping

#### Video (MP4, MOV, AVI)
```
PRODUCTION PIPELINE (documented, not implemented in prototype):
File → ffmpeg: extract audio → Whisper API: transcribe with timestamps
     → ffmpeg: extract keyframes (1 per 10 seconds) → PNG files
     → GPT-4o vision: analyze each keyframe (description + objects)
     → Merge: timestamped transcript + keyframe analyses → composite doc
     → Upload composite to vector store
     → Graph node links to transcript segments and keyframe data

PROTOTYPE PIPELINE:
File → Create metadata document (filename, simulated duration, case info)
     → Upload metadata to vector store
     → Graph node with video processing plan documented
     → Flag: video_processing = "metadata_only"
```

**Production video processing detail:**
1. **Audio extraction:** `ffmpeg -i input.mp4 -vn -acodec pcm_s16le -ar 16000 output.wav`
2. **Transcription:** OpenAI Whisper API → JSON with word-level timestamps
3. **Keyframe extraction:** `ffmpeg -i input.mp4 -vf "fps=1/10" keyframe_%04d.png`
4. **Keyframe analysis:** Each keyframe → GPT-4o vision with structured prompt (same as images)
5. **Composite document construction:**
   ```
   [00:00 - 00:10] Transcript: "Officer approaches vehicle..."
   [00:10] Keyframe: Parking lot scene, blue sedan center frame, 2 people visible
   [00:10 - 00:20] Transcript: "License and registration please..."
   [00:20] Keyframe: Close-up of driver's window, one person visible
   ...
   ```
6. **Graph node:** Contains array of `keyframe_analyses` with timestamps, allowing search to link to specific moments in footage

**What we're NOT building in the prototype:**
- Real-time video analysis / streaming
- Object tracking across frames
- Face recognition
- License plate OCR
- Audio analysis beyond transcription

---

## 5. Object Detection via Structured Vision Prompting

Instead of a separate model (YOLO, etc.), we use GPT-4o vision with a structured prompt that returns both a natural language description and a typed object inventory.

### Vision Prompt (for images and video keyframes)
```
You are analyzing evidence for a law enforcement evidence management system.
Analyze this image thoroughly.

Return ONLY valid JSON with this exact structure (no markdown, no backticks):
{
  "description": "Detailed natural language description of the scene",
  "objects": [
    {
      "label": "object name (use specific terms: sedan, SUV, pickup_truck,
                handgun, rifle, knife, badge, body_camera, taser,
                evidence_marker, etc.)",
      "color": "primary color if applicable, null otherwise",
      "confidence": "high | medium | low",
      "position": "location in image (center, left, right, foreground,
                   background, etc.)",
      "count": 1
    }
  ],
  "scene_type": "type (outdoor_street, indoor_residence, parking_lot,
                 intersection, crime_scene, office, interrogation_room, etc.)",
  "lighting": "lighting conditions (daylight, nighttime_artificial,
               dawn_dusk, indoor_fluorescent, etc.)",
  "weather": "if outdoor (clear, rainy, overcast, snowy, etc.) or null",
  "people_count": 0,
  "people_descriptions": ["brief description of each visible person"],
  "text_visible": "any readable text in the image or null",
  "notable_details": "anything relevant to law enforcement (damage,
                      injuries, contraband, weapons, evidence markers)"
}
```

### How Objects Feed Into Search

**At ingestion:** The `objects` array is stored on the graph node as `objects_detected`.

**At search time (graph scoping step):** The query analysis step extracts object references ("blue sedan", "firearm"). The graph scoping step filters nodes:
```javascript
// Example: user searches "blue sedan"
nodes.filter(node =>
  node.objects_detected.some(obj =>
    obj.label.includes("sedan") && obj.color === "blue"
  )
);
```

Object-based queries are answered by the graph *before* hitting the vector store — fast and precise. The vector store search then deepens results with semantic context.

### Production Upgrade Path
Replace structured vision prompting with a dedicated model (YOLO v8, Grounding DINO, or a fine-tuned detector). This gives bounding boxes, higher precision, faster per-image processing, and batch capability. The graph schema accommodates this — swap the source of `objects_detected` without changing search logic.

---

## 6. Context Graph Schema

```json
{
  "nodes": {
    "EV-4821-73920": {
      "id": "EV-4821-73920",
      "title": "crime_scene_photo_001.jpg",
      "media_class": "image",
      "mime_type": "image/jpeg",
      "size": 2458624,
      "case_id": "CASE-2024-3847",
      "date_recorded": "2025-01-27T12:12:12Z",
      "date_ingested": "2025-04-21T09:00:00Z",
      "officer": "Serrano, Miguel 123",
      "category": "Assault",
      "source": "Axon Body 3",
      "duration": null,
      "status": "complete",

      "description": "Nighttime scene of a parking lot behind a
        convenience store. A blue four-door sedan is parked at an
        angle near the dumpsters. Two evidence markers visible.",

      "objects_detected": [
        {
          "label": "sedan",
          "color": "blue",
          "confidence": "high",
          "position": "center",
          "count": 1
        },
        {
          "label": "evidence_marker",
          "color": "yellow",
          "confidence": "high",
          "position": "foreground",
          "count": 2
        },
        {
          "label": "person",
          "color": null,
          "confidence": "medium",
          "position": "left",
          "count": 1
        }
      ],
      "scene_type": "outdoor_parking_lot",
      "lighting": "nighttime_artificial",
      "people_count": 1,
      "text_visible": "Store sign: 'QuickMart'",

      "vector_file_id": "file-abc123",
      "tags": ["crime_scene", "vehicle", "evidence_markers"],
      "video_processing": null
    }
  },

  "edges": [
    {
      "source": "EV-4821-73920",
      "target": "EV-1392-42382",
      "relationship": "same_case",
      "metadata": { "case_id": "CASE-2024-3847" }
    },
    {
      "source": "EV-4821-73920",
      "target": "EV-1392-42382",
      "relationship": "same_incident",
      "metadata": {
        "incident_date": "2025-01-27",
        "location": "QuickMart parking lot"
      }
    }
  ],

  "cases": {
    "CASE-2024-3847": {
      "title": "Assault — QuickMart Incident",
      "status": "active",
      "lead_officer": "Serrano, Miguel 123",
      "evidence_ids": ["EV-4821-73920", "EV-1392-42382"],
      "date_opened": "2025-01-27"
    }
  },

  "metadata": {
    "total_items": 2,
    "last_updated": "2025-04-21T09:15:00Z",
    "media_breakdown": {
      "image": 1,
      "video": 1,
      "document": 0,
      "text": 0,
      "pdf": 0
    }
  }
}
```

### Edge Generation Rules
Edges are created automatically during ingestion:
- **same_case:** Any two nodes sharing a `case_id`
- **same_officer:** Any two nodes with the same `officer` value
- **same_date:** Nodes recorded within 24 hours of each other
- **referenced_in:** When a document's text mentions another evidence item's ID or title

---

## 7. Search Takeover — UX Spec

### Visual Reference
Command palette style: full-screen white overlay, triggered from the sidebar "Search" nav item. No separate filter panel — filters are auto-extracted chips from the natural language query.

### States

#### Empty State (no query)
```
┌─────────────────────────────────────────────────────────────┐
│ [×] Command                              About  Command      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│         ┌───────────────────────────────────────┐          │
│         │ Describe what you want to find...   🔍 │          │
│         └───────────────────────────────────────┘          │
│                                                             │
│         Recent searches                                     │
│         ─────────────────────────────────────────          │
│         ID 2025 - 12345                                     │
│         ─────────────────────────────────────────          │
│         Uploads last week for officer 1223                  │
│         ─────────────────────────────────────────          │
│         Man wearing red hat in piedmont park two weeks ago  │
│         ─────────────────────────────────────────          │
│         Body cam footage for case 33726                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Results State (query submitted)
```
┌─────────────────────────────────────────────────────────────┐
│ [×] Command                              About  Command      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐   │
│  │ traffic stop assault officer 123 in the last week  🔍│   │
│  └──────────────────────────────────────────────────────┘   │
│  [Miguel Serrano ×] [Last 7 days ×] [Traffic stop ×] [Assault ×] │
│                                                             │
│  Other Results                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ...   │
│  │ 📁 Case 283  │ │ 👮 Miguel    │ │ 👮 Jamal     │       │
│  │    ..928     │ │    Serrano   │ │    Thompson  │       │
│  │ Miguel Serrano│ │ Officer 123  │ │ Officer 789  │       │
│  └──────────────┘ └──────────────┘ └──────────────┘       │
│                                                             │
│  Evidence (21)                    Best matches ▾  ⊞ ⊟     │
│  ┌──────────────────────────────┐ ┌──────────────────────┐ │
│  │ 📹 Axon Body Cam 3 2025-05-31│ │  [VIDEO THUMBNAIL]   │ │
│  │ ID: 2025-12345 • Serrano 123 │ │                      │ │
│  │ • Traffic stop               │ │ ID: 2025-12345       │ │
│  ├──────────────────────────────┤ │ Title: Axon Body...  │ │
│  │ 📄 Witness Statement         │ │ Recorded: Apr 21     │ │
│  │ ID: 2025-12345 • excerpt...  │ │ Owner: Serrano 123   │ │
│  ├──────────────────────────────┤ │ Categories: Traffic  │ │
│  │ 📄 Traffic Stop Report       │ │   stop, assault      │ │
│  └──────────────────────────────┘ │  [View evidence]     │ │
│                                   └──────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### UX Flow
1. "Search" nav item in sidebar triggers full-screen white overlay
2. Top bar: `×` close (left), "Command" title, "About Command" button (right)
3. Search input: centered, ~700px wide, placeholder "Describe what you want to find..."
4. **Empty state:** "Recent searches" list below input, divider-separated rows
5. **On submit:** query analysis extracts entities → rendered as dismissible filter chips below input
6. **"Other Results" row:** entity cards for related cases and officers inferred from the query
7. **Evidence list (left ~60%):** scrollable, each row has media type icon, title, ID + officer + category links, excerpt with matched terms bolded
8. **Preview panel (right ~40%):** shows on item hover/select — thumbnail with play button overlay for video, metadata card, "View evidence" CTA
9. Sort dropdown ("Best matches") + list/grid toggle above evidence list
10. Close: `×` button or `Esc`

### Design Notes
- Background: `#ffffff`, full viewport, `z-index` above everything, no dark backdrop
- Top bar: `border-bottom: 1px solid #e5e5e5`, `height: 52px`
- Search input: `border: 1px solid #d1d5db`, `border-radius: 6px`, `height: 44px`
- Filter chips: pill-shaped, `background: #f3f4f6`, `×` dismiss icon, auto-generated from query analysis
- "Other Results" cards: ~160px wide, icon + name + subtitle, subtle border
- Evidence rows: media type icon, bold title, metadata line in gray with blue category/officer links
- Excerpt text: gray, matched terms **bolded**
- Category/officer links in results: `color: #1a73e8`, no underline, hover underline
- Preview panel: right-aligned, thumbnail with play button overlay, metadata below, primary CTA button

### What Makes It "Agentic"
The filter chips are not manually set — they are auto-extracted by the query analysis step from the natural language input. The user types a sentence; the agent infers person, time range, evidence type, and category, and surfaces them as reviewable + dismissible constraints. "Other Results" entity cards are also agent-inferred, not keyword-matched.

---

## 8. Agentic Search Engine — Detailed Flow

### Step 1: Query Analysis (GPT-4o chat completion)
```
INPUT:  Raw user query
        e.g., "find body cam footage of the blue sedan from January"

PROMPT: Analyze this evidence search query and extract structured intent.

OUTPUT (JSON):
{
  "intent": "lookup | investigation | comparison | timeline |
             relationship | object_search",
  "entities": {
    "case_ids": [],
    "officers": [],
    "dates": { "start": "2025-01-01", "end": "2025-01-31" },
    "evidence_types": ["video"],
    "locations": [],
    "objects": [{ "label": "sedan", "color": "blue" }],
    "keywords": ["body cam", "footage"],
    "categories": []
  },
  "reformulated_query": "Body camera video evidence containing a
    blue sedan from January 2025",
  "search_strategy": "Filter by video type + January date range,
    then search for blue sedan in descriptions and detected objects"
}
```

### Step 2: Graph Scoping (local, instant)
```javascript
function scopeGraph(graph, analysis) {
  let candidates = Object.values(graph.nodes);

  // Filter by extracted entities
  if (analysis.entities.evidence_types.length > 0)
    candidates = candidates.filter(n =>
      analysis.entities.evidence_types.includes(n.media_class));

  if (analysis.entities.dates.start)
    candidates = candidates.filter(n =>
      n.date_recorded >= analysis.entities.dates.start);

  if (analysis.entities.officers.length > 0)
    candidates = candidates.filter(n =>
      analysis.entities.officers.some(o => n.officer.includes(o)));

  if (analysis.entities.case_ids.length > 0)
    candidates = candidates.filter(n =>
      analysis.entities.case_ids.includes(n.case_id));

  // Object detection matching
  if (analysis.entities.objects.length > 0) {
    candidates = candidates.filter(n =>
      analysis.entities.objects.some(searchObj =>
        (n.objects_detected || []).some(detObj =>
          detObj.label.includes(searchObj.label) &&
          (!searchObj.color || detObj.color === searchObj.color)
        )
      )
    );
  }

  // Expand via edges — include related evidence
  const expandedIds = new Set(candidates.map(c => c.id));
  for (const edge of graph.edges) {
    if (expandedIds.has(edge.source))
      expandedIds.add(edge.target);
    if (expandedIds.has(edge.target))
      expandedIds.add(edge.source);
  }

  return Object.values(graph.nodes)
    .filter(n => expandedIds.has(n.id));
}
```

### Step 3: Vector Retrieval (OpenAI Assistants API)
- Create a thread with the reformulated query + graph context
- The assistant uses file_search to retrieve relevant chunks from the vector store
- Graph context is passed as additional context to help the assistant prioritize

### Step 4: Synthesis (GPT-4o, within the assistant or a separate call)
- Merge graph metadata (structured) with vector results (semantic)
- Rank by combined relevance
- Generate: summary, per-result relevance explanations, citations, follow-up suggestions
- Return structured JSON for the UI to render

### Output Format
```json
{
  "summary": "Found 3 evidence items showing a blue sedan. 2 are
    from Case #CASE-2024-3847 (QuickMart Assault), 1 is from an
    unrelated traffic stop.",
  "results": [
    {
      "evidence_id": "EV-4821-73920",
      "title": "crime_scene_photo_001.jpg",
      "media_class": "image",
      "case_id": "CASE-2024-3847",
      "officer": "Serrano, Miguel 123",
      "category": "Assault",
      "relevance": "Image shows a blue sedan in the QuickMart
        parking lot with evidence markers nearby.",
      "excerpt": "Nighttime scene of a parking lot behind a
        convenience store. A blue four-door sedan...",
      "confidence": "high",
      "objects_matched": [{ "label": "sedan", "color": "blue" }],
      "related_evidence": ["EV-1392-42382"]
    }
  ],
  "suggestions": [
    "Show all evidence from Case #CASE-2024-3847",
    "Find body cam footage from Officer Serrano",
    "What other vehicles appear in evidence?"
  ],
  "graph_context": {
    "cases_involved": ["CASE-2024-3847"],
    "total_scoped": 5,
    "total_matched": 3
  }
}
```

---

## 9. Evidence.com App Shell — Design Spec

### Matching the provided screenshots

#### Sidebar (Dark, Left)
- `background: #2d2d2d`, `width: 200px`, full height
- Logo: Axon triangle mark (gold/white) + text, top-left
- Nav items: icon + label, `padding: 8px 12px`, `border-radius: 6px`
- Active item: `background: #d4a843` (gold), `color: #1a1a1a` (dark text)
- Inactive: `color: #ccc`
- Nav order: Search (top), Evidence, Cases, Device Inventory, Community, Reporting, ALPR, Records, Standards, Performance, Air
- Bottom section: Help, Messages, [User Name], Admin

#### Top Bar
- `height: 52px`, `border-bottom: 1px solid #e5e5e5`
- Left: Page title ("Evidence") in bold
- Right: "+ Import evidence" button, mail icon, help icon, notification icon, settings icon

#### Filter Bar
- Below top bar: `View: All evidence` dropdown, search description text
- Filter row: `Filters (N)` button, ID field, Owner dropdown, Recorded On (Start/End date pickers), Category dropdown
- View toggles (right): list/compact/grid icons, settings gear

#### Evidence Table
- Columns: checkbox, ID (blue link text), Title (with media type icon), Owner, Recorded On, Duration, Category (badge), People (thumbnail strip)
- Sorted by Recorded On (descending arrow)
- Rows: `border-bottom: 1px solid #f0f0f0`, hover highlight
- Category badges: pill-shaped, colored border + light background
  - Assault: gold/amber
  - Traffic Stop: gray
  - Homicide: red
  - Theft: blue
  - Shooting: dark gold/amber
  - Domestic: purple
  - Drug Offense: green
  - Burglary: pink

#### Typography
- System font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Table headers: 12px, uppercase, `letter-spacing: 0.03em`, `color: #666`, `font-weight: 600`
- Table cells: 13px, `color: #333`
- ID column: 13px, `color: #1a73e8`, `font-weight: 500`

---

## 10. Project Structure

```
evidence-search-prototype/
├── .env                            # OPENAI_API_KEY=sk-...
├── src/
│   ├── App.jsx                     # Root: app shell + routing
│   ├── components/
│   │   ├── AppShell.jsx            # Evidence.com chrome (sidebar, bar)
│   │   ├── EvidenceTable.jsx       # Main evidence list view
│   │   ├── EvidenceDetail.jsx      # Single evidence item detail view
│   │   ├── SearchTakeover.jsx      # Full-screen search takeover
│   │   ├── SearchResults.jsx       # Result card component
│   │   ├── AIAssistPanel.jsx       # Right-side AI reasoning panel
│   │   ├── FilterPanel.jsx         # Left-side filter panel
│   │   ├── UploadZone.jsx          # Drag & drop file upload
│   │   ├── ProcessingLog.jsx       # Real-time ingestion log
│   │   └── ContextGraphView.jsx    # Graph inspector / debug view
│   ├── engine/
│   │   ├── agentSearch.js          # Orchestrates 4-step search flow
│   │   ├── queryAnalysis.js        # Step 1: GPT-4o query understanding
│   │   ├── graphScope.js           # Step 2: local graph traversal
│   │   ├── vectorRetrieval.js      # Step 3: Assistants API search
│   │   ├── synthesis.js            # Step 4: result merging + ranking
│   │   └── openaiClient.js         # Thin wrapper around OpenAI API
│   ├── ingestion/
│   │   ├── pipeline.js             # Main ingestion orchestrator
│   │   ├── classifier.js           # File type classification
│   │   ├── imageProcessor.js       # Vision analysis + object detection
│   │   ├── videoProcessor.js       # Metadata extraction (+ prod plan)
│   │   ├── documentProcessor.js    # Text extraction for docs
│   │   └── graphBuilder.js         # Node/edge creation + graph updates
│   ├── storage/
│   │   └── config.js               # Read/write config (store IDs, graph)
│   └── utils/
│       ├── constants.js            # Categories, officers, sources, etc.
│       └── helpers.js              # ID generation, formatting, etc.
├── public/
│   └── index.html
├── package.json
├── BUILD_PLAN.md                   # This document
└── README.md                       # Setup instructions
```

---

## 11. Build Phases

### Phase 1: Foundation
- [ ] Project setup (React, `.env` config)
- [ ] OpenAI client wrapper (reads key from environment)
- [ ] Local storage wrapper for persisting graph + vector store IDs
- [ ] On first run: create vector store + assistant, persist IDs
- [ ] On subsequent runs: load existing IDs from storage

### Phase 2: Ingestion Pipeline
- [ ] File upload zone (drag & drop + file picker)
- [ ] File classification logic
- [ ] Document processor (direct upload to vector store)
- [ ] Image processor (vision analysis + structured object detection)
- [ ] Video processor (metadata placeholder)
- [ ] Context graph builder (node creation, edge generation)
- [ ] Processing log UI
- [ ] Persist graph to storage

### Phase 3: App Shell
- [ ] Sidebar navigation (matching evidence.com screenshot)
- [ ] Top bar with Import evidence button
- [ ] Filter bar
- [ ] Evidence table view with sort, columns, badges
- [ ] Evidence detail view

### Phase 4: Search Engine
- [ ] Query analysis (GPT-4o structured extraction)
- [ ] Graph scoping (local filter + edge expansion)
- [ ] Vector retrieval (Assistants API thread + run)
- [ ] Synthesis (merge + rank + format)

### Phase 5: Search Takeover UI
- [ ] Sidebar "Search" nav item
- [ ] Full-screen takeover with slide-in animation
- [ ] Three-column layout (filters | results | AI assist)
- [ ] Filter panel with live filtering
- [ ] Rich result cards (thumbnails, metadata, excerpts, confidence)
- [ ] AI Assist panel (reasoning stream, suggestions, relationship graph)
- [ ] List/grid toggle
- [ ] Close/dismiss behavior (Esc, close button)

### Phase 6: Polish
- [ ] Animation polish (transitions, hover states, loading states)
- [ ] Error handling + empty states
- [ ] Edge cases (no results, API failures, large file handling)

---

## 12. Dependencies

```json
{
  "dependencies": {
    "react": "^18.x",
    "react-dom": "^18.x"
  }
}
```

**External APIs (runtime):**
- OpenAI API (`api.openai.com/v1`)
  - `/models` — key validation
  - `/files` — file upload
  - `/vector_stores` — store creation + file management
  - `/assistants` — assistant creation
  - `/threads` — thread management
  - `/threads/{id}/messages` — message creation + retrieval
  - `/threads/{id}/runs` — run creation + polling
  - `/chat/completions` — query analysis, vision analysis, synthesis

**No other dependencies required.** React + OpenAI API + local storage.

**Important:** Add `.env` to `.gitignore`.

---

## 13. Risk & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| OpenAI API rate limits | Search feels slow | Retry with backoff; cache graph scoping |
| Vector store indexing delay | New files not searchable immediately | Show indexing status; "ready" indicator per file |
| Large files fail upload | Ingestion breaks | File size validation; clear error messaging |
| GPT-4o vision hallucination | Incorrect object detection | Confidence scores; weight low-confidence lower |
| Assistant response format unpredictable | JSON parsing fails | Robust parsing with fallback to raw text |
| API key exposure | Security concern | `.env` file, never in code or UI |
