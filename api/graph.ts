import graphData from '../src/data/contextGraph.json';

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  if (req.method === 'GET') {
    return new Response(JSON.stringify(graphData), { headers });
  }

  if (req.method === 'POST') {
    // Writes are not persisted on Vercel — return OK for UI compatibility
    return new Response('{"ok":true}', { headers });
  }

  return new Response(null, { status: 405 });
}
