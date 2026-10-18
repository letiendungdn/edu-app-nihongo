'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { speakJapaneseThenMeaning, meaningForSpeech } from '../utils/speech';
import LessonSelector from '../components/LessonSelector';
import PlayAllButton from '../components/PlayAllButton';
import VocabWordList from '../components/VocabWordList';
import { usePlayAll } from '../hooks/usePlayAll';
import { useAuth } from '../hooks/useAuth';
import { useFeatureFlag, useLessons, useVocab, useVocabSearchQuery } from '../hooks/queries';
import StrokeOrder from '../components/StrokeOrder';
import VocabPicture from '../components/VocabPicture';
import {
  flashcardStrokePlan,
  parseReadingVariants,
  flashcardTextTier,
  hasOptionalBracketParts,
} from '../utils/japanese';
import FlashcardJapaneseText from '../components/FlashcardJapaneseText';
import KanjiStructureButton from '../components/KanjiStructureButton';
import { getVocabExamples } from '../utils/vocabPatternExample';
import { logActivity } from '../api';
import './VocabView.css';
import { lessonHeading, lessonShortLabel } from '../utils/lessonHeading';
import type { VocabularySearchHit } from '../types/api';

/**
 * Nét viết ở mặt sau thẻ: chỉ các chữ kanji (thêm kana khi cách đọc ngắn),
 * cỡ ô tính theo bề ngang thẻ để luôn nằm gọn một hàng — từ/cụm dài không đẩy thẻ xuống.
 */
