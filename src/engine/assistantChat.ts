import { getOpenAIClient, searchVectorStore } from '../utils/openaiClient';
import { getVectorStoreId } from '../storage/config';
import { AssistantItem } from '../components/AssistantPanel';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function buildSystemPrompt(items: AssistantItem[], vectorContext: string): string {
  const evidenceSummary = items.map(e => {
    const lines = [
      `• ${e.title} (ID: ${e.id})`,
      e.category       && `  Category: ${e.category}`,
      e.officer        && `  Officer: ${e.officer}`,
      e.date_recorded  && `  Recorded: ${e.date_recorded}`,
      e.media_class    && `  Type: ${e.media_class}`,
      e.description    && `  Description: ${e.description}`,
      e.objects_detected && `  Objects detected: ${e.objects_detected}`,
    ].filter(Boolean);
    return lines.join('\n');
  }).join('\n\n');

  return [
    'You are an investigative assistant embedded in a law enforcement evidence management platform.',
    'You are helping an officer analyze the following selected evidence items only — do not reference any other evidence:\n',
    evidenceSummary,
    vectorContext ? `\nRelevant content retrieved from the evidence files:\n${vectorContext}` : '',
    '\nYou MUST begin every response with a <thinking> block. Format it exactly as:\n<thinking>\n[4–6 word phrase describing your approach, e.g. "Cross-referencing timeline and witness accounts"]\n\n[2–3 sentences of reasoning: what the user is asking, which evidence is relevant, what approach you will take. Do NOT write your answer here.]\n</thinking>\nThen write your response after the closing tag.',
    '\nYou can help investigate patterns, connections, and insights. When it makes sense, you may also propose structured actions on the selected evidence.',
    '\nAGENTIC ACTIONS: To propose a change to one or more evidence items, emit a self-closing <action> tag immediately after the sentence that justifies it. Format:\n<action type="set_category" items="EV-ID1,EV-ID2" value="Traffic Stop" />\n<action type="set_status" items="EV-ID1" value="under review" />\n<action type="add_tag" items="EV-ID1,EV-ID2" value="key witness" />\nValid types: set_category | set_status | add_tag.\nset_category values (choose one): Assault, Traffic Stop, Homicide, Theft, Shooting, Domestic, Drug Offense, Burglary, Police Event, Non Event, Other.\nset_status values (choose one): active, archived, under review.\nOnly propose actions when you have clear justification from the evidence. Never propose actions in the thinking block.',
    'Format your response in clean markdown. Use bullet points, bold, and headers where appropriate.',
    'Be concise and factual. Only draw on the evidence listed above.',
    'When you reference a specific piece of evidence, cite its ID inline immediately after the relevant claim using square brackets, e.g. [EV-16M3TQA7]. Only cite IDs from the evidence listed above.',
    '\nDRAFT REPORTS: If the user asks you to draft, write, or generate a report, incident report, summary report, or any written document, you MUST output the full draft inside a <draft_report> block. Use the format:\n<draft_report title="[Descriptive report title]">\n[Full report content in clean markdown]\n</draft_report>\nBefore the block, write 1–2 sentences in plain markdown acknowledging what you are drafting. Do NOT include the report content outside the block.',
  ].filter(Boolean).join('\n');
}

export async function chatWithEvidenceStream(
  userMessage: string,
  history: ChatMessage[],
  items: AssistantItem[],
  onChunk: (chunk: string) => void
): Promise<AssistantItem[]> {
  const openai = getOpenAIClient();
  if (!openai) throw new Error('No OpenAI API key configured.');

  const vectorStoreId = getVectorStoreId();
  let vectorContext = '';
  let sourcedItems: AssistantItem[] = [];

  if (vectorStoreId) {
    const selectedFileIds = new Set(items.map(e => e.vector_file_id).filter(Boolean) as string[]);
    if (selectedFileIds.size > 0) {
      const hint = `${items.map(e => e.title).join(', ')}. ${userMessage}`;
      const chunks = await searchVectorStore(vectorStoreId, hint, 20);
      const scoped = chunks.filter(c => selectedFileIds.has(c.fileId));
      if (scoped.length > 0) {
        vectorContext = scoped.map(c => c.text).join('\n\n');
        const usedFileIds = new Set(scoped.map(c => c.fileId));
        sourcedItems = items.filter(e => e.vector_file_id && usedFileIds.has(e.vector_file_id));
      }
    }
  }

  const systemPrompt = buildSystemPrompt(items, vectorContext);

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.3,
    max_tokens: 1400,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: userMessage },
    ],
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? '';
    if (delta) onChunk(delta);
  }

  return sourcedItems;
}
