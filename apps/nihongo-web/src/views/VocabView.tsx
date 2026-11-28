'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { speakJapaneseThenMeaning, meaningForSpeech, playAudio } from '../utils/speech';
import { VocabExtraMeanings } from '../components/VocabReading';
import LessonSelector from '../components/LessonSelector';
import TextbookFrameworkNote from '../components/TextbookFrameworkNote';
import PlayAllButton from '../components/PlayAllButton';
import VocabWordList from '../components/VocabWordList';
import VocabExampleLine from '../components/VocabExampleLine';
import { usePlayAll } from '../hooks/usePlayAll';
import { useAuth } from '../hooks/useAuth';
import { useFeatureFlag, useGrammar, useLessons, useVocab, useVocabSearchQuery } from '../hooks/queries';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import StrokeOrder from '../components/StrokeOrder';
import {
  parseReadingVariants,
  flashcardTextTier,
  flashcardStrokeText,
  hasOptionalBracketParts,
} from '../utils/japanese';
import FlashcardJapaneseText from '../components/FlashcardJapaneseText';
import KanjiStructureButton from '../components/KanjiStructureButton';
import AlsoInBooks from '../components/AlsoInBooks';
import { getVocabExamples } from '../utils/vocabPatternExample';
import { logActivity } from '../api';
import SpeakerIcon from '../components/SpeakerIcon';
import './VocabView.css';
import { lessonHeading, lessonShortLabel } from '../utils/lessonHeading';
import type { VocabularySearchHit } from '../types/api';

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

