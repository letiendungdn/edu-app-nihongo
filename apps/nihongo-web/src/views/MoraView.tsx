'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAllVocabulariesQuery } from '../hooks/queries';
import { playAudio } from '../utils/speech';
import { splitKanaIntoMora } from '../utils/kana';
import './MoraView.css';

type JlptFilter = 'all' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

const JLPT_FILTERS: JlptFilter[] = ['all', 'N5', 'N4', 'N3', 'N2', 'N1'];
const PAGE_SIZE = 30;

const MORA_LABELS = {
  regular: '1 nhịp',
  sokuon: 'dừng 1 nhịp',
  'syllabic-n': 'ん: 1 nhịp',
  'long-vowel': 'kéo dài 1 nhịp',
} as const;

export default function MoraView() {
  const [level, setLevel] = useState<JlptFilter>('all');
  const [query, setQuery] = useState('');
  const [moraInput, setMoraInput] = useState('');
  const [page, setPage] = useState(0);
  const { data: vocabulary = [], isLoading, isError } = useAllVocabulariesQuery();

  const morae = useMemo(() => splitKanaIntoMora(moraInput), [moraInput]);
  const filteredVocabulary = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return vocabulary
      .filter((word) => level === 'all' || word.jlptLevel === level)
      .filter((word) => !normalizedQuery || [word.kana, word.kanji, word.romaji, word.meaning]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase().includes(normalizedQuery)))
      .sort((a, b) => a.kana.localeCompare(b.kana, 'ja'));
  }, [level, query, vocabulary]);

  const pageCount = Math.max(1, Math.ceil(filteredVocabulary.length / PAGE_SIZE));
  const visibleVocabulary = filteredVocabulary.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => setPage(0), [level, query]);

  return (
    <div className="container mora-view">
      <header className="mora-view-header">
        <h2 className="view-title">Tách nhịp mora</h2>
        <p>
          Mỗi ô là một nhịp khi nói tiếng Nhật. Chọn từ trong cơ sở dữ liệu N5–N1 hoặc nhập kana bất kỳ.
        </p>
      </header>

      <section className="mora-analyzer glass-panel" aria-labelledby="mora-analyzer-title">
        <div className="mora-analyzer-heading">
          <div>
            <h3 id="mora-analyzer-title">Phân tích phát âm</h3>
            <p>っ là một khoảng dừng, ん là một nhịp riêng, còn ー là một nhịp kéo dài.</p>
          </div>
          <button type="button" className="btn btn-primary" disabled={!moraInput.trim()} onClick={() => playAudio(moraInput, 'ja-JP')}>
            🔊 Nghe từ
          </button>
        </div>
        <label htmlFor="mora-text-input">Kana cần tách</label>
        <input
          id="mora-text-input"
          className="mora-text-input japanese-text"
          value={moraInput}
          onChange={(event) => setMoraInput(event.target.value)}
          placeholder="Ví dụ: がっこう"
        />
        {morae.length > 0 ? (
          <>
            <div className="mora-beats" aria-label={`${morae.length} mora`}>
              {morae.map((mora, index) => (
                <div key={`${mora.text}-${index}`} className={`mora-beat mora-beat--${mora.kind}`}>
                  <span className="mora-beat-number">{index + 1}</span>
                  <span className="mora-beat-character japanese-text">{mora.text}</span>
                  <span className="mora-beat-kind">{MORA_LABELS[mora.kind]}</span>
                </div>
              ))}
            </div>
            <p className="mora-result-summary"><strong>{morae.length} nhịp:</strong> {morae.map((mora) => mora.text).join(' ・ ')}</p>
          </>
        ) : (
          <p className="mora-placeholder">Chọn một từ bên dưới hoặc nhập kana để xem từng nhịp.</p>
        )}
      </section>

      <section className="mora-database glass-panel" aria-labelledby="mora-database-title">
        <div className="mora-database-heading">
          <div>
            <h3 id="mora-database-title">Toàn bộ từ vựng trong cơ sở dữ liệu</h3>
            <p>{isLoading ? 'Đang tải từ vựng...' : `${vocabulary.length} từ đã tải`}</p>
          </div>
          <input
            className="mora-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm kana, kanji, romaji hoặc nghĩa"
            aria-label="Tìm từ vựng"
          />
        </div>
        <div className="mora-level-tabs" aria-label="Lọc theo cấp JLPT">
          {JLPT_FILTERS.map((filter) => (
            <button key={filter} type="button" className={level === filter ? 'active' : ''} onClick={() => setLevel(filter)}>
              {filter === 'all' ? 'Tất cả' : filter}
            </button>
          ))}
        </div>
        {isError ? (
          <p className="mora-placeholder">Không tải được danh sách từ vựng. Hãy thử lại sau.</p>
        ) : !isLoading && filteredVocabulary.length === 0 ? (
          <p className="mora-placeholder">Không có từ phù hợp với bộ lọc hiện tại.</p>
        ) : (
          <>
            <p className="mora-match-count">{isLoading ? '' : `${filteredVocabulary.length} từ phù hợp`}</p>
            <div className="mora-word-list">
              {visibleVocabulary.map((word) => (
                <button key={word.id} type="button" className="mora-word" onClick={() => setMoraInput(word.kana)}>
                  <span className="mora-word-kana japanese-text">{word.kana}</span>
                  {word.kanji && <span className="mora-word-kanji japanese-text">{word.kanji}</span>}
                  <span className="mora-word-meaning">{word.meaning}</span>
                  {word.jlptLevel && <span className="mora-word-level">{word.jlptLevel}</span>}
                </button>
              ))}
            </div>
            {pageCount > 1 && (
              <nav className="mora-pagination" aria-label="Phân trang từ vựng">
                <button type="button" className="btn" disabled={page === 0} onClick={() => setPage((current) => current - 1)}>← Trước</button>
                <span>Trang {page + 1}/{pageCount}</span>
                <button type="button" className="btn" disabled={page === pageCount - 1} onClick={() => setPage((current) => current + 1)}>Sau →</button>
              </nav>
            )}
          </>
        )}
      </section>
    </div>
  );
}
