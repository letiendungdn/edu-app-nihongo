'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  createKanjiVocab,
  deleteKanjiVocab,
  reorderKanjiVocab,
  updateKanjiVocab,
} from '../api';
import { queryKeys } from '../hooks/queries';
import { useAuth } from '../hooks/useAuth';
import type { KanjiVocabItem } from '../types/api';
import SpeakerIcon from './SpeakerIcon';
import KanjiStructureButton from './KanjiStructureButton';

type Props = {
  kanjiEntryId: number;
  lessonNumber: number;
  vocabularies: KanjiVocabItem[];
  onPronounce: (e: React.MouseEvent, reading: string) => void;
};

type Draft = {
  word: string;
  reading: string;
  meaningVi: string;
  exampleJa: string;
  exampleVi: string;
};

const emptyDraft = (): Draft => ({
  word: '',
  reading: '',
  meaningVi: '',
  exampleJa: '',
  exampleVi: '',
});

export default function KanjiVocabSidepanel({
  kanjiEntryId,
  lessonNumber,
  vocabularies,
  onPronounce,
}: Props) {
  const { isAdmin, token } = useAuth();
  const queryClient = useQueryClient();
  const [items, setItems] = useState<KanjiVocabItem[]>(vocabularies);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState<Draft>(emptyDraft());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    setItems(vocabularies);
    setEditingId(null);
    setAdding(false);
    setError(null);
  }, [vocabularies, kanjiEntryId]);

  const canEdit = isAdmin && editMode;
  const showPanel = isAdmin || items.length > 0;
  if (!showPanel) return null;

  function toggleEditMode() {
    setEditMode((on) => {
      if (on) {
        setAdding(false);
        setEditingId(null);
        setError(null);
      }
      return !on;
    });
  }

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.kanjiEntries(lessonNumber) });
  }

  async function persistOrder(next: KanjiVocabItem[]) {
    if (!token || !canEdit) return;
    setBusy(true);
    setError(null);
    try {
      await reorderKanjiVocab(
        kanjiEntryId,
        next.map((v) => v.id),
        token,
      );
      await invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không sắp xếp được');
      setItems(vocabularies);
    } finally {
      setBusy(false);
    }
  }

  function handleDrop(targetId: number) {
    if (!canEdit || draggingId == null || draggingId === targetId) return;
    const from = items.findIndex((x) => x.id === draggingId);
    const to = items.findIndex((x) => x.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next);
    setDraggingId(null);
    void persistOrder(next);
  }

  function startEdit(item: KanjiVocabItem) {
    setAdding(false);
    setEditingId(item.id);
    setDraft({
      word: item.word,
      reading: item.reading,
      meaningVi: item.meaningVi,
      exampleJa: item.exampleJa ?? '',
      exampleVi: item.exampleVi ?? '',
    });
  }

  async function saveEdit() {
    if (!token || editingId == null) return;
    const word = draft.word.trim();
    const reading = draft.reading.trim();
    const meaningVi = draft.meaningVi.trim();
    const exampleJa = draft.exampleJa.trim() || null;
    const exampleVi = draft.exampleVi.trim() || null;
    if (!word || !reading || !meaningVi) {
      setError('Điền đủ từ, cách đọc và nghĩa');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updateKanjiVocab(
        editingId,
        { word, reading, meaningVi, exampleJa, exampleVi },
        token,
      );
      setEditingId(null);
      await invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không lưu được');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: number) {
    if (!token) return;
    if (!window.confirm('Xóa từ vựng này?')) return;
    setBusy(true);
    setError(null);
    try {
      await deleteKanjiVocab(id, token);
      await invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không xóa được');
    } finally {
      setBusy(false);
    }
  }

  async function handleAdd() {
    if (!token) return;
    const word = addDraft.word.trim();
    const reading = addDraft.reading.trim();
    const meaningVi = addDraft.meaningVi.trim();
    const exampleJa = addDraft.exampleJa.trim() || null;
    const exampleVi = addDraft.exampleVi.trim() || null;
    if (!word || !reading || !meaningVi) {
      setError('Điền đủ từ, cách đọc và nghĩa');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createKanjiVocab(
        kanjiEntryId,
        { word, reading, meaningVi, exampleJa, exampleVi },
        token,
      );
      setAddDraft(emptyDraft());
      setAdding(false);
      await invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thêm được');
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="kanji-vocab-sidepanel glass-panel kanji-vocab-list">
      <div className="kanji-vocab-list-head">
        <h3>Từ vựng liên quan</h3>
        {isAdmin && (
          <div className="kanji-vocab-admin-toolbar">
            <button
              type="button"
              className={`kanji-vocab-admin-toggle${editMode ? ' kanji-vocab-admin-toggle--on' : ''}`}
              disabled={busy}
              onClick={toggleEditMode}
              title={editMode ? 'Tắt chỉnh sửa' : 'Bật chỉnh sửa'}
            >
              {editMode ? 'Xong' : 'Sửa'}
            </button>
            {canEdit && (
              <button
                type="button"
                className="kanji-vocab-admin-add"
                disabled={busy}
                onClick={() => {
                  setEditingId(null);
                  setAdding((v) => !v);
                  setAddDraft(emptyDraft());
                  setError(null);
                }}
              >
                {adding ? 'Hủy' : '+ Thêm'}
              </button>
            )}
          </div>
        )}
      </div>

      {error && <p className="kanji-vocab-admin-error">{error}</p>}

      {canEdit && adding && (
        <div className="kanji-vocab-admin-form">
          <input
            className="japanese-text"
            placeholder="Từ (一本)"
            value={addDraft.word}
            onChange={(e) => setAddDraft((d) => ({ ...d, word: e.target.value }))}
          />
          <input
            className="japanese-text"
            placeholder="Cách đọc (いっぽん)"
            value={addDraft.reading}
            onChange={(e) => setAddDraft((d) => ({ ...d, reading: e.target.value }))}
          />
          <input
            placeholder="Nghĩa tiếng Việt"
            value={addDraft.meaningVi}
            onChange={(e) => setAddDraft((d) => ({ ...d, meaningVi: e.target.value }))}
          />
          <input
            className="japanese-text"
            placeholder="Ví dụ JP (ペンが一本あります。)"
            value={addDraft.exampleJa}
            onChange={(e) => setAddDraft((d) => ({ ...d, exampleJa: e.target.value }))}
          />
          <input
            placeholder="Ví dụ VI (Có một cây bút.)"
            value={addDraft.exampleVi}
            onChange={(e) => setAddDraft((d) => ({ ...d, exampleVi: e.target.value }))}
          />
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void handleAdd()}>
            Lưu từ mới
          </button>
        </div>
      )}

      <ul>
        {items.map((v) => (
          <li
            key={v.id}
            className={`kanji-vocab-item${canEdit ? ' kanji-vocab-item--admin' : ''}${
              draggingId === v.id ? ' kanji-vocab-item--dragging' : ''
            }`}
            draggable={canEdit && editingId == null && !busy}
            onDragStart={() => canEdit && setDraggingId(v.id)}
            onDragOver={(e) => {
              if (canEdit) e.preventDefault();
            }}
            onDrop={() => handleDrop(v.id)}
            onDragEnd={() => setDraggingId(null)}
          >
            {canEdit && (
              <span className="kanji-vocab-drag" title="Kéo thả để sắp xếp" aria-hidden>
                ⠿
              </span>
            )}

            <button
              className="kanji-vocab-audio"
              onClick={(e) => onPronounce(e, v.reading)}
              title="Nghe"
              aria-label={`Nghe ${v.reading}`}
              type="button"
            >
              <SpeakerIcon size={15} />
            </button>

            {canEdit && editingId === v.id ? (
              <div className="kanji-vocab-admin-form kanji-vocab-admin-form--inline">
                <input
                  className="japanese-text"
                  value={draft.word}
                  onChange={(e) => setDraft((d) => ({ ...d, word: e.target.value }))}
                />
                <input
                  className="japanese-text"
                  value={draft.reading}
                  onChange={(e) => setDraft((d) => ({ ...d, reading: e.target.value }))}
                />
                <input
                  value={draft.meaningVi}
                  onChange={(e) => setDraft((d) => ({ ...d, meaningVi: e.target.value }))}
                />
                <input
                  className="japanese-text"
                  placeholder="Ví dụ JP"
                  value={draft.exampleJa}
                  onChange={(e) => setDraft((d) => ({ ...d, exampleJa: e.target.value }))}
                />
                <input
                  placeholder="Ví dụ VI"
                  value={draft.exampleVi}
                  onChange={(e) => setDraft((d) => ({ ...d, exampleVi: e.target.value }))}
                />
                <div className="kanji-vocab-admin-actions">
                  <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void saveEdit()}>
                    Lưu
                  </button>
                  <button
                    type="button"
                    className="btn btn-nav"
                    disabled={busy}
                    onClick={() => setEditingId(null)}
                  >
                    Hủy
                  </button>
                </div>
              </div>
            ) : (
              <div className="kanji-vocab-item-body">
                <div className="kanji-vocab-item-main">
                  <span className="japanese-text">{v.word}</span>
                  <span className="kanji-vocab-reading">（{v.reading}）</span>
                  <span className="kanji-vocab-meaning">— {v.meaningVi}</span>
                  <KanjiStructureButton text={v.word} className="ks-open-btn--sm" />
                  {canEdit && (
                    <div className="kanji-vocab-admin-actions">
                      <button type="button" title="Sửa" disabled={busy} onClick={() => startEdit(v)}>
                        ✎
                      </button>
                      <button
                        type="button"
                        title="Xóa"
                        className="kanji-vocab-admin-delete"
                        disabled={busy}
                        onClick={() => void handleDelete(v.id)}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
                {(v.exampleJa || v.exampleVi) && (
                  <div className="kanji-vocab-example">
                    <div className="kanji-vocab-example-head">
                      <span className="kanji-vocab-example-label">Ví dụ</span>
                      {v.exampleJa ? (
                        <button
                          type="button"
                          className="btn-audio-small"
                          title="Nghe ví dụ"
                          aria-label="Nghe ví dụ"
                          onClick={(e) => onPronounce(e, v.exampleJa!)}
                        >
                          <SpeakerIcon size={14} />
                        </button>
                      ) : null}
                    </div>
                    {v.exampleJa ? (
                      <span className="kanji-vocab-example-ja japanese-text">{v.exampleJa}</span>
                    ) : null}
                    {v.exampleKana && v.exampleKana !== v.exampleJa ? (
                      <span className="kanji-vocab-example-kana">{v.exampleKana}</span>
                    ) : null}
                    {v.exampleVi ? (
                      <span className="kanji-vocab-example-vi">{v.exampleVi}</span>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {canEdit && items.length === 0 && !adding && (
        <p className="kanji-vocab-admin-empty">Chưa có từ liên quan — bấm + Thêm.</p>
      )}

      {canEdit && (
        <p className="kanji-vocab-admin-hint">Kéo ⠿ để sắp xếp · ✎ sửa · ✕ xóa</p>
      )}
    </aside>
  );
}