/** Ngừng gõ bao lâu thì tự tra từ. Đủ ngắn để thấy như tức thì, đủ dài để không gọi API mỗi phím. */
const SEARCH_DEBOUNCE_MS = 300;

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
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  // Gõ tới đâu tìm tới đó: ngừng gõ SEARCH_DEBOUNCE_MS thì tự tìm, không cần bấm "Tìm" hay Enter
  const debouncedSearchInput = useDebouncedValue(searchInput.trim(), SEARCH_DEBOUNCE_MS);
  useEffect(() => {
    setSearchQuery(debouncedSearchInput);
  }, [debouncedSearchInput]);
  const [pendingVocabId, setPendingVocabId] = useState<number | null>(initialVocabId ?? null);
  const vocabLoggedRef = useRef(false);
  const { copied: flashcardCopied, copy: copyFlashcard } = useCopyText();
  const { isAdmin } = useAuth();
  const { data: lessons = [] } = useLessons();
  const { data: lessonVocab = [], isLoading: loading } = useVocab(currentLesson);
  const { data: lessonGrammar = [] } = useGrammar(currentLesson);
  const lessonGrammarLinks = useMemo(
    () =>
      lessonGrammar.map((g) => ({
        id: g.id,
        pattern: g.pattern,
        meaning: g.meaning,
        lessonNumber: currentLesson,
      })),
    [lessonGrammar, currentLesson],
  );
  const grammarLessonNumberById = useMemo(
    () => Object.fromEntries(lessons.map((lesson) => [lesson.id, lesson.lessonNumber])),
    [lessons],
  );
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

  const previousLessonRef = useRef(currentLesson);
  useEffect(() => {
    if (previousLessonRef.current === currentLesson) return;
    previousLessonRef.current = currentLesson;
    stopPlayAll();
    setCurrentIndex(0);
  }, [currentLesson, stopPlayAll]);

  // Mở từ vừa chọn trong kết quả tra từ khi danh sách của bài đó đã tải xong
  useEffect(() => {
    if (pendingVocabId == null || !lessonVocab.length) return;
    const idx = lessonVocab.findIndex((v) => v.id === pendingVocabId);
    if (idx >= 0) {
      setCurrentIndex(idx);
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
  // Vẽ đủ cách viết chính (kể cả kana xen trong kanji), không vẽ chú thích tùy chọn.
  const strokeText = currentVocab
    ? flashcardStrokeText(currentVocab.kanji, currentVocab.kana)
    : '';
  const strokeChars = [...strokeText];
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
  const isLongWord = frontTextTier === 'lg' || frontTextTier === 'xl' || hasOptionalBrackets;
  // Hero: ô nét viết là tâm thẻ — vẽ to hơn bố cục 3 cột cũ.
  const strokeSize = Math.max(
    24,
    Math.min(104, Math.floor(240 / Math.max(strokeChars.length, 1))),
  );

  useEffect(() => {
    if (!currentVocab || vocabLoggedRef.current) return;
    vocabLoggedRef.current = true;
    void logActivity('vocab');
  }, [currentVocab]);

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
    setCurrentIndex((prev) => (prev + 1) % lessonVocab.length);
  };

  const handlePrev = () => {
    if (!lessonVocab.length) return;
    setCurrentIndex((prev) => (prev - 1 + lessonVocab.length) % lessonVocab.length);
  };

  const handlePrevRef = useRef(handlePrev);
  const handleNextRef = useRef(handleNext);
  const pronounceRef = useRef(() => {});
  handlePrevRef.current = handlePrev;
  handleNextRef.current = handleNext;
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
      if (e.key === ' ' || e.code === 'Space' || e.key === 'Enter') {
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

  const handleExampleJapanese = (e: React.MouseEvent, speak: string) => {
    e.stopPropagation();
    if (speak.trim()) playAudio(speak, 'ja-JP');
  };

  const handleExampleVietnamese = (e: React.MouseEvent, meaning: string) => {
    e.stopPropagation();
    const text = meaningForSpeech(meaning) || meaning.trim();
    if (text) playAudio(text, 'vi-VN');
  };

  const handleStrokeCharClick = () => {
    if (currentVocab) speakJapaneseThenMeaning(currentVocab.kana, currentVocab.meaning);
  };

  const handleCopyVocab = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentVocab) return;
    copyFlashcard(currentVocab.kanji || currentVocab.kana);
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
    setCurrentIndex(index);
  };

  const vocabHeader = (
    <div className="vocab-header vocab-header--compact">
      <div className="vocab-topbar">
        <h2 className="view-title vocab-topbar__title">{vocabTitle}</h2>
        <TextbookFrameworkNote textbook={currentLessonMeta?.textbook} />
        <nav className="vocab-topbar__links" aria-label="Công cụ từ vựng">
          <Link href="/vocab" className="btn btn-outline btn-sm vocab-chip">
            <span className="vocab-chip__icon" aria-hidden="true">←</span>
            Chọn bài
          </Link>
          <Link href={`/vocab/list?lesson=${currentLesson}`} className="btn btn-outline btn-sm vocab-chip vocab-chip--accent">
            <span className="vocab-chip__icon" aria-hidden="true">☰</span>
            Danh sách từ
          </Link>
          <Link href="/vocab/quiz" className="btn btn-outline btn-sm vocab-chip">
            <span className="vocab-chip__icon vocab-chip__icon--tile" aria-hidden="true">✓</span>
            Trắc nghiệm JP ↔ VI
          </Link>
          <Link href="/kanji/quiz?source=minna" className="btn btn-outline btn-sm vocab-chip">
            <span className="vocab-chip__icon vocab-chip__icon--text" aria-hidden="true">TN</span>
            TN Kanji (Minna)
          </Link>
          <Link href={`/vocab/picture?lesson=${currentLesson}`} className="btn btn-outline btn-sm vocab-chip">
            <span className="vocab-chip__icon vocab-chip__icon--tile" aria-hidden="true">▣</span>
            Từ điển tranh
          </Link>
          <Link href="/vocab/mindmap" className="btn btn-outline btn-sm vocab-chip">
            <span className="vocab-chip__icon" aria-hidden="true">✳</span>
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
            <button type="submit" className="btn btn-primary btn-sm vocab-search__submit" disabled={searching}>
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
                <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
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
              {searching && !search ? (
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
                            {hit.meaningEn ? <span className="vocab-search__en" lang="en"> · {hit.meaningEn}</span> : null}
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

      </div>

      <div className="vocab-lesson-row">
        <LessonSelector
          id="lesson-select"
          value={currentLesson}
          onChange={goToLesson}
        />
      {lessonVocab.length > 0 && (
        <div className="vocab-playbar">
          <span className="vocab-progress__text">
            {currentIndex + 1}/{lessonVocab.length}
          </span>
          <div className="vocab-playbar__play">
            <PlayAllButton
              isPlaying={isPlayingAll}
              onPlay={handlePlayAll}
              onStop={stopPlayAll}
            />
          </div>
          <div className="vocab-playbar__controls">
            <button
              type="button"
              className="btn btn-nav btn-sm"
              onClick={handlePrev}
              aria-keyshortcuts="ArrowLeft"
              title="Từ trước (phím ←)"
            >
              ◂ Trước
            </button>
            <button
              type="button"
              className="btn btn-nav btn-sm"
              onClick={handleNext}
              aria-keyshortcuts="ArrowRight"
              title="Từ sau (phím →)"
            >
              Sau ▸
            </button>
          </div>
        </div>
      )}
      </div>
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
          <>
          <div className="flashcard-container">
            <div
              className={`flashcard${hasMultipleReadings ? ' flashcard--multi-reading' : ''}`}
            >
              <div className={`flashcard-face flashcard-front vocab-card vocab-card--hero${isLongWord ? ' vocab-card--long' : ''}`}>
                <span className="vocab-card__watermark" aria-hidden="true">
                  {String(currentIndex + 1).padStart(2, '0')}
                </span>
                <div className="vocab-card__toolbar" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className={`vocab-copy-btn${flashcardCopied ? ' vocab-copy-btn--copied' : ''}`}
                    onClick={handleCopyVocab}
                    title="Sao chép từ vựng"
                  >
                    {flashcardCopied ? '✓ Đã copy' : 'Copy ⧉'}
                  </button>
                </div>
                <div className="flashcard-front-body">
                  <div className="vocab-card__hero">
                    <div
                      className="vocab-card__strokes vocab-card__strokes--hero"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <StrokeOrder
                        key={`front-${currentVocab.id}`}
                        text={strokeText}
                        width={strokeSize}
                        height={strokeSize}
                        compact
                        rainbow
                        onCharClick={handleStrokeCharClick}
                      />
                      <span className="sr-only">Nhấp vào chữ để tập viết</span>
                    </div>
                    <div className="vocab-card__word">
                      {currentVocab.kanji && currentVocab.kanji !== currentVocab.kana ? (
                        <p className="vocab-card__spelling japanese-text">
                          {currentVocab.kanji}
                          <span>（{currentVocab.kana}）</span>
                        </p>
                      ) : null}
                      <p
                        className="vocab-card__reading japanese-text"
                        aria-label={`Cách đọc: ${currentVocab.kana}`}
                      >
                        {currentVocab.kana}
                      </p>
                      <div className="flashcard-front-meta vocab-card__meta">
                        <p className="vocab-card__headline">
                          <FlashcardJapaneseText text={currentVocab.romaji} className="vocab-romaji" />
                          <span className="vocab-card__sep" aria-hidden="true">
                            |
                          </span>
                          <span className="vocab-meaning">{currentVocab.meaning}</span>
                        </p>
                        <div className="vocab-card__tags">
                          <span className="vocab-card__type-tag">TỪ</span>
                          <VocabExtraMeanings vocab={currentVocab} />
                        </div>
                        <AlsoInBooks books={currentVocab.alsoInTextbooks} />
                        {currentVocab.pitchAccent ? (
                          <span className="vocab-pitch">Cao điệu {currentVocab.pitchAccent}</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="vocab-card__hero-actions" onClick={(e) => e.stopPropagation()}>
                      <KanjiStructureButton
                        text={currentVocab.kanji}
                        withLabel
                        className="ks-open-btn--sm"
                      />
                      <button
                        type="button"
                        className="vocab-round-btn vocab-round-btn--soft"
                        onClick={handlePronounce}
                        title="Nghe phát âm"
                        aria-label="Nghe phát âm"
                      >
                        <SpeakerIcon className="vocab-speaker-icon" size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {patternExamples?.length ? (
            <section className="vocab-examples" aria-label="Ví dụ">
              <div className="vocab-examples__head">
                <span className="vocab-card__examples-label">Ví dụ</span>
                <div className="vocab-examples__head-actions">
                  <KanjiStructureButton text={patternExamples[0].ja} className="ks-open-btn--sm" />
                </div>
              </div>
              <div className="vocab-examples__body vocab-examples__body--stack">
                <div className="vocab-examples__copy">
                  <ul className="vocab-examples__list">
                    {patternExamples.map((example) => (
                      <VocabExampleLine
                        key={`ex-${example.ja}`}
                        example={example}
                        focusKanji={currentVocab.kanji}
                        focusMeaning={currentVocab.meaning}
                        focusKana={currentVocab.kana}
                        focusRomaji={currentVocab.romaji}
                        imageUrl={currentVocab.imageUrl}
                        lessonNumber={currentLesson}
                        lessonGrammars={lessonGrammarLinks}
                        grammarLessonNumberById={grammarLessonNumberById}
                        onSpeakJa={handleExampleJapanese}
                        onSpeakVi={handleExampleVietnamese}
                        onSpeakBoth={handleExamplePronounce}
                      />
                    ))}
                  </ul>
                  <p className="vocab-examples__note">
                    Bấm câu Nhật để nghe JA · bấm bản Việt để nghe VI · tab Detailed / Clean typography ·
                    EN: dịch máy
                  </p>
                </div>
              </div>
            </section>
          ) : null}
          </>
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
