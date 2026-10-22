'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createVocabSuffixGroup,
  createVocabSuffixItem,
  deleteVocabSuffixGroup,
  deleteVocabSuffixItem,
  reorderVocabSuffixItems,
  updateVocabSuffixGroup,
  updateVocabSuffixItem,
} from '../api';
import type {
  CreateVocabSuffixGroupInput,
  CreateVocabSuffixItemInput,
  VocabSuffixGroup,
  VocabSuffixItem,
} from '../types/reference';
import PlayAllButton from '../components/PlayAllButton';
import StrokeOrder from '../components/StrokeOrder';
import { usePlayAll } from '../hooks/usePlayAll';
import { useJapaneseVocabSuffixesQuery, queryKeys } from '../hooks/queries';
import { useAuth } from '../hooks/useAuth';
import { playAudio } from '../utils/speech';
import { groupsFromPayload, setSetsubigoCatalog } from '../utils/setsubigo';
import './SuffixesView.css';

const POS_OPTIONS = [
  { id: 'noun', label: 'Danh từ' },
  { id: 'verb', label: 'Động từ' },
  { id: 'i-adj', label: 'Tính từ い' },
  { id: 'na-adj', label: 'Tính từ な' },
] as const;

type PosId = (typeof POS_OPTIONS)[number]['id'];

interface ItemFormValues {
  groupSlug: string;
  suffix: string;
  formsText: string;
  kana: string;
  romaji: string;
  meaningVi: string;
  attachesTo: string;
  pos: PosId[];
  exampleJa: string;
  exampleVi: string;
}

interface GroupFormValues {
  slug: string;
  label: string;
  labelJa: string;
  hint: string;
}

