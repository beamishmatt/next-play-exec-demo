export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const openaiPath = url.pathname.replace(/^\/api\/openai/, '');
  const targetUrl = `https://api.openai.com/v1${openaiPath}${url.search}`;

  const headers = new Headers(req.headers);
  headers.set('Authorization', `Bearer ${process.env.OPENAI_API_KEY}`);
  headers.delete('host');

  const response = await fetch(targetUrl, {
    method: req.method,
    headers,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
    // @ts-ignore
    duplex: 'half',
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
