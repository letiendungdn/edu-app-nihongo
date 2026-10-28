'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { loadSpeechVoices, playAudio, playAudioSequence, stopAudio } from '../utils/speech';
import PlayAllButton from '../components/PlayAllButton';
import { usePlayAll } from '../hooks/usePlayAll';
import {
  useKanjiLessonsQuery,
  useKanjiEntriesQuery,
  useKanjiSearchQuery,
} from '../hooks/queries';
import SpeakerIcon from '../components/SpeakerIcon';
import StrokeOrder from '../components/StrokeOrder';
import KanjiStructureButton from '../components/KanjiStructureButton';
import KanjiVocabSidepanel from '../components/KanjiVocabSidepanel';
import { toLocalImageUrl } from '@edu/vocab-images';
import { getKanjiSpeakItems, splitKanjiReadingField, type KanjiReadingToken } from '../utils/kanjiSpeak';
import type { KanjiEntry, KanjiLesson } from '../types/api';
import './VocabView.css';
import './KanjiView.css';

/** Trang đã có thao tác của người dùng chưa (điều kiện để trình duyệt cho phát âm). */
function hasUserActivation(): boolean {
  if (typeof navigator === 'undefined') return true;
  const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } })
    .userActivation;
  // Trình duyệt không có API này (Safari cũ): cứ thử phát như trước
  return activation ? activation.hasBeenActive : true;
}