function matchesSuffix(item: VocabSuffixItem, query: string): boolean {
  const haystack = [
    item.suffix,
    ...(item.forms ?? []),
    item.kana,
    item.romaji,
    item.meaning,
    item.attachesTo,
    item.exampleJa,
    item.exampleVi,
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

function itemKey(categoryId: string, item: VocabSuffixItem): string {
  return `${categoryId}-${item.id ?? item.suffix}-${item.kana}`;
}

function parseForms(text: string, fallback: string): string[] {
  const list = text
    .split(/[,、，]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length ? list : [fallback.trim()];
}

function defaultItemForm(groupSlug: string): ItemFormValues {
  return {
    groupSlug,
    suffix: '',
    formsText: '',
    kana: '',
    romaji: '',
    meaningVi: '',
    attachesTo: '',
    pos: ['noun'],
    exampleJa: '',
    exampleVi: '',
  };
}

function itemToForm(item: VocabSuffixItem, groupSlug: string): ItemFormValues {
  return {
    groupSlug: item.groupSlug ?? groupSlug,
    suffix: item.suffix,
    formsText: (item.forms ?? [item.suffix]).join(', '),
    kana: item.kana,
    romaji: item.romaji,
    meaningVi: item.meaning,
    attachesTo: item.attachesTo,
    pos: (item.pos?.length ? item.pos : ['noun']) as PosId[],
    exampleJa: item.exampleJa,
    exampleVi: item.exampleVi,
  };
}

function itemFormToPayload(values: ItemFormValues): CreateVocabSuffixItemInput {
  return {
    groupSlug: values.groupSlug,
    suffix: values.suffix.trim(),
    forms: parseForms(values.formsText, values.suffix),
    kana: values.kana.trim(),
    romaji: values.romaji.trim(),
    meaningVi: values.meaningVi.trim(),
    attachesTo: values.attachesTo.trim(),
    pos: values.pos,
    exampleJa: values.exampleJa.trim(),
    exampleVi: values.exampleVi.trim(),
  };
}

function defaultGroupForm(): GroupFormValues {
  return { slug: '', label: '', labelJa: '', hint: '' };
}

function groupToForm(group: VocabSuffixGroup): GroupFormValues {
  return {
    slug: group.id,
    label: group.label,
    labelJa: group.labelJa ?? '',
    hint: group.hint,
  };
}

function SuffixItemAdminForm({
  initial,
  editId,
  groups,
  token,
  onCancel,
  onSaved,
}: {
  initial: ItemFormValues;
  editId?: number;
  groups: VocabSuffixGroup[];
  token: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function togglePos(id: PosId) {
    setValues((v) => {
      const has = v.pos.includes(id);
      const pos = has ? v.pos.filter((p) => p !== id) : [...v.pos, id];
      return { ...v, pos: pos.length ? pos : ['noun'] };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!values.suffix.trim() || !values.kana.trim() || !values.meaningVi.trim()) {
      setError('Hậu tố, kana và nghĩa tiếng Việt là bắt buộc.');
      return;
    }
    setSaving(true);
    try {
      const payload = itemFormToPayload(values);
      if (editId != null) {
        await updateVocabSuffixItem(editId, payload, token);
      } else {
        await createVocabSuffixItem(payload, token);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được hậu tố.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="suffixes-admin-form glass-panel" onSubmit={handleSubmit}>
      <h3>{editId != null ? 'Sửa hậu tố' : 'Thêm hậu tố mới'}</h3>
      {error && <p className="suffixes-admin-error">{error}</p>}

      <div className="suffixes-admin-grid">
        <label>
          Nhóm
          <select
            value={values.groupSlug}
            onChange={(e) => setValues((v) => ({ ...v, groupSlug: e.target.value }))}
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Hậu tố *
          <input
            value={values.suffix}
            onChange={(e) => setValues((v) => ({ ...v, suffix: e.target.value }))}
            placeholder="さん"
            required
          />
        </label>
        <label>
          Kana *
          <input
            value={values.kana}
            onChange={(e) => setValues((v) => ({ ...v, kana: e.target.value }))}
            placeholder="さん"
            required
          />
        </label>
        <label>
          Romaji *
          <input
            value={values.romaji}
            onChange={(e) => setValues((v) => ({ ...v, romaji: e.target.value }))}
            placeholder="san"
            required
          />
        </label>
        <label className="suffixes-admin-span2">
          Biến thể (forms, cách nhau bởi dấu phẩy)
          <input
            value={values.formsText}
            onChange={(e) => setValues((v) => ({ ...v, formsText: e.target.value }))}
            placeholder="さん, 様"
          />
        </label>
        <label className="suffixes-admin-span2">
          Nghĩa tiếng Việt *
          <input
            value={values.meaningVi}
            onChange={(e) => setValues((v) => ({ ...v, meaningVi: e.target.value }))}
            placeholder="anh/chị (lịch sự)"
            required
          />
        </label>
        <label className="suffixes-admin-span2">
          Gắn vào
          <input
            value={values.attachesTo}
            onChange={(e) => setValues((v) => ({ ...v, attachesTo: e.target.value }))}
            placeholder="tên người, nghề"
          />
        </label>
        <fieldset className="suffixes-admin-span2 suffixes-admin-pos">
          <legend>Loại từ gốc</legend>
          <div className="suffixes-admin-pos-row">
            {POS_OPTIONS.map((opt) => (
              <label key={opt.id} className="suffixes-admin-check">
                <input
                  type="checkbox"
                  checked={values.pos.includes(opt.id)}
                  onChange={() => togglePos(opt.id)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="suffixes-admin-span2">
          Ví dụ tiếng Nhật
          <input
            value={values.exampleJa}
            onChange={(e) => setValues((v) => ({ ...v, exampleJa: e.target.value }))}
            placeholder="田中さんは先生です。"
          />
        </label>
        <label className="suffixes-admin-span2">
          Ví dụ tiếng Việt
          <input
            value={values.exampleVi}
            onChange={(e) => setValues((v) => ({ ...v, exampleVi: e.target.value }))}
            placeholder="Anh/chị Tanaka là giáo viên."
          />
        </label>
      </div>

      <div className="suffixes-admin-actions">
        <button type="button" className="btn btn-outline btn-sm" onClick={onCancel}>
          Hủy
        </button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
          {saving ? 'Đang lưu...' : editId != null ? 'Cập nhật' : 'Thêm'}
        </button>
      </div>
    </form>
  );
}

function SuffixGroupAdminForm({
  initial,
  editSlug,
  token,
  onCancel,
  onSaved,
}: {
  initial: GroupFormValues;
  editSlug?: string;
  token: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!values.slug.trim() || !values.label.trim() || !values.hint.trim()) {
      setError('Slug, tên nhóm và gợi ý là bắt buộc.');
      return;
    }
    setSaving(true);
    try {
      const payload: CreateVocabSuffixGroupInput = {
        slug: values.slug.trim(),
        label: values.label.trim(),
        labelJa: values.labelJa.trim() || undefined,
        hint: values.hint.trim(),
      };
      if (editSlug) {
        await updateVocabSuffixGroup(editSlug, payload, token);
      } else {
        await createVocabSuffixGroup(payload, token);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được nhóm.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="suffixes-admin-form glass-panel" onSubmit={handleSubmit}>
      <h3>{editSlug ? 'Sửa nhóm hậu tố' : 'Thêm nhóm mới'}</h3>
      {error && <p className="suffixes-admin-error">{error}</p>}

      <div className="suffixes-admin-grid">
        <label>
          Slug (id) *
          <input
            value={values.slug}
            onChange={(e) => setValues((v) => ({ ...v, slug: e.target.value }))}
            placeholder="honorifics"
            disabled={!!editSlug}
            required
          />
        </label>
        <label>
          Tên nhóm *
          <input
            value={values.label}
            onChange={(e) => setValues((v) => ({ ...v, label: e.target.value }))}
            placeholder="Hậu tố xưng hô"
            required
          />
        </label>
        <label>
          Tên tiếng Nhật
          <input
            value={values.labelJa}
            onChange={(e) => setValues((v) => ({ ...v, labelJa: e.target.value }))}
            placeholder="呼びかけ"
          />
        </label>
        <label className="suffixes-admin-span2">
          Gợi ý / mô tả *
          <textarea
            value={values.hint}
            onChange={(e) => setValues((v) => ({ ...v, hint: e.target.value }))}
            rows={2}
            required
          />
        </label>
      </div>

      <div className="suffixes-admin-actions">
        <button type="button" className="btn btn-outline btn-sm" onClick={onCancel}>
          Hủy
        </button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
          {saving ? 'Đang lưu...' : editSlug ? 'Cập nhật nhóm' : 'Thêm nhóm'}
        </button>
      </div>
    </form>
  );
}

function SuffixPopup({
  item,
  token,
  isAdmin,
  onClose,
  onSaved,
  onStep,
}: {
  item: VocabSuffixItem;
  token?: string;
  isAdmin: boolean;
  onClose: () => void;
  onSaved: () => void;
  onStep: (direction: -1 | 1) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    suffix: item.suffix,
    kana: item.kana,
    romaji: item.romaji,
    meaningVi: item.meaning,
    exampleJa: item.exampleJa ?? '',
    exampleVi: item.exampleVi ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (editing) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onStep(-1);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        onStep(1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing, onClose, onStep]);

  function handleCopy() {
    void navigator.clipboard.writeText(item.suffix).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  async function handleSave() {
    if (!token || item.id == null) return;
    setBusy(true);
    setErr(null);
    try {
      await updateVocabSuffixItem(item.id, {
        groupSlug: item.groupSlug ?? '',
        suffix: draft.suffix.trim(),
        forms: item.forms ?? [draft.suffix.trim()],
        kana: draft.kana.trim(),
        romaji: draft.romaji.trim(),
        meaningVi: draft.meaningVi.trim(),
        attachesTo: item.attachesTo ?? '',
        pos: (item.pos ?? ['noun']) as ('noun' | 'verb' | 'i-adj' | 'na-adj')[],
        exampleJa: draft.exampleJa.trim(),
        exampleVi: draft.exampleVi.trim(),
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
    <div className="sfx-popup-overlay" onClick={onClose}>
      <div className="sfx-popup" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>

        {/* Top bar */}
        <div className="sfx-popup-topbar">
          <div className="sfx-popup-topbar-left">
            <button className="sfx-popup-icon-btn" onClick={() => void playAudio(item.kana)} title="Nghe phát âm">🔊</button>
            <button className="sfx-popup-icon-btn" onClick={handleCopy} title="Sao chép">
              {copied ? '✓' : '📋'}
            </button>
            {isAdmin && (
              <button className="sfx-popup-icon-btn sfx-popup-edit-btn" onClick={() => { setEditing((v) => !v); setErr(null); }}>
                {editing ? '✕ Hủy' : '✎ Sửa'}
              </button>
            )}
          </div>
          <button className="sfx-popup-close" onClick={onClose} aria-label="Đóng">✕</button>
        </div>

        <div className="sfx-popup-nav">
          <button
            type="button"
            className="sfx-popup-step"
            onClick={() => onStep(-1)}
            disabled={editing}
            aria-label="Hậu tố trước"
          >
            ←
          </button>
          <div className="sfx-popup-header">
            <span className="sfx-popup-ja japanese-text">{item.suffix}</span>
            {item.kana !== item.suffix && (
              <span className="sfx-popup-kana japanese-text">{item.kana}</span>
            )}
            <span className="sfx-popup-romaji">{item.romaji}</span>
            {item.attachesTo && <span className="sfx-popup-attach-tag">Gắn: {item.attachesTo}</span>}
          </div>
          <button
            type="button"
            className="sfx-popup-step"
            onClick={() => onStep(1)}
            disabled={editing}
            aria-label="Hậu tố sau"
          >
            →
          </button>
        </div>
        <p className="sfx-popup-key-hint">← → đổi hậu tố</p>

        <div className="sfx-popup-stroke">
          <StrokeOrder key={`${item.id ?? item.suffix}-${item.kana}`} text={item.suffix} width={180} height={180} />
          <p className="sfx-popup-stroke-hint">Nhấn vào chữ để xem lại nét</p>
        </div>

        <p className="sfx-popup-vi">{item.meaning}</p>

        {(item.exampleJa || item.exampleVi) && (
          <div className="sfx-popup-example">
            {item.exampleJa && (
              <button type="button" className="sfx-popup-example-ja japanese-text"
                onClick={() => void playAudio(item.exampleJa!)}>
                {item.exampleJa}
              </button>
            )}
            {item.exampleVi && <span className="sfx-popup-example-vi">{item.exampleVi}</span>}
          </div>
        )}

        {/* Admin edit form */}
        {editing && (
          <div className="sfx-popup-edit-form">
            {err && <p className="sfx-popup-edit-err">{err}</p>}
            <label className="sfx-popup-edit-field">
              <span>Hậu tố</span>
              <input className="japanese-text" value={draft.suffix} disabled={busy}
                onChange={(e) => setDraft((d) => ({ ...d, suffix: e.target.value }))} />
            </label>
            <label className="sfx-popup-edit-field">
              <span>Kana</span>
              <input className="japanese-text" value={draft.kana} disabled={busy}
                onChange={(e) => setDraft((d) => ({ ...d, kana: e.target.value }))} />
            </label>
            <label className="sfx-popup-edit-field">
              <span>Romaji</span>
              <input value={draft.romaji} disabled={busy}
                onChange={(e) => setDraft((d) => ({ ...d, romaji: e.target.value }))} />
            </label>
            <label className="sfx-popup-edit-field">
              <span>Nghĩa</span>
              <input value={draft.meaningVi} disabled={busy}
                onChange={(e) => setDraft((d) => ({ ...d, meaningVi: e.target.value }))} />
            </label>
            <label className="sfx-popup-edit-field">
              <span>Ví dụ JP</span>
              <input className="japanese-text" value={draft.exampleJa} disabled={busy}
                onChange={(e) => setDraft((d) => ({ ...d, exampleJa: e.target.value }))} />
            </label>
            <label className="sfx-popup-edit-field">
              <span>Ví dụ VN</span>
              <input value={draft.exampleVi} disabled={busy}
                onChange={(e) => setDraft((d) => ({ ...d, exampleVi: e.target.value }))} />
            </label>
            <div className="sfx-popup-edit-actions">
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

export default function SuffixesView() {
  const { isAdmin, token } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useJapaneseVocabSuffixesQuery();
  const groups = data?.groups ?? [];
  const [activeId, setActiveId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [popupItem, setPopupItem] = useState<VocabSuffixItem | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [itemFormState, setItemFormState] = useState<
    null | { mode: 'create' } | { mode: 'edit'; item: VocabSuffixItem }
  >(null);
  const [groupFormState, setGroupFormState] = useState<
    null | { mode: 'create' } | { mode: 'edit'; group: VocabSuffixGroup }
  >(null);
  const [orderedItems, setOrderedItems] = useState<VocabSuffixItem[]>([]);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const { isPlayingAll, startPlayAll, stopPlayAll } = usePlayAll();

  const canEdit = isAdmin && editMode;
  const searchActive = searchQuery.trim().length > 0;
  const formOpen = itemFormState != null || groupFormState != null;

  useEffect(() => {
    if (data) setSetsubigoCatalog(groupsFromPayload(data));
  }, [data]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.japaneseVocabSuffixes });
  }, [queryClient]);

  const deleteItemMutation = useMutation({
    mutationFn: (id: number) => deleteVocabSuffixItem(id, token!),
    onSuccess: invalidate,
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (slug: string) => deleteVocabSuffixGroup(slug, token!),
    onSuccess: () => {
      setActiveId('');
      invalidate();
    },
  });

  const canReorder =
    canEdit &&
    !searchActive &&
    !formOpen &&
    !deleteItemMutation.isPending &&
    !deleteGroupMutation.isPending;

  const resolvedActiveId = activeId || groups[0]?.id || '';
  const category = groups.find((g) => g.id === resolvedActiveId) ?? groups[0];

  const groupItems = category?.items ?? [];

  useEffect(() => {
    setOrderedItems(category?.items ?? []);
    setDraggingId(null);
  }, [category?.items, resolvedActiveId]);

  const items = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return canReorder ? orderedItems : groupItems;
    return groupItems.filter((item) => matchesSuffix(item, q));
  }, [groupItems, orderedItems, canReorder, searchQuery]);

  const stepPopup = useCallback((direction: -1 | 1) => {
    setPopupItem((current) => {
      if (!current || items.length === 0) return current;
      const idx = items.findIndex((entry) =>
        entry.id != null && current.id != null
          ? entry.id === current.id
          : entry.suffix === current.suffix && entry.kana === current.kana,
      );
      if (idx < 0) return current;
      return items[(idx + direction + items.length) % items.length];
    });
  }, [items]);

  useEffect(() => {
    if (popupItem && category) setSelectedKey(itemKey(category.id, popupItem));
  }, [popupItem, category]);

  const handlePlayAll = () => {
    startPlayAll(items.map((item) => item.kana));
  };

  const selectAndSpeak = (key: string, text: string) => {
    setSelectedKey(key);
    void playAudio(text);
  };

  function handleSaved() {
    setItemFormState(null);
    setGroupFormState(null);
    invalidate();
  }

  function handleDeleteItem(item: VocabSuffixItem) {
    if (!token || item.id == null) return;
    const label = `${item.suffix} (${item.kana})`;
    if (!window.confirm(`Xóa hậu tố "${label}"?`)) return;
    deleteItemMutation.mutate(item.id);
  }

  function handleDeleteGroup(group: VocabSuffixGroup) {
    if (!token) return;
    const count = group.items.length;
    if (
      !window.confirm(
        `Xóa nhóm "${group.label}" và ${count} hậu tố bên trong?`,
      )
    ) {
      return;
    }
    deleteGroupMutation.mutate(group.id);
  }

  async function persistItemOrder(orderedIds: number[]) {
    if (!token || !category) return;
    setReorderError(null);
    try {
      await reorderVocabSuffixItems(category.id, orderedIds, token);
      invalidate();
    } catch (e) {
      setReorderError(e instanceof Error ? e.message : 'Không sắp xếp được');
      setOrderedItems(groupItems);
    } finally {
      setDraggingId(null);
    }
  }

  function handleDrop(targetId: number) {
    if (!canReorder || draggingId == null || draggingId === targetId) {
      setDraggingId(null);
      return;
    }

    const from = orderedItems.findIndex((item) => item.id === draggingId);
    const to = orderedItems.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) {
      setDraggingId(null);
      return;
    }

    const next = [...orderedItems];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setOrderedItems(next);

    const ids = next.map((item) => item.id).filter((id): id is number => id != null);
    void persistItemOrder(ids);
  }

  if (isLoading) {
    return (
      <div className="container suffixes-view">
        <p className="suffixes-empty">Đang tải hậu tố từ vựng...</p>
      </div>
    );
  }

  if (!category && groups.length === 0) {
    return (
      <div className="container suffixes-view">
        <p className="suffixes-empty">
          Chưa có nhóm hậu tố.
          {canEdit ? ' Bấm "Thêm nhóm" để tạo.' : ''}
        </p>
      </div>
    );
  }

  return (
    <div className="container suffixes-view">
      {popupItem && (
        <SuffixPopup
          item={popupItem}
          token={token ?? undefined}
          isAdmin={isAdmin}
          onClose={() => setPopupItem(null)}
          onSaved={() => { setPopupItem(null); invalidate(); }}
          onStep={stepPopup}
        />
      )}
      <div className="suffixes-header">
        <div className="suffixes-header-row">
          <div>
            <h2 className="view-title suffixes-view-title">Hậu tố từ vựng</h2>
            <p className="suffixes-subtitle">
              Học <strong>接尾語（せつびご）</strong> — mảnh gắn sau từ để đổi nghĩa:{' '}
              さん・的・中・たち・やすい… Bấm thẻ để nghe. Từ vựng Minna theo danh / tính / động
              từ xem tại <Link href="/word-classes">Loại từ</Link>.
            </p>
          </div>
          {isAdmin && (
            <div className="suffixes-admin-toolbar">
              <button
                type="button"
                className={`suffixes-admin-toggle${editMode ? ' suffixes-admin-toggle--on' : ''}`}
                onClick={() => {
                  setEditMode((v) => !v);
                  setItemFormState(null);
                  setGroupFormState(null);
                }}
              >
                {editMode ? 'Xong' : 'Sửa'}
              </button>
              {canEdit && (
                <>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setGroupFormState({ mode: 'create' })}
                  >
                    + Nhóm
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setItemFormState({ mode: 'create' })}
                  >
                    + Hậu tố
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="suffixes-tabs">
          {groups.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`tab-btn ${resolvedActiveId === cat.id ? 'active' : ''}`}
              onClick={() => {
                stopPlayAll();
                setActiveId(cat.id);
                setSelectedKey(null);
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <label className="suffixes-search">
          <span className="sr-only">Tìm hậu tố</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm: さん, teki, quá, người…"
            autoComplete="off"
          />
        </label>
      </div>

      {groupFormState?.mode === 'create' && token && (
        <SuffixGroupAdminForm
          initial={defaultGroupForm()}
          token={token}
          onCancel={() => setGroupFormState(null)}
          onSaved={handleSaved}
        />
      )}
      {groupFormState?.mode === 'edit' && token && (
        <SuffixGroupAdminForm
          editSlug={groupFormState.group.id}
          initial={groupToForm(groupFormState.group)}
          token={token}
          onCancel={() => setGroupFormState(null)}
          onSaved={handleSaved}
        />
      )}

      {itemFormState?.mode === 'create' && token && category && (
        <SuffixItemAdminForm
          initial={defaultItemForm(category.id)}
          groups={groups}
          token={token}
          onCancel={() => setItemFormState(null)}
          onSaved={handleSaved}
        />
      )}
      {itemFormState?.mode === 'edit' && token && category && (
        <SuffixItemAdminForm
          editId={itemFormState.item.id}
          initial={itemToForm(itemFormState.item, category.id)}
          groups={groups}
          token={token}
          onCancel={() => setItemFormState(null)}
          onSaved={handleSaved}
        />
      )}

      {category && (
        <div className="suffixes-panel">
          <div className="suffixes-hint-box">
            <p className="suffixes-hint-text">{category.hint}</p>
            {canEdit && (
              <div className="suffixes-hint-actions">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setGroupFormState({ mode: 'edit', group: category })}
                >
                  Sửa nhóm
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm suffixes-admin-delete"
                  disabled={deleteGroupMutation.isPending}
                  onClick={() => handleDeleteGroup(category)}
                >
                  Xóa nhóm
                </button>
              </div>
            )}
          </div>

          <div className="suffixes-toolbar">
            <span className="suffixes-count">{items.length} mục</span>
            {canReorder && (
              <p className="suffixes-reorder-hint">
                Kéo thả thẻ (⋮⋮) để sắp xếp trong nhóm hiện tại
              </p>
            )}
            <PlayAllButton
              isPlaying={isPlayingAll}
              onPlay={handlePlayAll}
              onStop={stopPlayAll}
              label="Phát tất cả"
              disabled={items.length === 0}
            />
          </div>

          {items.length === 0 ? (
            <p className="suffixes-empty">
              Không tìm thấy hậu tố phù hợp.
              {canEdit ? ' Bấm "+ Hậu tố" để thêm.' : ''}
            </p>
          ) : (
            <>
              {reorderError && (
                <p className="suffixes-reorder-error" role="alert">
                  {reorderError}
                </p>
              )}
            <div className="suffixes-grid">
              {items.map((item) => {
                const key = itemKey(category.id, item);
                const selected = selectedKey === key;
                return (
                  <article
                    key={key}
                    className={`suffix-card${selected ? ' is-selected' : ''}${
                      canReorder ? ' suffix-card--admin' : ''
                    }${draggingId === item.id ? ' suffix-card--dragging' : ''}`}
                    draggable={canReorder && item.id != null}
                    onDragStart={() => {
                      if (canReorder && item.id != null) setDraggingId(item.id);
                    }}
                    onDragEnd={() => setDraggingId(null)}
                    onDragOver={(e) => {
                      if (canReorder) e.preventDefault();
                    }}
                    onDrop={() => item.id != null && handleDrop(item.id)}
                  >
                    {canReorder && (
                      <span className="suffix-drag" title="Kéo thả để sắp xếp" aria-hidden>
                        ⋮⋮
                      </span>
                    )}
                    <button
                      type="button"
                      className="suffix-card-main"
                      aria-pressed={selected}
                      onClick={() => { selectAndSpeak(key, item.kana); setPopupItem(item); }}
                    >
                      <span className="suffix-ja japanese-text">{item.suffix}</span>
                      <span className="suffix-kana">{item.kana}</span>
                      <span className="suffix-romaji">{item.romaji}</span>
                      <span className="suffix-vi">{item.meaning}</span>
                      <span className="suffix-attach">Gắn: {item.attachesTo}</span>
                    </button>
                    {(item.exampleJa || item.exampleVi) && (
                      <div className="suffix-example" aria-label="Ví dụ">
                        <div className="suffix-example-head">
                          <span className="suffix-example-label">Ví dụ</span>
                          {item.exampleJa ? (
                            <button
                              type="button"
                              className="btn-audio-small"
                              aria-label="Nghe ví dụ"
                              onClick={() => selectAndSpeak(key, item.exampleJa!)}
                            >
                              🔊
                            </button>
                          ) : null}
                        </div>
                        {item.exampleJa ? (
                          <button
                            type="button"
                            className="suffix-example-ja japanese-text"
                            onClick={() => selectAndSpeak(key, item.exampleJa!)}
                          >
                            {item.exampleJa}
                          </button>
                        ) : null}
                        {item.exampleVi ? (
                          <span className="suffix-example-vi">{item.exampleVi}</span>
                        ) : null}
                      </div>
                    )}
                    {canEdit && item.id != null && (
                      <div className="suffix-card-admin">
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => setItemFormState({ mode: 'edit', item })}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm suffixes-admin-delete"
                          disabled={deleteItemMutation.isPending}
                          onClick={() => handleDeleteItem(item)}
                        >
                          Xóa
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
