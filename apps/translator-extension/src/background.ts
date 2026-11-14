import type { BgMessage, BgResponse, TranslationResult } from './types';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

async function translate(text: string): Promise<TranslationResult> {
  const { geminiApiKey } = await chrome.storage.local.get('geminiApiKey');
  if (!geminiApiKey) throw new Error('Chưa nhập Gemini API key. Click icon extension để cài.');

  const prompt = `Translate the input text to Vietnamese, English, and Japanese.
Return ONLY valid JSON, no markdown, no explanation.

Input: "${text.replace(/"/g, "'")}"

JSON schema (strictly follow this):
{
  "detected": "vi | en | ja",
  "vi": { "text": "<Vietnamese>", "pronunciation": "<tonal guide or empty>" },
  "en": { "text": "<English>", "pronunciation": "<IPA or phonetic>" },
  "ja": { "text": "<Japanese kanji/kana>", "kana": "<hiragana reading>", "romaji": "<romaji>" },
  "examples": [
    { "vi": "<natural Vietnamese sentence>", "en": "<natural English sentence>", "ja": "<自然な日本語文>" },
    { "vi": "...", "en": "...", "ja": "..." },
    { "vi": "...", "en": "...", "ja": "..." }
  ]
}

Rules:
- If the input language matches a target, keep "text" as the original.
- Examples must be short, everyday sentences naturally using the input word/phrase.
- Do not add any text outside the JSON object.`;

  const res = await fetch(`${GEMINI_URL}?key=${geminiApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `HTTP ${res.status}`);
  }

  const data = await res.json();
  const raw: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  // Extract JSON — Gemini sometimes wraps in ```json blocks
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Gemini trả về định dạng không hợp lệ.');

  return JSON.parse(jsonMatch[0]) as TranslationResult;
}

chrome.runtime.onMessage.addListener(
  (message: BgMessage, _sender: chrome.runtime.MessageSender, sendResponse: (r: BgResponse) => void) => {
    if (message.type !== 'TRANSLATE') return false;

    translate(message.text)
      .then((result) => sendResponse({ success: true, result }))
      .catch((err: Error) => sendResponse({ success: false, error: err.message }));

    return true; // keep channel open for async sendResponse
  },
);
