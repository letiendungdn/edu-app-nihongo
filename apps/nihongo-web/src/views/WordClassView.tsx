'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import PlayAllButton from '../components/PlayAllButton';
import StrokeOrder from '../components/StrokeOrder';
import { usePlayAll } from '../hooks/usePlayAll';
import { useAuth } from '../hooks/useAuth';
import { useLessons, useVocabRangeQuery } from '../hooks/queries';
import { queryKeys } from '../api/query-keys';
import {
  createVocabulary,
  deleteVocabulary,
  reorderVocabularies,
  updateVocabulary,
  type VocabularyWithLesson,
} from '../api';
import { playAudio } from '../utils/speech';
import {
  WORD_CLASS_TABS,
  classifyMinnaWord,
  wordClassLabel,
  type MinnaWordClass,
  type WordClassTabId,
} from '../utils/minnaWordClass';
import './WordClassView.css';

function WordClassPopup({
  item,
  token,
  isAdmin,
  onClose,
  onSaved,
}: {
  item: ClassifiedWord;
  token?: string;
  isAdmin: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ kanji: item.kanji ?? '', kana: item.kana, romaji: item.romaji, meaning: item.meaning });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const text = item.kanji || item.kana;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleCopy() {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  async function handleSave() {
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      await updateVocabulary(item.id, {
        kanji: draft.kanji.trim() || null,
        kana: draft.kana.trim(),
        romaji: draft.romaji.trim(),
        meaning: draft.meaning.trim(),
        lessonId: item.lessonId,
        partOfSpeech: item.wordClass,
      }, token);
      onSaved();
      setEditing(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Lỗi lưu');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wc-popup-overlay" onClick={onClose}>
      <div className="wc-popup" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>

        {/* Top bar */}
        <div className="wc-popup-topbar">
          <div className="wc-popup-topbar-left">
            <button className="wc-popup-icon-btn" onClick={() => void playAudio(item.kana)} title="Nghe phát âm">🔊</button>
            <button className="wc-popup-icon-btn" onClick={handleCopy} title="Sao chép">
              {copied ? '✓' : '📋'}
            </button>
            {isAdmin && (
              <button className="wc-popup-icon-btn wc-popup-edit-btn" onClick={() => { setEditing((v) => !v); setErr(null); }} title="Sửa">
                {editing ? '✕ Hủy' : '✎ Sửa'}
              </button>
            )}
          </div>
          <button className="wc-popup-close" onClick={onClose} aria-label="Đóng">✕</button>
        </div>

        {/* Header */}
        <div className="wc-popup-header">
          <span className="wc-popup-ja japanese-text">{text}</span>
          {item.kanji && <span className="wc-popup-kana japanese-text">{item.kana}</span>}
          <span className="wc-popup-romaji">{item.romaji}</span>
          <span className="wc-popup-tag">{wordClassLabel(item.wordClass)} · Bài {item.lessonNumber}</span>
        </div>

        {/* Stroke order */}
        <div className="wc-popup-stroke">
          <StrokeOrder text={text} width={180} height={180} />
          <p className="wc-popup-stroke-hint">Nhấn vào chữ để xem lại nét</p>
        </div>

        <p className="wc-popup-vi">{item.meaning}</p>

        {/* Admin edit form */}
        {editing && (
          <div className="wc-popup-edit-form">
            {err && <p className="wc-popup-edit-err">{err}</p>}
            <label className="wc-popup-edit-field">
              <span>Kanji</span>
              <input className="japanese-text" value={draft.kanji} disabled={busy}
                onChange={(e) => setDraft((d) => ({ ...d, kanji: e.target.value }))} placeholder="Tuỳ chọn" />
            </label>
            <label className="wc-popup-edit-field">
              <span>Kana *</span>
              <input className="japanese-text" value={draft.kana} disabled={busy}
                onChange={(e) => setDraft((d) => ({ ...d, kana: e.target.value }))} />
            </label>
            <label className="wc-popup-edit-field">
              <span>Romaji *</span>
              <input value={draft.romaji} disabled={busy}
                onChange={(e) => setDraft((d) => ({ ...d, romaji: e.target.value }))} />
            </label>
            <label className="wc-popup-edit-field">
              <span>Nghĩa *</span>
              <input value={draft.meaning} disabled={busy}
                onChange={(e) => setDraft((d) => ({ ...d, meaning: e.target.value }))} />
            </label>
            <div className="wc-popup-edit-actions">
              <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => void handleSave()}>
                {busy ? 'Đang lưu…' : 'Lưu'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type ClassifiedWord = VocabularyWithLesson & {
  wordClass: MinnaWordClass;
};

type Draft = {
  kanji: string;
  kana: string;
  romaji: string;
  meaning: string;
  lessonId: number;
  partOfSpeech: MinnaWordClass;
};

function emptyDraft(partOfSpeech: MinnaWordClass, lessonId: number): Draft {
  return {
    kanji: '',
    kana: '',
    romaji: '',
    meaning: '',
    lessonId,
    partOfSpeech,
  };
}

function matchesWord(item: ClassifiedWord, query: string): boolean {
  const haystack = [item.kanji, item.kana, item.romaji, item.meaning, `bài ${item.lessonNumber}`]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

function sortClassifiedWords(a: ClassifiedWord, b: ClassifiedWord): number {
  if (a.lessonNumber !== b.lessonNumber) return a.lessonNumber - b.lessonNumber;
  const orderA = a.sortOrder ?? 0;
  const orderB = b.sortOrder ?? 0;
  if (orderA !== orderB) return orderA - orderB;
  return a.id - b.id;
}

function lessonVocabOrder(
  all: ClassifiedWord[],
  lessonId: number,
): ClassifiedWord[] {
  return all.filter((item) => item.lessonId === lessonId).sort(sortClassifiedWords);
}

const HINTS: Record<WordClassTabId, string> = {
  noun: 'Danh từ (名詞) — người, đồ vật, chỗ, thời gian. Nhiều từ Minna hết い vẫn là danh từ: 学生・世界・先生.',
  'i-adj': 'Tính từ い (い形容詞) — chia trực tiếp: 高い → 高くない / 高かった. Bấm thẻ để nghe.',
  'na-adj': 'Tính từ な (な形容詞) — trong sách ghi ［な］: 静かな町, きれいな花. Trước です không thêm な.',
  verb: 'Động từ Minna học ở dạng ます (丁寧形). 食べます・行きます・結婚します đều vào nhóm này.',
  other: 'Câu chào, phó từ, hậu tố đếm (～回・－歳), mẫu ～さん… — không xếp vào danh / tính / động từ.',
};

export default function WordClassView() {
  const { isAdmin, token } = useAuth();
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useVocabRangeQuery(1, 50);
  const { data: lessons = [] } = useLessons();
  const [activeId, setActiveId] = useState<WordClassTabId>('noun');
  const [searchQuery, setSearchQuery] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft('noun', 0));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderedItems, setOrderedItems] = useState<ClassifiedWord[]>([]);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [popupItem, setPopupItem] = useState<ClassifiedWord | null>(null);
  const { isPlayingAll, startPlayAll, stopPlayAll } = usePlayAll();

  const canEdit = isAdmin && editMode;
  const searchActive = searchQuery.trim().length > 0;
  const canReorder =
    canEdit &&
    !searchActive &&
    !adding &&
    editingId == null &&
    !busy;
  const lessonOptions = useMemo(
    () => lessons.filter((lesson) => lesson.lessonNumber >= 1 && lesson.lessonNumber <= 50),
    [lessons],
  );

  const classified = useMemo<ClassifiedWord[]>(
    () =>
      data.map((entry) => ({
        ...entry,
        wordClass: classifyMinnaWord(entry),
      })),
    [data],
  );

  const counts = useMemo(() => {
    const next: Record<MinnaWordClass, number> = {
      noun: 0,
      'i-adj': 0,
      'na-adj': 0,
      verb: 0,
      other: 0,
    };
    for (const item of classified) next[item.wordClass] += 1;
    return next;
  }, [classified]);

  const items = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return classified
      .filter((item) => {
        if (item.wordClass !== activeId) return false;
        if (!q) return true;
        return matchesWord(item, q);
      })
      .sort(sortClassifiedWords);
  }, [classified, activeId, searchQuery]);

  useEffect(() => {
    setOrderedItems(items);
  }, [items]);

  const displayItems = canReorder ? orderedItems : items;

  const defaultLessonId = lessonOptions[0]?.id ?? 0;

  async function invalidateVocab() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.vocab.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.lessons.all });
  }

  function toggleEditMode() {
    stopPlayAll();
    setEditMode((on) => {
      if (on) {
        setAdding(false);
        setEditingId(null);
        setError(null);
      }
      return !on;
    });
  }

  function startAdd() {
    setEditingId(null);
    setAdding((on) => {
      if (on) return false;
      setDraft(emptyDraft(activeId, defaultLessonId));
      setError(null);
      return true;
    });
  }

  function startEdit(item: ClassifiedWord) {
    setAdding(false);
    setEditingId(item.id);
    setDraft({
      kanji: item.kanji ?? '',
      kana: item.kana,
      romaji: item.romaji,
      meaning: item.meaning,
      lessonId: item.lessonId,
      partOfSpeech: item.wordClass,
    });
    setError(null);
  }

  function validateDraft(): Draft | null {
    const kana = draft.kana.trim();
    const romaji = draft.romaji.trim();
    const meaning = draft.meaning.trim();
    const kanji = draft.kanji.trim();
    if (!kana || !romaji || !meaning) {
      setError('Điền đủ kana, romaji và nghĩa');
      return null;
    }
    if (!draft.lessonId) {
      setError('Chọn bài học');
      return null;
    }
    return { ...draft, kana, romaji, meaning, kanji };
  }

  async function saveEdit() {
    if (!token || editingId == null) return;
    const next = validateDraft();
    if (!next) return;
    setBusy(true);
    setError(null);
    try {
      await updateVocabulary(
        editingId,
        {
          kanji: next.kanji || null,
          kana: next.kana,
          romaji: next.romaji,
          meaning: next.meaning,
          lessonId: next.lessonId,
          partOfSpeech: next.partOfSpeech,
        },
        token,
      );
      setEditingId(null);
      if (next.partOfSpeech !== activeId) setActiveId(next.partOfSpeech);
      await invalidateVocab();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không lưu được');
    } finally {
      setBusy(false);
    }
  }

  async function handleAdd() {
    if (!token) return;
    const next = validateDraft();
    if (!next) return;
    setBusy(true);
    setError(null);
    try {
      await createVocabulary(
        {
          lessonId: next.lessonId,
          kana: next.kana,
          romaji: next.romaji,
          meaning: next.meaning,
          partOfSpeech: next.partOfSpeech,
          ...(next.kanji ? { kanji: next.kanji } : {}),
        },
        token,
      );
      setAdding(false);
      if (next.partOfSpeech !== activeId) setActiveId(next.partOfSpeech);
      await invalidateVocab();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thêm được');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: number) {
    if (!token) return;
    if (!window.confirm('Xóa từ này? Từ cũng mất ở trang Từ vựng / flashcard.')) return;
    setBusy(true);
    setError(null);
    try {
      await deleteVocabulary(id, token);
      if (editingId === id) setEditingId(null);
      await invalidateVocab();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không xóa được');
    } finally {
      setBusy(false);
    }
  }

  async function persistLessonOrder(lessonId: number, orderedIds: number[]) {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await reorderVocabularies(lessonId, orderedIds, token);
      await invalidateVocab();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không sắp xếp được');
      setOrderedItems(items);
    } finally {
      setBusy(false);
      setDraggingId(null);
    }
  }

  function handleDrop(targetId: number) {
    if (!canReorder || draggingId == null || draggingId === targetId) {
      setDraggingId(null);
      return;
    }

    const dragged = orderedItems.find((item) => item.id === draggingId);
    const target = orderedItems.find((item) => item.id === targetId);
    if (!dragged || !target) {
      setDraggingId(null);
      return;
    }

    if (dragged.lessonId !== target.lessonId) {
      setError('Chỉ sắp xếp được từ trong cùng một bài Minna (cùng số bài).');
      setDraggingId(null);
      return;
    }

    const lessonItems = lessonVocabOrder(classified, dragged.lessonId);
    const from = lessonItems.findIndex((item) => item.id === draggingId);
    const to = lessonItems.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) {
      setDraggingId(null);
      return;
    }

    const nextLesson = [...lessonItems];
    const [moved] = nextLesson.splice(from, 1);
    nextLesson.splice(to, 0, moved);

    const nextTabItems = [...orderedItems];
    const tabFrom = nextTabItems.findIndex((item) => item.id === draggingId);
    const tabTo = nextTabItems.findIndex((item) => item.id === targetId);
    if (tabFrom >= 0 && tabTo >= 0) {
      const [movedTab] = nextTabItems.splice(tabFrom, 1);
      nextTabItems.splice(tabTo, 0, movedTab);
      setOrderedItems(nextTabItems);
    }

    void persistLessonOrder(
      dragged.lessonId,
      nextLesson.map((item) => item.id),
    );
  }

  const handlePlayAll = () => {
    startPlayAll(displayItems.map((item) => item.kana));
  };

  function renderForm(onSave: () => void, onCancel: () => void, saveLabel: string) {
    return (
      <div className="word-class-admin-form">
        <input
          className="japanese-text"
          placeholder="Kanji (tuỳ chọn)"
          value={draft.kanji}
          disabled={busy}
          onChange={(e) => setDraft({ ...draft, kanji: e.target.value })}
        />
        <input
          className="japanese-text"
          placeholder="Kana *"
          value={draft.kana}
          disabled={busy}
          onChange={(e) => setDraft({ ...draft, kana: e.target.value })}
        />
        <input
          placeholder="Romaji *"
          value={draft.romaji}
          disabled={busy}
          onChange={(e) => setDraft({ ...draft, romaji: e.target.value })}
        />
        <input
          placeholder="Nghĩa *"
          value={draft.meaning}
          disabled={busy}
          onChange={(e) => setDraft({ ...draft, meaning: e.target.value })}
        />
        <label className="word-class-admin-field">
          <span>Loại từ</span>
          <select
            value={draft.partOfSpeech}
            disabled={busy}
            onChange={(e) =>
              setDraft({ ...draft, partOfSpeech: e.target.value as MinnaWordClass })
            }
          >
            {WORD_CLASS_TABS.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
              </option>
            ))}
          </select>
        </label>
        <label className="word-class-admin-field">
          <span>Bài Minna</span>
          <select
            value={draft.lessonId}
            disabled={busy}
            onChange={(e) => setDraft({ ...draft, lessonId: Number(e.target.value) })}
          >
            {lessonOptions.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                Bài {lesson.lessonNumber}
              </option>
            ))}
          </select>
        </label>
        <div className="word-class-admin-form-actions">
          <button type="button" className="btn btn-primary" disabled={busy} onClick={onSave}>
            {saveLabel}
          </button>
          <button type="button" className="btn btn-nav" disabled={busy} onClick={onCancel}>
            Hủy
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container word-class-view">
        <p className="word-class-empty">Đang tải từ vựng Minna bài 1–50...</p>
      </div>
    );
  }

  return (
    <div className="container word-class-view">
      {popupItem && (
        <WordClassPopup
          item={popupItem}
          token={token ?? undefined}
          isAdmin={isAdmin}
          onClose={() => setPopupItem(null)}
          onSaved={() => { setPopupItem(null); void invalidateVocab(); }}
        />
      )}
      <div className="word-class-header">
        <h2 className="view-title word-class-view-title">Loại từ</h2>
        <p className="word-class-subtitle">
          Phân loại từ vựng <strong>Minna no Nihongo bài 1–50</strong> thành danh từ, tính từ い / な
          và động từ. Hậu tố 接尾語 học riêng tại{' '}
          <Link href="/suffixes">trang Hậu tố</Link>.
        </p>

        <div className="word-class-tabs">
          {WORD_CLASS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`tab-btn ${activeId === tab.id ? 'active' : ''}`}
              onClick={() => {
                stopPlayAll();
                setActiveId(tab.id);
                setAdding(false);
                setEditingId(null);
              }}
            >
              {tab.label}
              <span className="word-class-tab-count">{counts[tab.id]}</span>
            </button>
          ))}
        </div>

        <label className="word-class-search">
          <span className="sr-only">Tìm từ</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm: たべます, 新しい, học sinh…"
            autoComplete="off"
          />
        </label>
      </div>

      <div className="word-class-panel">
        <div className="word-class-hint-box">
          <p className="word-class-hint-text">{HINTS[activeId]}</p>
        </div>

        <div className="word-class-toolbar">
          <span className="word-class-count">
            {displayItems.length} từ · {wordClassLabel(activeId)}
          </span>
          <div className="word-class-toolbar-actions">
            {isAdmin && (
              <div className="word-class-admin-toolbar">
                <button
                  type="button"
                  className={`word-class-admin-toggle${editMode ? ' word-class-admin-toggle--on' : ''}`}
                  disabled={busy}
                  onClick={toggleEditMode}
                >
                  {editMode ? 'Xong' : 'Sửa'}
                </button>
                {canEdit && (
                  <button
                    type="button"
                    className="word-class-admin-add"
                    disabled={busy || lessonOptions.length === 0}
                    onClick={startAdd}
                  >
                    {adding ? 'Hủy thêm' : '+ Thêm'}
                  </button>
                )}
              </div>
            )}
            <PlayAllButton
              isPlaying={isPlayingAll}
              onPlay={handlePlayAll}
              onStop={stopPlayAll}
              label="Phát tất cả"
              disabled={displayItems.length === 0}
            />
          </div>
        </div>

        {canReorder && (
          <p className="word-class-reorder-hint">
            Kéo thả thẻ (⋮⋮) để sắp xếp — chỉ trong cùng bài Minna. Tắt ô tìm kiếm khi sắp xếp.
          </p>
        )}

        {error ? <p className="word-class-admin-error">{error}</p> : null}

        {canEdit && adding
          ? renderForm(
              () => void handleAdd(),
              () => setAdding(false),
              'Lưu từ mới',
            )
          : null}

        {displayItems.length === 0 && !(canEdit && adding) ? (
          <p className="word-class-empty">Không tìm thấy từ phù hợp.</p>
        ) : (
          <div className="word-class-grid">
            {displayItems.map((item) => {
              if (canEdit && editingId === item.id) {
                return (
                  <div key={item.id} className="word-class-card word-class-card--editing">
                    {renderForm(
                      () => void saveEdit(),
                      () => setEditingId(null),
                      'Lưu',
                    )}
                  </div>
                );
              }

              if (canEdit) {
                return (
                  <div
                    key={item.id}
                    className={`word-class-card word-class-card--admin${
                      draggingId === item.id ? ' word-class-card--dragging' : ''
                    }`}
                    draggable={canReorder}
                    onDragStart={() => canReorder && setDraggingId(item.id)}
                    onDragEnd={() => setDraggingId(null)}
                    onDragOver={(e) => {
                      if (canReorder) e.preventDefault();
                    }}
                    onDrop={() => handleDrop(item.id)}
                  >
                    {canReorder && (
                      <span className="word-class-drag" title="Kéo thả để sắp xếp" aria-hidden>
                        ⋮⋮
                      </span>
                    )}
                    <span className="word-class-badge">Bài {item.lessonNumber}</span>
                    {item.kanji ? (
                      <span className="word-class-kanji japanese-text">{item.kanji}</span>
                    ) : null}
                    <span className="word-class-kana japanese-text">{item.kana}</span>
                    <span className="word-class-romaji">{item.romaji}</span>
                    <span className="word-class-vi">{item.meaning}</span>
                    <div className="word-class-admin-row-actions">
                      <button type="button" disabled={busy} onClick={() => startEdit(item)}>
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="word-class-admin-delete"
                        disabled={busy}
                        onClick={() => void handleDelete(item.id)}
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <button
                  key={`${item.wordClass}-${item.id}`}
                  type="button"
                  className={`word-class-card word-class-card--${item.wordClass}`}
                  onClick={() => setPopupItem(item)}
                >
                  <span className="word-class-badge">Bài {item.lessonNumber}</span>
                  {item.kanji ? (
                    <span className="word-class-kanji japanese-text">{item.kanji}</span>
                  ) : null}
                  <span className="word-class-kana japanese-text">{item.kana}</span>
                  <span className="word-class-romaji">{item.romaji}</span>
                  <span className="word-class-vi">{item.meaning}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
