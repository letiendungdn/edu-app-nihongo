'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { fetchKanjiSearch, searchVocabularies } from '../api';
import KanjiStructurePanel from '../components/KanjiStructurePanel';
import type { KanjiEntry } from '../types/api';
import { isKanji } from '../utils/kanji-structure';

const KANA = /[\u3040-\u30ff]/;

function toHiragana(value: string): string {
  return [...value]
    .map((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      return code >= 0x30a1 && code <= 0x30f6 ? String.fromCodePoint(code - 0x60) : ch;
    })
    .join('');
}

function normalizeKana(value: string): string {
  return toHiragana(value).replace(/[\s・･.\-ー]/g, '');
}

function displayKana(value: string): string {
  return toHiragana(value).replace(/[-.・]/g, '').replace(/\s+/g, ' ').trim();
}

/** Chuỗi chỉ toàn kana thì tra cách đọc. Có kanji thì phân tích cấu tạo như cũ. */
function kanaQuery(input: string): string | null {
  const q = input.trim();
  if (!q || [...q].some(isKanji)) return null;
  const core = q.replace(/[\s・･.\-ー]/g, '');
  if (!core || ![...core].every((ch) => KANA.test(ch))) return null;
  return q;
}

function matchRank(reading: string, needle: string): number | null {
  const n = normalizeKana(reading);
  const q = normalizeKana(needle);
  if (!n || !q) return null;
  if (n === q) return 0;
  if (q.length >= 2 && n.startsWith(q)) return 1;
  return null;
}

interface LookupHit {
  key: string;
  word: string;
  kana: string;
  meaning: string;
  rank: number;
}

