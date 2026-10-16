import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `Bạn là gia sư tiếng Nhật chuyên nghiệp. Người học sẽ viết một câu tiếng Nhật (hoặc một câu tiếng Việt để nhờ dịch sang tiếng Nhật).

Hãy phản hồi theo cấu trúc JSON sau (KHÔNG thêm markdown, KHÔNG có \`\`\`json):
{
  "corrected": "câu đã sửa (tiếng Nhật, bỏ trống nếu câu đúng)",
  "reading": "furigana hoặc romaji cho câu đúng",
  "meaning": "nghĩa tiếng Việt",
  "explanation": "giải thích ngắn gọn bằng tiếng Việt — chỉ ra lỗi sai (nếu có), cấu trúc ngữ pháp được dùng, và ghi chú quan trọng",
  "examples": ["câu ví dụ tương tự 1 (JP)", "câu ví dụ tương tự 2 (JP)"]
}

Nếu câu đúng hoàn toàn, để "corrected" là "". Giữ giải thích súc tích, rõ ràng.`;

type AiProvider = 'ollama' | 'gemini';

function resolveProvider(): AiProvider {
  const raw = (process.env.AI_PROVIDER ?? '').trim().toLowerCase();
  if (raw === 'gemini') return 'gemini';
  return 'ollama';
}

async function askOllama(sentence: string): Promise<string> {
  const base = (process.env.LOCAL_AI_BASE_URL ?? 'http://127.0.0.1:11434').replace(
    /\/$/,
    '',
  );
  const model = process.env.LOCAL_AI_MODEL?.trim() || 'qwen2.5:7b';
  const res = await fetch(`${base}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: sentence },
      ],
      temperature: 0.3,
      max_tokens: 512,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ollama error: ${err}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

async function askGemini(sentence: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  const geminiBody = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ parts: [{ text: sentence }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini error: ${err}`);
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

export async function POST(req: NextRequest) {
  let body: { sentence?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const sentence = (body.sentence ?? '').trim();
  if (!sentence) {
    return NextResponse.json({ error: 'sentence is required' }, { status: 400 });
  }

  const provider = resolveProvider();

  try {
    const raw = provider === 'gemini' ? await askGemini(sentence) : await askOllama(sentence);

    const cleaned = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: 'Could not parse AI response', raw }, { status: 502 });
    }

    return NextResponse.json(parsed);
  } catch (e) {
    const message = String(e);
    if (provider === 'ollama' && /fetch failed|ECONNREFUSED|Ollama/i.test(message)) {
      return NextResponse.json(
        {
          error: 'Không nối được Ollama. Chạy: open -a Ollama && ollama pull qwen2.5:7b',
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
