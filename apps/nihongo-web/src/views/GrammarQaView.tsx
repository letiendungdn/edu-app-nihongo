'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/api-client';
import './GrammarQaView.css';

interface Source {
  index: number;
  grammarId: number;
  pattern: string;
  meaning: string;
  jlptLevel: string | null;
  lessonNumber: number | null;
  score: number;
  cited: boolean;
}

interface QaAnswer {
  answer: string;
  grounded: boolean;
  sources: Source[];
  model: string | null;
  cached: boolean;
  timingsMs: { embed: number; search: number; llm: number };
}

const SUGGESTIONS = [
  'Cách nói mình đã từng làm việc gì đó',
  'Phân biệt たら và ば',
  'ばかり dùng thế nào?',
  'Mặc dù đã cố gắng nhưng vẫn không được nói thế nào?',
];

/**
 * Thay [1], [2] trong câu trả lời bằng nhãn bấm được, trỏ tới nguồn tương ứng bên dưới, và hiện **chữ đậm**
 * (AI hay trả lời bằng markdown). Không dùng dangerouslySetInnerHTML: nội dung do AI sinh ra, không tin được.
 */
export function withCitations(text: string, sources: Pick<Source, 'index'>[]): ReactNode[] {
  return text.split(/(\[\d{1,2}\]|\*\*[^*\n]+\*\*)/g).map((part, i) => {
    const cite = /^\[(\d{1,2})\]$/.exec(part);
    if (cite) {
      const n = Number(cite[1]);
      if (sources.some((s) => s.index === n)) {
        return (
          <a key={i} className="gqa-cite" href={`#gqa-source-${n}`}>
            {n}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    }
    const bold = /^\*\*([^*\n]+)\*\*$/.exec(part);
    if (bold) return <strong key={i}>{bold[1]}</strong>;
    return <span key={i}>{part}</span>;
  });
}

export default function GrammarQaView() {
  const { isAuthenticated, authReady } = useAuth();
  const [question, setQuestion] = useState('');

  const ask = useMutation({
    mutationFn: (q: string) =>
      apiRequest<QaAnswer>('/ai/grammar-qa/ask', { method: 'POST', body: JSON.stringify({ question: q }) }),
  });

  const submit = (e?: FormEvent, q = question) => {
    e?.preventDefault();
    const text = q.trim();
    if (!text || ask.isPending) return;
    setQuestion(text);
    ask.mutate(text);
  };

  const data = ask.data;

  return (
    <div className="container gqa-page">
      <header>
        <p className="page-hero__eyebrow">Hỏi đáp ngữ pháp</p>
        <h2 className="view-title">Hỏi về ngữ pháp, trả lời kèm nguồn</h2>
        <p className="gqa-subtitle">
          AI chỉ trả lời dựa trên các mẫu ngữ pháp có trong app và ghi rõ nguồn [1], [2]… Không tìm thấy mẫu phù hợp thì
          báo là không có, thay vì tự bịa.
        </p>
      </header>

      {authReady && !isAuthenticated ? (
        <p className="gqa-note">
          Cần <Link href="/login">đăng nhập</Link> để hỏi.
        </p>
      ) : (
        <form className="gqa-form" onSubmit={submit}>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) submit(e as unknown as FormEvent);
            }}
            maxLength={500}
            rows={3}
            placeholder="Ví dụ: Cách nói “đã từng làm gì”? hoặc gõ thẳng mẫu: たことがある"
            aria-label="Câu hỏi ngữ pháp"
          />
          <div className="gqa-actions">
            <div className="gqa-suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" className="gqa-chip" onClick={() => submit(undefined, s)}>
                  {s}
                </button>
              ))}
            </div>
            <button type="submit" className="btn btn-primary" disabled={ask.isPending || !question.trim()}>
              {ask.isPending ? 'Đang trả lời…' : 'Hỏi'}
            </button>
          </div>
        </form>
      )}

      {ask.isPending && <p className="gqa-note">Đang tìm mẫu ngữ pháp liên quan và soạn câu trả lời (khoảng 10–30 giây)…</p>}
      {ask.isError && <p className="gqa-error">{(ask.error as Error).message}</p>}

      {data && !ask.isPending && (
        <section className="gqa-result">
          {!data.grounded && (
            <p className="gqa-warning">
              {data.model
                ? 'Câu trả lời không trích nguồn nào, có thể không dựa trên tài liệu của app. Hãy kiểm tra lại.'
                : 'Không tìm thấy mẫu ngữ pháp phù hợp trong app.'}
            </p>
          )}
          <div className="gqa-answer">{withCitations(data.answer, data.sources)}</div>

          {data.sources.length > 0 && (
            <>
              <h3 className="gqa-sources-title">{data.model ? 'Nguồn' : 'Mẫu gần nhất'}</h3>
              <ol className="gqa-sources">
                {data.sources.map((s) => (
                  <li key={s.grammarId} id={`gqa-source-${s.index}`} className={s.cited ? 'is-cited' : ''}>
                    <span className="gqa-source-index">{s.index}</span>
                    <div>
                      <strong>{s.pattern}</strong>
                      {s.jlptLevel && <span className="gqa-level">{s.jlptLevel}</span>}
                      <p>{s.meaning}</p>
                    </div>
                    {s.lessonNumber != null && (
                      <Link href={`/grammar?lesson=${s.lessonNumber}`} className="gqa-open">
                        Mở bài
                      </Link>
                    )}
                  </li>
                ))}
              </ol>
            </>
          )}

          <p className="gqa-meta">
            {data.cached
              ? 'Trả lời từ bộ nhớ đệm'
              : `Tìm nguồn ${data.timingsMs.embed + data.timingsMs.search} ms${data.model ? ` · AI ${(data.timingsMs.llm / 1000).toFixed(1)} giây (${data.model})` : ''}`}
          </p>
        </section>
      )}
    </div>
  );
}