function readingTokens(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[,、;／/]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function collectHits(entries: KanjiEntry[], vocabHits: { kanji: string | null; kana: string; meaning: string }[], needle: string): LookupHit[] {
  const out: LookupHit[] = [];
  const push = (word: string, kana: string, meaning: string, rank: number) => {
    const shown = displayKana(kana);
    const text = meaning.trim();
    if (!shown || !text) return;
    out.push({ key: `${word}|${normalizeKana(shown)}|${text}`, word, kana: shown, meaning: text, rank });
  };

  for (const entry of entries) {
    const readings = [...readingTokens(entry.onyomi), ...readingTokens(entry.kunyomi)];
    const best = readings
      .map((reading) => ({ reading, rank: matchRank(reading, needle) }))
      .filter((item): item is { reading: string; rank: number } => item.rank != null)
      .sort((a, b) => a.rank - b.rank)[0];
    if (best) push(entry.character, best.reading, entry.meaningVi, best.rank);
    for (const vocab of entry.vocabularies ?? []) {
      const rank = matchRank(vocab.reading, needle);
      if (rank != null) push(vocab.word, vocab.reading, vocab.meaningVi, rank);
    }
  }
  for (const vocab of vocabHits) {
    const rank = matchRank(vocab.kana, needle);
    if (rank != null) push(vocab.kanji?.trim() || vocab.kana, vocab.kana, vocab.meaning, rank);
  }

  const seen = new Set<string>();
  return out
    .sort((a, b) => a.rank - b.rank || a.word.length - b.word.length || a.word.localeCompare(b.word))
    .filter((hit) => {
      const id = `${hit.word}|${normalizeKana(hit.kana)}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, 12);
}

const EXAMPLES = ['語', '休', '明', '森', '好', '聞', '道', '病', '働', '漢', '想', '銀'] as const;

export default function KanjiStructureView({ initialText }: { initialText?: string }) {
  const [input, setInput] = useState(initialText?.trim() || '語');
  const [selected, setSelected] = useState<string | null>(null);
  const [hits, setHits] = useState<LookupHit[]>([]);
  const [lookingUp, setLookingUp] = useState(false);

  const readingQuery = kanaQuery(input);
  const chars = useMemo(() => [...new Set([...input].filter(isKanji))], [input]);
  const current = selected && chars.includes(selected) ? selected : (chars[0] ?? null);

  // Giữ chữ đang xem trên URL để chia sẻ được (?c=語)
  useEffect(() => {
    if (!current) return;
    const url = new URL(window.location.href);
    url.searchParams.set('c', current);
    window.history.replaceState(null, '', url);
  }, [current]);

  useEffect(() => {
    if (!readingQuery) {
      setHits([]);
      setLookingUp(false);
      return;
    }
    let cancelled = false;
    setLookingUp(true);
    const timer = window.setTimeout(() => {
      Promise.all([
        fetchKanjiSearch(readingQuery).catch(() => [] as KanjiEntry[]),
        searchVocabularies(readingQuery, 20).catch(() => ({ hits: [], total: 0 })),
      ]).then(([entries, vocab]) => {
        if (cancelled) return;
        setHits(collectHits(entries, vocab.hits, readingQuery));
        setLookingUp(false);
      });
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [readingQuery]);

  const pick = (char: string) => {
    setInput(char);
    setSelected(char);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="container ks-view">
      <header className="ks-header">
        <h2 className="view-title">Phân tích cấu tạo Kanji</h2>
        <p className="ks-subtitle">
          Tách chữ Hán thành các bộ phận: bộ thủ, phần gợi âm đọc, vị trí trái/phải/trên/dưới. Rê chuột
          vào từng thành phần để tô sáng nét trên chữ. Ở trang từ vựng và kanji, bấm nút{' '}
          <span className="japanese-text">構</span> để xem nhanh. Xem thêm <Link href="/radicals">bộ thủ</Link> ·{' '}
          <Link href="/strokes">tra nét viết</Link>.
        </p>
      </header>

      <section className="ks-panel glass-panel">
        <label className="ks-label" htmlFor="ks-input">
          Chữ / từ cần phân tích
        </label>
        <input
          id="ks-input"
          className="ks-input japanese-text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setSelected(null);
          }}
          placeholder="Ví dụ: 語, わたし, びょういん…"
          autoComplete="off"
          spellCheck={false}
        />
        <div className="ks-chips">
          <span className="ks-chips-label">Gợi ý:</span>
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" className="ks-chip japanese-text" onClick={() => pick(ex)}>
              {ex}
            </button>
          ))}
        </div>
        {readingQuery && (
          <div className="ks-lookup">
            {lookingUp && hits.length === 0 && <p className="ks-lookup-status">Đang tra…</p>}
            {!lookingUp && hits.length === 0 && (
              <p className="ks-lookup-status">Không thấy chữ hoặc từ đọc là {readingQuery}.</p>
            )}
            {hits.length > 0 && (
              <ul className="ks-lookup-list">
                {hits.map((hit) => {
                  const kanji = [...hit.word].filter(isKanji);
                  const body = (
                    <>
                      <span className="ks-lookup-word japanese-text">{hit.word}</span>
                      {normalizeKana(hit.word) !== normalizeKana(hit.kana) && (
                        <span className="ks-lookup-kana japanese-text">{hit.kana}</span>
                      )}
                      <span className="ks-lookup-meaning">{hit.meaning}</span>
                    </>
                  );
                  return (
                    <li key={`${hit.word}|${normalizeKana(hit.kana)}`}>
                      {kanji.length > 0 ? (
                        <button
                          type="button"
                          className="ks-lookup-item"
                          onClick={() => {
                            setInput(kanji.join(''));
                            setSelected(kanji[0]);
                          }}
                        >
                          {body}
                        </button>
                      ) : (
                        <div className="ks-lookup-item">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
        {chars.length > 1 && (
          <div className="ks-tabs" role="tablist" aria-label="Chọn chữ">
            {chars.map((c) => (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={c === current}
                className={`ks-tab japanese-text${c === current ? ' is-active' : ''}`}
                onClick={() => setSelected(c)}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </section>

      {current ? (
        <KanjiStructurePanel char={current} onPickChar={pick} />
      ) : (
        <p className="ks-empty">
          {readingQuery
            ? 'Chọn một chữ ở kết quả phía trên để xem cấu tạo.'
            : 'Nhập kanji, hoặc hiragana để tra chữ và nghĩa.'}
        </p>
      )}

      <p className="ks-credit">
        Dữ liệu nét và cấu tạo:{' '}
        <a href="https://kanjivg.tagaini.net" target="_blank" rel="noreferrer">
          KanjiVG
        </a>{' '}
        (CC BY-SA 3.0).
      </p>
    </div>
  );
}