export default function KanjiView({ initialLessonNumber }: { initialLessonNumber?: number } = {}) {
  const [currentLesson, setCurrentLesson] = useState(initialLessonNumber ?? 1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingKanjiId, setPendingKanjiId] = useState<number | null>(null);
  const [cardAudioPlaying, setCardAudioPlaying] = useState(false);
  const [spokenMark, setSpokenMark] = useState<
    { kind: 'reading'; tone: 'on' | 'kun'; index: number } | { kind: 'vocab'; id: number } | null
  >(null);
  const cardAudioGen = useRef(0);

  const { data: lessons = [] } = useKanjiLessonsQuery();
  const { data: lessonKanji = [], isLoading: loading } = useKanjiEntriesQuery(currentLesson);
  const { data: searchResults = [], isFetching: searching } = useKanjiSearchQuery(searchQuery);
  const { isPlayingAll, startPlayAll, stopPlayAll } = usePlayAll();

  useEffect(() => {
    if (initialLessonNumber != null && initialLessonNumber > 0) {
      setCurrentLesson(initialLessonNumber);
    }
  }, [initialLessonNumber]);

  useEffect(() => {
    if (lessons.length > 0 && !lessons.some((l) => l.lessonNumber === currentLesson)) {
      setCurrentLesson(lessons[0].lessonNumber);
    }
  }, [lessons, currentLesson]);

  useEffect(() => {
    stopPlayAll();
    setCurrentIndex(0);
  }, [currentLesson, stopPlayAll]);

  useEffect(() => {
    if (pendingKanjiId == null || !lessonKanji.length) return;
    const idx = lessonKanji.findIndex((k) => k.id === pendingKanjiId);
    if (idx >= 0) {
      setCurrentIndex(idx);
        setPendingKanjiId(null);
    }
  }, [pendingKanjiId, lessonKanji]);

  const currentKanji = lessonKanji[currentIndex];
  const currentLessonMeta = lessons.find((l) => l.lessonNumber === currentLesson);
  const isSearchActive = searchQuery.trim().length > 0;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
  };

  const handleSelectSearchResult = (entry: KanjiEntry) => {
    const lessonNumber = entry.lesson?.lessonNumber;
    if (!lessonNumber) return;
    setPendingKanjiId(entry.id);
    setCurrentLesson(lessonNumber);
    handleClearSearch();
  };

  const silenceCardAudio = () => {
    cardAudioGen.current += 1;
    setCardAudioPlaying(false);
    setSpokenMark(null);
  };

  const handleNext = () => {
    if (!lessonKanji.length) return;
    silenceCardAudio();
    stopPlayAll();
    setCurrentIndex((prev) => (prev + 1) % lessonKanji.length);
  };

  const handlePrev = () => {
    if (!lessonKanji.length) return;
    silenceCardAudio();
    stopPlayAll();
    setCurrentIndex((prev) => (prev - 1 + lessonKanji.length) % lessonKanji.length);
  };

  const handlePrevRef = useRef(handlePrev);
  const handleNextRef = useRef(handleNext);
  const playCardRef = useRef(() => {});
  const playingAllRef = useRef(isPlayingAll);
  handlePrevRef.current = handlePrev;
  handleNextRef.current = handleNext;
  playingAllRef.current = isPlayingAll;

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.resume();
    }
    void loadSpeechVoices();
  }, []);

  // Chrome chỉ cho phát âm sau khi người dùng đã bấm/gõ trên trang. Mở thẳng /kanji ở tab mới
  // thì audio.play() bị chặn và speechSynthesis im lặng → chờ lần tương tác đầu rồi mới đọc.
  const [needsGesture, setNeedsGesture] = useState(false);

  useEffect(() => {
    if (playingAllRef.current || !currentKanji) return undefined;
    let cancelled = false;
    const play = () => {
      void loadSpeechVoices().then(() => {
        if (!cancelled && !playingAllRef.current) playCardRef.current();
      });
    };

    if (!hasUserActivation()) {
      setNeedsGesture(true);
      const onFirstGesture = (event: Event) => {
        window.removeEventListener('pointerdown', onFirstGesture, true);
        window.removeEventListener('keydown', onFirstGesture, true);
        setNeedsGesture(false);
        // Bấm vào nút loa/âm đọc thì nút đó tự phát — không đọc chồng cả thẻ
        const target = event.target as HTMLElement | null;
        if (target?.closest('button, a, input, select, textarea')) return;
        // Phím cách / ← → đã có xử lý riêng (đọc thẻ, sang chữ khác)
        if (event instanceof KeyboardEvent && [' ', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        play();
      };
      window.addEventListener('pointerdown', onFirstGesture, true);
      window.addEventListener('keydown', onFirstGesture, true);
      return () => {
        cancelled = true;
        window.removeEventListener('pointerdown', onFirstGesture, true);
        window.removeEventListener('keydown', onFirstGesture, true);
      };
    }

    const timer = window.setTimeout(play, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [currentIndex, currentLesson, currentKanji?.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        handlePrevRef.current();
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        handleNextRef.current();
        return;
      }
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
        playCardRef.current();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  const handlePronounce = (e: React.MouseEvent, text?: string) => {
    e.stopPropagation();
    if (!currentKanji) return;
    silenceCardAudio();
    stopPlayAll();
    if (text) {
      playAudio(text);
      return;
    }
    void playAudioSequence(getKanjiSpeakItems(currentKanji), { pauseMs: 550 });
  };

  const handlePlayAll = () => {
    silenceCardAudio();
    const playlist = lessonKanji.flatMap((kanji, kanjiIndex) =>
      getKanjiSpeakItems(kanji).map((text) => ({ text, kanjiIndex })),
    );
    startPlayAll(
      playlist.map((item) => item.text),
      {
        pauseMs: 550,
        onItemIndex: (index) => {
          const item = playlist[index];
          if (!item) return;
          setCurrentIndex(item.kanjiIndex);
        },
      },
    );
  };

  const lessonOptions = lessons.length
    ? lessons
    : Array.from({ length: 32 }, (_, i) => ({ lessonNumber: i + 1 } as KanjiLesson));
  const kanjiOrder = String(currentIndex + 1).padStart(2, '0');
  const onyomi = currentKanji ? splitKanjiReadingField(currentKanji.onyomi) : [];
  const kunyomi = currentKanji ? splitKanjiReadingField(currentKanji.kunyomi) : [];
  const mnemonicImage = currentKanji?.imageUrl
    ? toLocalImageUrl(currentKanji.imageUrl) ?? currentKanji.imageUrl
    : null;
  const hasMnemonic = Boolean(mnemonicImage || currentKanji?.mnemonicVi || currentKanji?.mnemonicJp);

  const playCardAudio = () => {
    if (!currentKanji) return;
    const marks: Array<
      { kind: 'reading'; tone: 'on' | 'kun'; index: number } | { kind: 'vocab'; id: number }
    > = [];
    const clips: { text: string; cue: number }[] = [];
    const add = (text: string, mark: (typeof marks)[number]) => {
      const value = text.replace(/-/g, '').trim();
      if (!value) return;
      clips.push({ text: value, cue: marks.length });
      marks.push(mark);
    };
    onyomi.forEach((token, index) => add(token.speak, { kind: 'reading', tone: 'on', index }));
    kunyomi.forEach((token, index) => add(token.speak, { kind: 'reading', tone: 'kun', index }));
    for (const vocab of currentKanji.vocabularies ?? []) {
      add(vocab.reading, { kind: 'vocab', id: vocab.id });
    }
    if (!clips.length) return;
    const gen = ++cardAudioGen.current;
    stopPlayAll();
    setCardAudioPlaying(true);
    setSpokenMark(marks[0]);
    void playAudioSequence(clips, {
      pauseMs: 700,
      onItem: (cue) => {
        if (cardAudioGen.current !== gen) return;
        setSpokenMark(marks[cue] ?? null);
      },
      onEnd: () => {
        if (cardAudioGen.current !== gen) return;
        setCardAudioPlaying(false);
        setSpokenMark(null);
      },
      onStop: () => {
        if (cardAudioGen.current !== gen) return;
        setCardAudioPlaying(false);
        setSpokenMark(null);
      },
    });
  };

  const stopCardAudio = () => {
    cardAudioGen.current += 1;
    stopAudio();
    setCardAudioPlaying(false);
    setSpokenMark(null);
  };
  playCardRef.current = playCardAudio;

  const renderReadings = (tokens: KanjiReadingToken[], tone: 'on' | 'kun') =>
    tokens.map((token, i) => (
      <button
        key={`${token.display}-${i}`}
        type="button"
        className={`kanji-ll__reading kanji-ll__reading--${tone} japanese-text${
          spokenMark?.kind === 'reading' && spokenMark.tone === tone && spokenMark.index === i
            ? ' kanji-ll__reading--speaking'
            : ''
        }`}
        title={`Phát âm ${token.speak}`}
        onClick={(e) => handlePronounce(e, token.speak)}
      >
        {token.display}
        {i < tokens.length - 1 ? '、' : ''}
      </button>
    ));

  return (
    <div className="container kanji-ll">
      <header className="kanji-ll__top">
        <div className="kanji-ll__intro">
          <h2 className="view-title kanji-ll__title">Kanji Look and Learn</h2>
          <nav className="kanji-ll__links" aria-label="Công cụ kanji">
            <Link href="/kanji/quiz" className="btn btn-outline btn-sm kanji-ll__chip">
              <span aria-hidden="true">📝</span> Trắc nghiệm Kanji
            </Link>
            <Link href="/kanji/list" className="btn btn-outline btn-sm kanji-ll__chip">
              <span aria-hidden="true">📊</span> Bảng N5 → N1
            </Link>
          </nav>
        </div>

        <div className="kanji-ll__lesson">
          <div className="lesson-selector kanji-ll__lesson-select">
            <label htmlFor="kanji-lesson-select">Chọn bài học:</label>
            <select
              id="kanji-lesson-select"
              value={currentLesson}
              onChange={(e) => setCurrentLesson(Number(e.target.value))}
              className="select-input"
            >
              {lessonOptions.map((lesson) => (
                <option key={lesson.lessonNumber} value={lesson.lessonNumber}>
                  Bài {lesson.lessonNumber}
                  {lesson.jlptLevel ? ` (${lesson.jlptLevel})` : ''}
                  {lesson._count ? ` — ${lesson._count.entries} kanji` : ''}
                </option>
              ))}
            </select>
          </div>
          {currentLessonMeta?.jlptLevel ? (
            <p className="kanji-ll__level">JLPT {currentLessonMeta.jlptLevel}</p>
          ) : null}
          {lessonKanji.length > 0 ? (
            <p className="kanji-ll__count">
              Kanji {currentIndex + 1} / {lessonKanji.length}
            </p>
          ) : null}
        </div>
      </header>

      <div className="kanji-ll__search-wrap">
        <form className="kanji-search-form kanji-ll__search" onSubmit={handleSearchSubmit} role="search">
          <svg className="kanji-ll__search-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            className="vocab-word-list-search kanji-search-input"
            placeholder="Tìm kanji, Hán Việt, âm đọc, nghĩa..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Tìm kanji"
          />
          {isSearchActive ? (
            <button type="button" className="btn btn-nav btn-sm kanji-search-clear" onClick={handleClearSearch}>
              Xóa
            </button>
          ) : null}
        </form>

        {isSearchActive && (
          <div className="kanji-search-results glass-panel" role="region" aria-label="Kết quả tìm kanji">
            {searching ? (
              <p className="kanji-search-status">Đang tìm...</p>
            ) : searchResults.length === 0 ? (
              <p className="kanji-search-status">Không tìm thấy kanji phù hợp.</p>
            ) : (
              <>
                <p className="kanji-search-status">{searchResults.length} kết quả</p>
                <ul className="kanji-search-list">
                  {searchResults.map((entry) => (
                    <li key={entry.id}>
                      <button
                        type="button"
                        className="kanji-search-item"
                        onClick={() => handleSelectSearchResult(entry)}
                      >
                        <span className="kanji-search-char japanese-text">{entry.character}</span>
                        <span className="kanji-search-meta">
                          {entry.hanViet ? `${entry.hanViet} · ` : ''}
                          {entry.meaningVi}
                        </span>
                        <span className="kanji-search-lesson">
                          Bài {entry.lesson?.lessonNumber ?? '?'}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="empty-state">
          <p>Đang tải dữ liệu...</p>
        </div>
      ) : lessonKanji.length > 0 && currentKanji ? (
        <div className="kanji-ll__body">
          <div className="kanji-ll__main">
            <div className={`kanji-ll__hero${hasMnemonic ? '' : ' kanji-ll__hero--solo'}`}>
              <section className="kanji-ll__card kanji-ll__glyph-card" aria-label={`Kanji ${currentKanji.character}`}>
                <span className="kanji-ll__watermark" aria-hidden="true">{kanjiOrder}</span>
                <button
                  type="button"
                  className="kanji-ll__glyph japanese-text"
                  onClick={(e) => handlePronounce(e)}
                  title="Nghe tất cả cách đọc và từ vựng"
                >
                  {currentKanji.character}
                </button>
                {needsGesture ? (
                  <p className="kanji-ll__tap-hint" role="status">
                    Bấm vào trang hoặc nhấn phím cách để nghe đọc
                  </p>
                ) : null}
                <div className="kanji-ll__glyph-actions">
                  {currentKanji.hanViet ? (
                    <span className="kanji-ll__hanviet">{currentKanji.hanViet.toUpperCase()}</span>
                  ) : null}
                  <KanjiStructureButton text={currentKanji.character} withLabel />
                </div>
              </section>

              {hasMnemonic ? (
                <section className="kanji-ll__card kanji-ll__mnemonic" aria-label="Mnemonic">
                  <h3 className="kanji-ll__card-title">
                    Mnemonic <span>(Trực quan)</span>
                  </h3>
                  {mnemonicImage ? (
                    <img className="kanji-ll__mnemonic-img" src={mnemonicImage} alt={currentKanji.character} />
                  ) : null}
                  {currentKanji.mnemonicJp ? (
                    <p className="kanji-ll__mnemonic-jp japanese-text">{currentKanji.mnemonicJp}</p>
                  ) : null}
                  {currentKanji.mnemonicVi ? (
                    <p className="kanji-ll__mnemonic-vi">{currentKanji.mnemonicVi}</p>
                  ) : null}
                </section>
              ) : null}
            </div>

            <section className="kanji-ll__card kanji-ll__detail">
              <div className="kanji-ll__detail-grid">
                <div className="kanji-ll__stroke">
                  <h3 className="kanji-ll__card-title">Cách viết chữ</h3>
                  <div className="stroke-drawing-box kanji-ll__stroke-box">
                    <StrokeOrder key={currentKanji.id} text={currentKanji.character} width={150} height={150} />
                  </div>
                </div>
                <div className="kanji-ll__readings">
                  <h3 className="kanji-ll__card-title">Âm đọc &amp; Nghĩa</h3>
                  <dl>
                    {onyomi.length ? (
                      <div>
                        <dt>Onyomi:</dt>
                        <dd>{renderReadings(onyomi, 'on')}</dd>
                      </div>
                    ) : null}
                    {kunyomi.length ? (
                      <div>
                        <dt>Kunyomi:</dt>
                        <dd>{renderReadings(kunyomi, 'kun')}</dd>
                      </div>
                    ) : null}
                    <div className="kanji-ll__meaning-row">
                      <dt>Nghĩa:</dt>
                      <dd className="kanji-ll__meaning">{currentKanji.meaningVi}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="kanji-ll__controls">
                <button type="button" className="btn btn-outline kanji-ll__nav" onClick={handlePrev} aria-keyshortcuts="ArrowLeft">
                  ← Trước
                </button>
                <div className="kanji-ll__play-group">
                  <PlayAllButton isPlaying={isPlayingAll} onPlay={handlePlayAll} onStop={stopPlayAll} />
                  <button
                    type="button"
                    className={`kanji-ll__vocab-play${cardAudioPlaying ? ' kanji-ll__vocab-play--on' : ''}`}
                    onClick={cardAudioPlaying ? stopCardAudio : playCardAudio}
                    disabled={!onyomi.length && !kunyomi.length && !(currentKanji.vocabularies?.length)}
                    aria-label={cardAudioPlaying ? 'Dừng đọc từ vựng' : 'Phát tất cả từ vựng'}
                    title={cardAudioPlaying ? 'Dừng' : 'Phát âm đọc và từ vựng, tô chữ đang đọc'}
                  >
                    <SpeakerIcon size={16} />
                    {cardAudioPlaying ? 'Dừng' : 'Từ vựng'}
                  </button>
                </div>
                <button type="button" className="btn btn-outline kanji-ll__nav" onClick={handleNext} aria-keyshortcuts="ArrowRight">
                  Sau →
                </button>
              </div>
              <p className="kanji-ll__keys">← → đổi chữ và nghe · Space nghe lại</p>
            </section>
          </div>

          <KanjiVocabSidepanel
            kanjiEntryId={currentKanji.id}
            lessonNumber={currentLesson}
            vocabularies={currentKanji.vocabularies ?? []}
            onPronounce={handlePronounce}
            activeVocabId={spokenMark?.kind === 'vocab' ? spokenMark.id : null}
          />
        </div>
      ) : (
        <div className="empty-state">
          <p>
            Dữ liệu kanji cho Bài {currentLesson} chưa có. Chạy{' '}
            <code>npm run seed -w @edu/prisma-nihongo</code> (DB trống) hoặc restore backup.
          </p>
        </div>
      )}
    </div>
  );
}