function FlashcardReadingStrokes({
  kanji,
  kana,
  onCharClick,
}: {
  kanji: string | null;
  kana: string;
  onCharClick: (char: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(540);

  useEffect(() => {
    const el = hostRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.floor(entry.contentRect.width);
      if (next > 0) setWidth(next);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Chừa chỗ cho lề giữa các ô chữ (StrokeOrder compact: 8px mỗi chữ)
  const { rows, size } = flashcardStrokePlan(kanji, kana, { width: Math.min(width, 640) * 0.9 });

  return (
    <div ref={hostRef} className="flashcard-stroke-dual" onClick={(e) => e.stopPropagation()}>
      {rows.map((row) => (
        <div key={row.label ?? 'kana'} className="flashcard-stroke-block">
          {row.label && rows.length > 1 ? <p className="flashcard-stroke-label">{row.label}</p> : null}
          <StrokeOrder text={row.text} width={size} height={size} compact onCharClick={onCharClick} />
        </div>
      ))}
    </div>
  );
}

function useCopyText() {
  const [copied, setCopied] = useState(false);
  const copy = (text: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return { copied, copy };
}

export default function VocabView({
  initialLessonNumber,
  initialVocabId,
}: {
  initialLessonNumber?: number;
  initialVocabId?: number;
} = {}) {
  const router = useRouter();
  const [currentLesson, setCurrentLesson] = useState(initialLessonNumber ?? 1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingVocabId, setPendingVocabId] = useState<number | null>(initialVocabId ?? null);
  const vocabLoggedRef = useRef(false);
  const { copied: flashcardCopied, copy: copyFlashcard } = useCopyText();
  const { isAdmin } = useAuth();
  const { data: lessons = [] } = useLessons();
  const { data: lessonVocab = [], isLoading: loading } = useVocab(currentLesson);
  // Ô tra từ trên mọi bài bật/tắt bằng feature flag (admin: PATCH /api/admin/feature-flags/vocab-search-all-lessons)
  const searchAllLessonsOn = useFeatureFlag('vocab-search-all-lessons');
  const { data: search, isFetching: searching } = useVocabSearchQuery(searchAllLessonsOn ? searchQuery : '');
  const { isPlayingAll, startPlayAll, stopPlayAll } = usePlayAll();

  // Mọi lần đổi bài đi qua đây để state và ?lesson= trên URL không lệch nhau (bản cũ: chọn kết quả
  // tra từ ở bài khác chỉ đổi state, tải lại trang / chia sẻ link thì về bài cũ). Việc reset thẻ,
  // dừng phát do effect theo `currentLesson` bên dưới lo.
  const goToLesson = (next: number) => {
    setCurrentLesson(next);
    router.replace(`/vocab?lesson=${next}`, { scroll: false });
  };

  useEffect(() => {
    if (initialLessonNumber != null && initialLessonNumber > 0) {
      setCurrentLesson(initialLessonNumber);
    }
  }, [initialLessonNumber]);

  useEffect(() => {
    if (initialVocabId != null && initialVocabId > 0) {
      setPendingVocabId(initialVocabId);
    }
  }, [initialVocabId]);

  const currentLessonMeta = lessons.find((l) => l.lessonNumber === currentLesson);
  const lessonId = currentLessonMeta?.id ?? null;
  const expectedCount = currentLessonMeta?._count?.vocabularies ?? null;
  const vocabTitle = lessonHeading('vocab', currentLessonMeta);

  useEffect(() => {
    stopPlayAll();
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [currentLesson, stopPlayAll]);

  // Mở từ vừa chọn trong kết quả tra từ khi danh sách của bài đó đã tải xong
  useEffect(() => {
    if (pendingVocabId == null || !lessonVocab.length) return;
    const idx = lessonVocab.findIndex((v) => v.id === pendingVocabId);
    if (idx >= 0) {
      setCurrentIndex(idx);
      setIsFlipped(false);
      setPendingVocabId(null);
    }
  }, [pendingVocabId, lessonVocab]);

  useEffect(() => {
    if (lessonVocab.length === 0) {
      setCurrentIndex(0);
      return;
    }
    if (currentIndex >= lessonVocab.length) {
      setCurrentIndex(lessonVocab.length - 1);
    }
  }, [lessonVocab.length, currentIndex]);

  const currentVocab = lessonVocab[currentIndex];
  const patternExamples = currentVocab ? getVocabExamples(currentVocab) : [];
  const hasMultipleReadings =
    currentVocab != null &&
    parseReadingVariants(currentVocab.kana, currentVocab.romaji).length > 1;

  const frontTextTier =
    currentVocab != null
      ? flashcardTextTier(currentVocab.kanji, currentVocab.kana)
      : 'sm';
  const hasOptionalBrackets =
    currentVocab != null &&
    (hasOptionalBracketParts(currentVocab.kanji) ||
      hasOptionalBracketParts(currentVocab.kana) ||
      hasOptionalBracketParts(currentVocab.romaji));
  const frontTextTierClass = [
    frontTextTier === 'sm' ? '' : ` flashcard-text-dual--tier-${frontTextTier}`,
    hasOptionalBrackets ? ' flashcard-text-dual--optional-brackets' : '',
  ].join('');

  useEffect(() => {
    if (isPlayingAll || !currentVocab?.kana) return undefined;
    const timer = setTimeout(
      () => speakJapaneseThenMeaning(currentVocab.kana, currentVocab.meaning),
      200,
    );
    return () => clearTimeout(timer);
  }, [currentIndex, currentLesson, currentVocab?.kana, currentVocab?.meaning, isPlayingAll]);

  const handleNext = () => {
    if (!lessonVocab.length) return;
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % lessonVocab.length);
    }, 150);
  };

  const handlePrev = () => {
    if (!lessonVocab.length) return;
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + lessonVocab.length) % lessonVocab.length);
    }, 150);
  };

  const handlePrevRef = useRef(handlePrev);
  const handleNextRef = useRef(handleNext);
  const flipCardRef = useRef(() => {});
  const pronounceRef = useRef(() => {});
  handlePrevRef.current = handlePrev;
  handleNextRef.current = handleNext;
  flipCardRef.current = () => {
    setIsFlipped((prev) => {
      if (!prev && !vocabLoggedRef.current) {
        vocabLoggedRef.current = true;
        void logActivity('vocab');
      }
      return !prev;
    });
  };
  pronounceRef.current = () => {
    if (currentVocab?.kana) speakJapaneseThenMeaning(currentVocab.kana, currentVocab.meaning);
  };

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
      // Space / Enter: bỏ qua khi đang focus nút/link (để Enter vẫn bấm được nút)
      if (target?.closest('button, a, [role="button"]')) return;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
        flipCardRef.current();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        pronounceRef.current();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  const handlePronounce = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentVocab) speakJapaneseThenMeaning(currentVocab.kana, currentVocab.meaning);
  };

  const handleExamplePronounce = (e: React.MouseEvent, speak: string, meaning: string) => {
    e.stopPropagation();
    speakJapaneseThenMeaning(speak, meaning);
  };

  const handleStrokeCharClick = () => {
    if (currentVocab) speakJapaneseThenMeaning(currentVocab.kana, currentVocab.meaning);
  };

  const handleCopyVocab = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentVocab) return;
    const parts = [currentVocab.kanji, currentVocab.kana, currentVocab.romaji, currentVocab.meaning].filter(Boolean);
    copyFlashcard(parts.join('\t'));
  };

  const handlePlayAll = () => {
    startPlayAll(
      lessonVocab.flatMap((vocab, index) => {
        const clips: { text: string; lang: string; cue?: number }[] = [
          { text: vocab.kana, lang: 'ja-JP', cue: index },
        ];
        const meaning = meaningForSpeech(vocab.meaning);
        if (meaning) clips.push({ text: meaning, lang: 'vi-VN' });
        return clips;
      }),
      {
        onItemIndex: (index) => {
          setIsFlipped(false);
          setCurrentIndex(index);
        },
      },
    );
  };

  const isSearchActive = searchQuery.trim().length > 0;
  const searchHits = search?.hits ?? [];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
  };

  const handleSelectSearchHit = (hit: VocabularySearchHit) => {
    const lessonNumber = hit.lesson?.lessonNumber;
    if (!lessonNumber) return;
    stopPlayAll();
    setPendingVocabId(hit.id);
    goToLesson(lessonNumber);
    handleClearSearch();
  };

  const handleSelectWord = (index: number) => {
    if (index === currentIndex) return;
    stopPlayAll();
    setIsFlipped(false);
    setCurrentIndex(index);
  };

  const vocabHeader = (
    <div className="vocab-header vocab-header--compact">
      <div className="vocab-topbar">
        <h2 className="view-title vocab-topbar__title">{vocabTitle}</h2>
        <nav className="vocab-topbar__links" aria-label="Công cụ từ vựng">
          <Link href="/vocab" className="btn btn-outline btn-sm">
            ← Chọn bài
          </Link>
          <Link href={`/vocab/list?lesson=${currentLesson}`} className="btn btn-outline btn-sm">
            Danh sách từ
          </Link>
          <Link href="/vocab/quiz" className="btn btn-outline btn-sm">
            Trắc nghiệm JP ↔ VI
          </Link>
          <Link href="/kanji/quiz?source=minna" className="btn btn-outline btn-sm">
            TN Kanji (Minna)
          </Link>
          <Link href={`/vocab/picture?lesson=${currentLesson}`} className="btn btn-outline btn-sm">
            Từ điển tranh
          </Link>
          <Link href="/vocab/mindmap" className="btn btn-outline btn-sm">
            Sơ đồ tư duy
          </Link>
        </nav>
      </div>

      <div className="vocab-toolbar">
        {searchAllLessonsOn ? (
        <div className="vocab-search">
          <form className="vocab-search__form" onSubmit={handleSearchSubmit} role="search">
            <input
              type="search"
              className="vocab-word-list-search vocab-search__input"
              placeholder="Tra từ trên mọi bài: kanji, kana, romaji, nghĩa..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') handleClearSearch();
              }}
              aria-label="Tra từ vựng"
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={searching}>
              {searching ? 'Đang tìm...' : 'Tìm'}
            </button>
            {isSearchActive && (
              <button type="button" className="btn btn-nav btn-sm" onClick={handleClearSearch}>
                Xóa
              </button>
            )}
          </form>

          {isSearchActive && (
            <div className="vocab-search__panel glass-panel" role="region" aria-label="Kết quả tra từ vựng">
              {searching ? (
                <p className="kanji-search-status">Đang tìm...</p>
              ) : searchHits.length === 0 ? (
                <p className="kanji-search-status">Không tìm thấy từ phù hợp.</p>
              ) : (
                <>
                  <p className="kanji-search-status">
                    {search && search.total > searchHits.length
                      ? `Hiện ${searchHits.length} / ${search.total} kết quả — gõ cụ thể hơn để thu hẹp`
                      : `${searchHits.length} kết quả`}
                  </p>
                  <ul className="kanji-search-list vocab-search__list">
                    {searchHits.map((hit) => (
                      <li key={hit.id} className="vocab-search-row">
                        <button
                          type="button"
                          className="kanji-search-item"
                          onClick={() => handleSelectSearchHit(hit)}
                        >
                          <span className="kanji-search-char japanese-text">{hit.kanji || hit.kana}</span>
                          <span className="kanji-search-meta">
                            {hit.kanji ? <span className="japanese-text">{hit.kana} · </span> : null}
                            {hit.romaji ? `${hit.romaji} · ` : ''}
                            {hit.meaning}
                          </span>
                          {hit.lesson ? (
                            <span className="kanji-search-lesson">{lessonShortLabel(hit.lesson)}</span>
                          ) : null}
                        </button>
                        <button
                          type="button"
                          className="btn-audio-small"
                          title="Nghe phát âm"
                          aria-label={`Nghe ${hit.kana}`}
                          onClick={() => speakJapaneseThenMeaning(hit.kana, hit.meaning)}
                        >
                          🔊
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
        ) : null}

        <LessonSelector
          id="lesson-select"
          value={currentLesson}
          onChange={goToLesson}
        />
      </div>

      {lessonVocab.length > 0 && (
        <div className="vocab-playbar">
          <div className="vocab-progress">
            <div className="vocab-progress__track">
              <div
                className="vocab-progress__fill"
                style={{ width: `${((currentIndex + 1) / lessonVocab.length) * 100}%` }}
              />
            </div>
            <span className="vocab-progress__text">
              {currentIndex + 1} / {lessonVocab.length}
            </span>
          </div>
          <div className="vocab-playbar__controls">
            <PlayAllButton
              isPlaying={isPlayingAll}
              onPlay={handlePlayAll}
              onStop={stopPlayAll}
            />
            <button
              type="button"
              className="btn btn-nav btn-sm"
              onClick={handlePrev}
              aria-keyshortcuts="ArrowLeft"
              title="Từ trước (phím ←)"
            >
              ← Trước
            </button>
            <button
              type="button"
              className="btn btn-nav btn-sm"
              onClick={handleNext}
              aria-keyshortcuts="ArrowRight"
              title="Từ sau (phím →)"
            >
              Sau →
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const showBody = Boolean(currentVocab) || isAdmin;

  return (
    <div className="container vocab-view vocab-view--study">
      {loading ? (
        <>
          {vocabHeader}
          <div className="empty-state">
            <p>Đang tải dữ liệu...</p>
          </div>
        </>
      ) : showBody ? (
        <div className="vocab-body-layout">
          <VocabWordList
            lessonNumber={currentLesson}
            lessonId={lessonId}
            vocabularies={lessonVocab}
            currentIndex={currentIndex}
            expectedCount={expectedCount}
            onSelectWord={handleSelectWord}
          />

          <div className="vocab-main-layout">
          {vocabHeader}
          {currentVocab ? (
          <div className="flashcard-container">
            <div
              className={`flashcard ${isFlipped ? 'flipped' : ''}${
                hasMultipleReadings ? ' flashcard--multi-reading' : ''
              }`}
              onClick={() => {
                setIsFlipped(!isFlipped);
                if (!isFlipped && !vocabLoggedRef.current) {
                  vocabLoggedRef.current = true;
                  void logActivity('vocab');
                }
              }}
            >
              <div className="flashcard-face flashcard-front">
                <div className="flashcard-front-body">
                  <div className={`flashcard-text-dual${frontTextTierClass}`}>
                    {currentVocab.kanji ? (
                      <div className="flashcard-text-col flashcard-text-col--kanji">
                        <span className="flashcard-char-label">Kanji</span>
                        <FlashcardJapaneseText text={currentVocab.kanji} className="vocab-kanji japanese-text" />
                        <div className="flashcard-col-actions">
                          <button
                            type="button"
                            className="btn-audio btn-audio--card"
                            onClick={handlePronounce}
                            title="Nghe phát âm"
                          >
                            🔊
                          </button>
                          <KanjiStructureButton text={currentVocab.kanji} className="ks-open-btn--card" />
                        </div>
                      </div>
                    ) : null}
                    <div className="flashcard-text-col flashcard-text-col--kana">
                      <span className="flashcard-char-label">Kana</span>
                      <FlashcardJapaneseText text={currentVocab.kana} className="vocab-kana japanese-text" />
                      {!currentVocab.kanji ? (
                        <button
                          type="button"
                          className="btn-audio btn-audio--card"
                          onClick={handlePronounce}
                          title="Nghe phát âm"
                        >
                          🔊
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="flashcard-front-meta">
                    <button
                      type="button"
                      className={`vocab-copy-btn${flashcardCopied ? ' vocab-copy-btn--copied' : ''}`}
                      onClick={handleCopyVocab}
                      title="Sao chép từ vựng"
                    >
                      {flashcardCopied ? '✓ Đã copy' : '📋 Copy'}
                    </button>
                    <FlashcardJapaneseText text={currentVocab.romaji} className="vocab-romaji" />
                    <span className="vocab-meaning">{currentVocab.meaning}</span>
                    {currentVocab.pitchAccent ? (
                      <span className="vocab-pitch">Cao điệu {currentVocab.pitchAccent}</span>
                    ) : null}
                    {patternExamples?.map((example) => (
                      <div key={`front-${example.ja}`} className="vocab-pattern-example">
                        <div className="vocab-pattern-example-head">
                          <span className="vocab-pattern-example-label">Ví dụ</span>
                          <button
                            type="button"
                            className="btn-audio-small"
                            title="Nghe ví dụ"
                            aria-label="Nghe ví dụ"
                            onClick={(e) => handleExamplePronounce(e, example.speak, example.vi)}
                          >
                            🔊
                          </button>
                          <KanjiStructureButton text={example.ja} className="ks-open-btn--sm" />
                        </div>
                        <span className="vocab-pattern-example-ja japanese-text">{example.ja}</span>
                        {example.kana && example.kana !== example.ja ? (
                          <span className="vocab-pattern-example-kana">{example.kana}</span>
                        ) : null}
                        <span className="vocab-pattern-example-vi">{example.vi}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flashcard-face flashcard-back">
                <button type="button" className="btn-audio" onClick={handlePronounce} title="Nghe phát âm">
                  🔊
                </button>
                <VocabPicture
                  word={currentVocab.romaji}
                  meaning={currentVocab.meaning}
                  kana={currentVocab.kana}
                  kanji={currentVocab.kanji}
                  imageUrl={currentVocab.imageUrl}
                  size="sm"
                  className="flashcard-vocab-picture flashcard-vocab-picture-corner"
                  alt={currentVocab.kana}
                />
                <div
                  className={`flashcard-back-body${
                    hasOptionalBrackets ? ' flashcard-back-body--optional-brackets' : ''
                  }`}
                >
                  <FlashcardReadingStrokes
                    kanji={currentVocab.kanji}
                    kana={currentVocab.kana}
                    onCharClick={handleStrokeCharClick}
                  />
                  <div className="flashcard-back-meta">
                    <KanjiStructureButton text={currentVocab.kanji} withLabel />
                    <FlashcardJapaneseText
                      text={currentVocab.kana}
                      className="vocab-kana japanese-text"
                    />
                    <FlashcardJapaneseText text={currentVocab.romaji} className="vocab-romaji" />
                    <div className="divider"></div>
                    <span className="vocab-meaning">{currentVocab.meaning}</span>
                    {currentVocab.pitchAccent ? (
                      <span className="vocab-pitch">Cao điệu {currentVocab.pitchAccent}</span>
                    ) : null}
                    {patternExamples?.map((example) => (
                      <div key={`back-${example.ja}`} className="vocab-pattern-example">
                        <div className="vocab-pattern-example-head">
                          <span className="vocab-pattern-example-label">Ví dụ</span>
                          <button
                            type="button"
                            className="btn-audio-small"
                            title="Nghe ví dụ"
                            aria-label="Nghe ví dụ"
                            onClick={(e) => handleExamplePronounce(e, example.speak, example.vi)}
                          >
                            🔊
                          </button>
                          <KanjiStructureButton text={example.ja} className="ks-open-btn--sm" />
                        </div>
                        <span className="vocab-pattern-example-ja japanese-text">{example.ja}</span>
                        {example.kana && example.kana !== example.ja ? (
                          <span className="vocab-pattern-example-kana">{example.kana}</span>
                        ) : null}
                        <span className="vocab-pattern-example-vi">{example.vi}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          ) : (
            <div className="empty-state">
              <p>Chưa có từ trong bài này. Bấm Sửa → + Thêm để tạo từ mới.</p>
            </div>
          )}
          </div>
        </div>
      ) : (
        <>
          {vocabHeader}
          <div className="empty-state">
            <p>
              Dữ liệu từ vựng cho Bài {currentLesson} chưa có sẵn. Hãy chọn bài khác
              nhé!
            </p>
          </div>
        </>
      )}
    </div>
  );
}
