export interface ParsedGrammarExplanation {
  usage: string | null;
  note: string | null;
}

/** Tách phần "Cách dùng" và "Chú ý" trong explanation lưu chung một field. */
export function parseGrammarExplanation(
  explanation: string | null | undefined,
): ParsedGrammarExplanation {
  if (!explanation?.trim()) {
    return { usage: null, note: null };
  }

  const noteMatch = explanation.match(/\n\s*Chú ý\s*[:：]\s*([\s\S]*)$/i);
  if (noteMatch && noteMatch.index != null) {
    const usage = explanation
      .slice(0, noteMatch.index)
      .replace(/^\s*Cách dùng\s*[:：]\s*/i, '')
      .trim();
    return {
      usage: usage || null,
      note: noteMatch[1].trim() || null,
    };
  }

  return {
    usage: explanation.replace(/^\s*Cách dùng\s*[:：]\s*/i, '').trim() || null,
    note: null,
  };
}

/** Chuyển đoạn giải thích có gạch đầu dòng thành các bullet. */
export function grammarUsageBullets(usage: string | null | undefined): string[] {
  if (!usage?.trim()) return [];

  return usage
    .split(/\n+/)
    .flatMap((line) => line.split(/(?=–)|(?=-\s)/))
    .map((line) => line.replace(/^[\s–-]+/, '').trim())
    .filter(Boolean);
}

/** Sinh dòng "Phân tích nhanh" từ mẫu N1/N2 và câu ví dụ tiếng Nhật. */
export function grammarQuickAnalysis(pattern: string, jp: string): string | null {
  if (!pattern.includes('N1') || !jp.includes('は')) return null;

  const text = jp.replace(/[。.?!！？]+$/g, '').trim();
  const waIndex = text.indexOf('は');
  if (waIndex <= 0) return null;

  const n1 = text.slice(0, waIndex).trim();
  const n2 = text.slice(waIndex + 1).trim();
  if (!n1 || !n2) return null;

  return `Phân tích ngữ pháp: N1: ${n1} / N2: ${n2}`;
}
