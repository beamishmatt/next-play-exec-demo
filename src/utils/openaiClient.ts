import OpenAI from 'openai';

let _client: OpenAI | null = null;

/**
 * Returns a truthy string when the proxy server is in use.
 * The real API key never leaves the server — this just signals
 * to the rest of the engine that OpenAI calls are available.
 */
export function getOpenAIKey(): string | null {
  return 'proxy';
}

export function getOpenAIClient(): OpenAI | null {
  if (!_client) {
    // Use an absolute URL — the SDK needs a full origin to construct request URLs correctly
    const base = typeof window !== 'undefined'
      ? `${window.location.origin}/api/openai`
      : '/api/openai';
    _client = new OpenAI({
      apiKey: 'proxy',        // real key is on the server, never in the browser
      baseURL: base,
      dangerouslyAllowBrowser: true,
    });
  }
  return _client;
}

export async function chatCompletion(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options: Partial<OpenAI.Chat.ChatCompletionCreateParamsNonStreaming> = {}
): Promise<string> {
  const openai = getOpenAIClient()!;
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    ...options,
    messages,
  });
  return response.choices[0].message.content ?? '';
}

export async function chatCompletionStream(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options: { model?: string; temperature?: number; max_tokens?: number } = {},
  onAccumulated: (text: string) => void
): Promise<string> {
  const openai = getOpenAIClient()!;
  const stream = await openai.chat.completions.create({
    model: options.model ?? 'gpt-4o-mini',
    temperature: options.temperature,
    max_tokens: options.max_tokens,
    messages,
    stream: true,
  });
  let accumulated = '';
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? '';
    if (delta) {
      accumulated += delta;
      onAccumulated(accumulated);
    }
  }
  return accumulated;
}

export async function uploadTextFile(content: string, filename: string): Promise<string> {
  const openai = getOpenAIClient()!;
  const blob = new Blob([content], { type: 'text/plain' });
  const file = new File([blob], filename, { type: 'text/plain' });
  const uploaded = await openai.files.create({ file, purpose: 'assistants' });
  return uploaded.id;
}

export async function uploadBinaryFile(file: File): Promise<string> {
  const openai = getOpenAIClient()!;
  const uploaded = await openai.files.create({ file, purpose: 'assistants' });
  return uploaded.id;
}

export async function addFileToVectorStore(storeId: string, fileId: string): Promise<void> {
  const openai = getOpenAIClient()!;
  await openai.vectorStores.files.create(storeId, { file_id: fileId });
}

export async function createVectorStore(name: string): Promise<string> {
  const openai = getOpenAIClient()!;
  const store = await openai.vectorStores.create({ name });
  return store.id;
}

export async function createAssistant(vectorStoreId: string): Promise<string> {
  const openai = getOpenAIClient()!;
  const assistant = await openai.beta.assistants.create({
    name: 'Evidence Search Assistant',
    model: 'gpt-4o',
    instructions: `You are an evidence retrieval assistant for a law enforcement evidence management system.
When given a search query with optional context about which evidence files are most relevant,
search the vector store and return the most relevant evidence items.
Always cite specific evidence by their IDs and titles.`,
    tools: [{ type: 'file_search' }],
    tool_resources: { file_search: { vector_store_ids: [vectorStoreId] } },
  });
  return assistant.id;
}

export interface VectorStoreChunk {
  text: string;
  fileId: string;
  score: number;
}

export async function searchVectorStore(
  storeId: string,
  query: string,
  maxResults = 10
): Promise<VectorStoreChunk[]> {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const res = await fetch(`${origin}/api/openai/vector_stores/${storeId}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2',
    },
    body: JSON.stringify({ query, max_num_results: maxResults }),
  });

  if (!res.ok) throw new Error(`Vector store search failed: ${res.status}`);

  const data = await res.json();
  return (data.data ?? []).map((item: any) => ({
    fileId: item.file_id,
    score: item.score ?? 0,
    text: item.content?.map((c: any) => (typeof c.text === 'string' ? c.text : (c.text?.value ?? ''))).join('\n') ?? '',
  }));
}
