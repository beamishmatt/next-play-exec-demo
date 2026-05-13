const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const GRAPH_PATH = path.join(__dirname, 'src/data/contextGraph.json');
const FEEDBACK_PATH = path.join(__dirname, 'src/data/feedback.json');
const EVIDENCE_DIR = path.join(__dirname, 'public/evidence');

if (!fs.existsSync(EVIDENCE_DIR)) fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

if (!process.env.OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY environment variable is not set.');
  process.exit(1);
}

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.sendStatus(200));

// ── OpenAI proxy ──────────────────────────────────────────────────────────────
// Forwards /api/openai/* → https://api.openai.com/v1/*
// Injects the real API key server-side. The browser never sees it.
app.use('/api/openai', createProxyMiddleware({
  target: 'https://api.openai.com',
  changeOrigin: true,
  pathRewrite: { '^/api/openai': '/v1' },
  on: {
    proxyReq: (proxyReq) => {
      proxyReq.setHeader('Authorization', `Bearer ${process.env.OPENAI_API_KEY}`);
    },
  },
}));

// ── Graph API ─────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));

app.get('/api/graph', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    res.send(fs.readFileSync(GRAPH_PATH, 'utf-8'));
  } catch {
    res.json({ nodes: {}, edges: [], cases: {}, metadata: { total_items: 0, last_updated: new Date().toISOString(), media_breakdown: {} } });
  }
});

app.post('/api/graph', (req, res) => {
  try {
    fs.writeFileSync(GRAPH_PATH, JSON.stringify(req.body, null, 2), 'utf-8');
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to write graph' });
  }
});

// ── File upload API ───────────────────────────────────────────────────────────
app.post('/api/upload-file', (req, res) => {
  try {
    const { filename, data } = req.body;
    if (!filename || !data) return res.status(400).json({ error: 'Missing filename or data' });
    const safeName = path.basename(filename);
    fs.writeFileSync(path.join(EVIDENCE_DIR, safeName), Buffer.from(data, 'base64'));
    res.json({ fileUrl: `/evidence/${safeName}` });
  } catch {
    res.status(500).json({ error: 'Failed to save file' });
  }
});

// ── Feedback API ──────────────────────────────────────────────────────────────
app.post('/api/feedback', (req, res) => {
  try {
    const existing = fs.existsSync(FEEDBACK_PATH)
      ? JSON.parse(fs.readFileSync(FEEDBACK_PATH, 'utf-8'))
      : [];
    existing.push(req.body);
    fs.writeFileSync(FEEDBACK_PATH, JSON.stringify(existing, null, 2), 'utf-8');
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to write feedback' });
  }
});

// ── Static frontend ───────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
