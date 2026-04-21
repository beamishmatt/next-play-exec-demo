export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  const url = new URL(req.url);
  const openaiPath = url.pathname.replace(/^\/api\/openai/, '');
  const targetUrl = `https://api.openai.com/v1${openaiPath}${url.search}`;

  const body = req.method !== 'GET' && req.method !== 'HEAD'
    ? await req.arrayBuffer()
    : undefined;

  const response = await fetch(targetUrl, {
    method: req.method,
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': req.headers.get('Content-Type') ?? 'application/json',
      'OpenAI-Beta': req.headers.get('OpenAI-Beta') ?? '',
    },
    body,
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
