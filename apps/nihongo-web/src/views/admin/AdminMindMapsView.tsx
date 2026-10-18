'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createMindMap,
  deleteMindMap,
  fetchMindMaps,
  updateMindMap,
  type MindMapBranchApi,
  type MindMapItemApi,
  type MindMapKindApi,
  type MindMapLevelApi,
  type MindMapLevelCode,
  type MindMapLevelInput,
} from '../../api';
import { useAuth } from '../../hooks/useAuth';
import { useAdminToast } from '../../components/admin/AdminToast';
import { AdminConfirmDialog } from '../../components/admin/AdminModal';
import {
  JLPT_MIND_KINDS,
  JLPT_MIND_LEVELS,
  branchPosition,
  type JlptMindBranch,
  type JlptMindKind,
  type JlptMindLevel,
} from '../../data/jlpt-mind-map-shared';
import '../../components/admin/AdminComponents.css';
import '../../views/GrammarMindMapView.css';
import './AdminPages.css';
import './AdminMindMapsView.css';

const ACCENTS: Record<JlptMindLevel, string> = {
  N5: '#22c55e',
  N4: '#14b8a6',
  N3: '#3b82f6',
  N2: '#f59e0b',
  N1: '#ef4444',
};

const EMPTY_ITEM = (): MindMapItemApi => ({ pattern: '', meaning: '' });

const EMPTY_BRANCH = (i: number): MindMapBranchApi => ({
  id: `branch-${Date.now()}-${i}`,
  label: 'Nhánh mới',
  labelJa: '',
  hint: '',
  patterns: [EMPTY_ITEM()],
});

function toInput(row: MindMapLevelApi): MindMapLevelInput {
  return {
    kind: row.kind,
    level: row.level,
    title: row.title,
    summary: row.summary,
    accent: row.accent,
    sortOrder: row.sortOrder,
    branches: (row.branches ?? []) as MindMapBranchApi[],
  };
}

export default function AdminMindMapsView() {
  const { token } = useAuth();
  const toast = useAdminToast();
  const [kind, setKind] = useState<MindMapKindApi>('GRAMMAR');
  const [rows, setRows] = useState<MindMapLevelApi[]>([]);
  const [level, setLevel] = useState<MindMapLevelCode>('N5');
  const [draft, setDraft] = useState<MindMapLevelInput | null>(null);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const orbitRef = useRef<HTMLDivElement>(null);

  const currentRow = useMemo(
    () => rows.find((r) => r.level === level) ?? null,
    [rows, level],
  );

  // Đổi tab nhanh: response của loại CŨ về sau không được ghi đè dữ liệu loại mới
  const latestKind = useRef(kind);
  latestKind.current = kind;

  /** Đang sửa dở mà chuyển tab/cấp: hỏi trước. Bản cũ bỏ bản nháp không báo. */
  const confirmDiscard = () => !dirty || window.confirm('Bạn có thay đổi chưa lưu. Bỏ các thay đổi này?');

  const load = useCallback(async () => {
    const requestedKind = kind;
    setLoading(true);
    try {
      const data = await fetchMindMaps(kind);
      if (latestKind.current !== requestedKind) return;
      setRows(data);
      const preferred =
        data.find((r) => r.level === level) ??
        data[0] ??
        null;
      if (preferred) {
        setLevel(preferred.level);
        setDraft(toInput(preferred));
        setActiveBranchId(preferred.branches[0]?.id ?? null);
      } else {
        setDraft(null);
        setActiveBranchId(null);
      }
      setDirty(false);
    } catch (e) {
      if (latestKind.current !== requestedKind) return;
      toast.show(e instanceof Error ? e.message : 'Không tải được sơ đồ', 'error');
    } finally {
      if (latestKind.current === requestedKind) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!currentRow) {
      // Giữ draft khi đang tạo cấp mới (chưa có trong DB)
      return;
    }
    setDraft(toInput(currentRow));
    setActiveBranchId(currentRow.branches[0]?.id ?? null);
    setDirty(false);
  }, [currentRow?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeBranch = draft?.branches.find((b) => b.id === activeBranchId) ?? null;
  const publicPath = JLPT_MIND_KINDS.find((k) => k.kind === kind)?.path ?? '/';

  function patchDraft(patch: Partial<MindMapLevelInput>) {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    setDirty(true);
  }

  function patchBranch(branchId: string, patch: Partial<MindMapBranchApi>) {
    setDraft((d) => {
      if (!d) return d;
      return {
        ...d,
        branches: d.branches.map((b) => (b.id === branchId ? { ...b, ...patch } : b)),
      };
    });
    setDirty(true);
  }

  function patchPattern(branchId: string, index: number, patch: Partial<MindMapItemApi>) {
    setDraft((d) => {
      if (!d) return d;
      return {
        ...d,
        branches: d.branches.map((b) => {
          if (b.id !== branchId) return b;
          return {
            ...b,
            patterns: b.patterns.map((p, i) => (i === index ? { ...p, ...patch } : p)),
          };
        }),
      };
    });
    setDirty(true);
  }

  async function handleSave() {
    if (!token || !draft) return;
    if (!draft.title.trim() || !draft.summary.trim()) {
      toast.show('Thiếu tiêu đề hoặc tóm tắt', 'error');
      return;
    }
    setBusy(true);
    try {
      if (currentRow) {
        const updated = await updateMindMap(currentRow.id, draft, token);
        setRows((list) => list.map((r) => (r.id === updated.id ? updated : r)));
      } else {
        const created = await createMindMap(draft, token);
        setRows((list) => [...list, created]);
        setLevel(created.level);
      }
      setDirty(false);
      toast.show('Đã lưu sơ đồ', 'success');
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Lưu thất bại', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!token || !currentRow) return;
    setBusy(true);
    try {
      await deleteMindMap(currentRow.id, token);
      setRows((list) => list.filter((r) => r.id !== currentRow.id));
      setConfirmDelete(false);
      toast.show('Đã xoá cấp này', 'success');
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Xoá thất bại', 'error');
    } finally {
      setBusy(false);
    }
  }

  function handleCreateLevel(lv: MindMapLevelCode) {
    if (rows.some((r) => r.level === lv)) {
      setLevel(lv);
      return;
    }
    const next: MindMapLevelInput = {
      kind,
      level: lv,
      title: `Cấp ${lv}`,
      summary: `Sơ đồ tư duy ${lv}`,
      accent: ACCENTS[lv],
      sortOrder: JLPT_MIND_LEVELS.indexOf(lv as JlptMindLevel),
      branches: [EMPTY_BRANCH(0)],
    };
    setLevel(lv);
    setDraft(next);
    setActiveBranchId(next.branches[0].id);
    setDirty(true);
  }

  function addBranch() {
    if (!draft) return;
    const b = EMPTY_BRANCH(draft.branches.length);
    const count = draft.branches.length + 1;
    const pos = branchPosition(b as JlptMindBranch, draft.branches.length, count);
    b.posX = Math.round(pos.x);
    b.posY = Math.round(pos.y);
    patchDraft({ branches: [...draft.branches, b] });
    setActiveBranchId(b.id);
  }

  function removeBranch(branchId: string) {
    if (!draft) return;
    const next = draft.branches.filter((b) => b.id !== branchId);
    patchDraft({ branches: next });
    setActiveBranchId(next[0]?.id ?? null);
  }

  function addPattern() {
    if (!activeBranchId) return;
    setDraft((d) => {
      if (!d) return d;
      return {
        ...d,
        branches: d.branches.map((b) =>
          b.id === activeBranchId
            ? { ...b, patterns: [...b.patterns, EMPTY_ITEM()] }
            : b,
        ),
      };
    });
    setDirty(true);
  }

  function removePattern(index: number) {
    if (!activeBranchId) return;
    setDraft((d) => {
      if (!d) return d;
      return {
        ...d,
        branches: d.branches.map((b) =>
          b.id === activeBranchId
            ? { ...b, patterns: b.patterns.filter((_, i) => i !== index) }
            : b,
        ),
      };
    });
    setDirty(true);
  }

  function onOrbitPointerDown(branchId: string, e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    setActiveBranchId(branchId);
    setDraggingId(branchId);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function onOrbitPointerMove(e: React.PointerEvent) {
    if (!draggingId || !orbitRef.current || !draft) return;
    const rect = orbitRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    patchBranch(draggingId, {
      posX: Math.round(Math.min(92, Math.max(8, x))),
      posY: Math.round(Math.min(92, Math.max(8, y))),
    });
  }

  function onOrbitPointerUp() {
    setDraggingId(null);
  }

  const kindMeta = JLPT_MIND_KINDS.find((k) => k.kind === (kind as JlptMindKind));

  return (
    <div className="admin-mindmaps">
      <div className="admin-content-header">
        <Link href="/admin" className="admin-content-back">
          ← Dashboard
        </Link>
        <h1>
          <span aria-hidden>🗺</span> Sơ đồ tư duy
        </h1>
        <p>
          Thêm / sửa / xoá nhánh &amp; mục · kéo thả vị trí trên vòng tròn ·{' '}
          <Link href={publicPath}>xem trang học viên</Link>
        </p>
      </div>

      <div className="amm-toolbar">
        <div className="amm-kind-tabs" role="tablist">
          {JLPT_MIND_KINDS.map((k) => (
            <button
              key={k.kind}
              type="button"
              className={`amm-kind-tab${kind === k.kind ? ' is-active' : ''}`}
              onClick={() => {
                if (k.kind !== kind && confirmDiscard()) setKind(k.kind as MindMapKindApi);
              }}
            >
              {k.label}
            </button>
          ))}
        </div>
        <div className="amm-actions">
          <button type="button" className="btn btn-outline btn-sm" disabled={busy || !dirty} onClick={() => confirmDiscard() && void load()}>
            Huỷ thay đổi
          </button>
          <button type="button" className="btn btn-primary btn-sm" disabled={busy || !draft || !dirty} onClick={() => void handleSave()}>
            {busy ? 'Đang lưu…' : 'Lưu'}
          </button>
          {currentRow ? (
            <button type="button" className="btn btn-outline btn-sm amm-danger" disabled={busy} onClick={() => setConfirmDelete(true)}>
              Xoá cấp
            </button>
          ) : null}
        </div>
      </div>

      <div className="amm-level-row">
        {JLPT_MIND_LEVELS.map((lv) => {
          const exists = rows.some((r) => r.level === lv);
          const active = level === lv;
          return (
            <button
              key={lv}
              type="button"
              className={`amm-level-chip${active ? ' is-active' : ''}${exists ? '' : ' is-empty'}`}
              style={{ '--amm-accent': ACCENTS[lv] } as React.CSSProperties}
              onClick={() => {
                if (lv === level || !confirmDiscard()) return;
                if (exists) setLevel(lv as MindMapLevelCode);
                else handleCreateLevel(lv as MindMapLevelCode);
              }}
            >
              {lv}
              {!exists ? ' +' : ''}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="amm-status">Đang tải…</p>
      ) : !draft ? (
        <div className="amm-empty glass-panel">
          <p>
            Chưa có sơ đồ {kindMeta?.label ?? kind}. Chạy <code>npm run seed:mind-maps -w @edu/prisma-nihongo</code> để nạp
            sơ đồ mặc định, hoặc thêm cấp N5–N1.
          </p>
        </div>
      ) : (
        <div className="amm-layout">
          <section className="amm-canvas glass-panel">
            <div className="amm-canvas-head">
              <strong>Vẽ sơ đồ</strong>
              <span>Kéo nhánh để đặt vị trí · click để sửa</span>
              <button type="button" className="btn btn-outline btn-sm" onClick={addBranch}>
                + Nhánh
              </button>
            </div>
            <div
              ref={orbitRef}
              className="gmm-orbit amm-orbit"
              style={{ '--gmm-accent': draft.accent } as React.CSSProperties}
              onPointerMove={onOrbitPointerMove}
              onPointerUp={onOrbitPointerUp}
              onPointerLeave={onOrbitPointerUp}
            >
              <div className="gmm-hub">
                <span className="gmm-hub__level">{draft.level}</span>
                <span className="gmm-hub__label">Mind map</span>
                <span className="gmm-hub__count">{draft.branches.length} nhánh</span>
              </div>
              <ul className="gmm-branches">
                {draft.branches.map((branch, index) => {
                  const { x, y } = branchPosition(branch as JlptMindBranch, index, draft.branches.length);
                  const selected = branch.id === activeBranchId;
                  return (
                    <li
                      key={branch.id}
                      className={`gmm-branch${selected ? ' is-active' : ''}${draggingId === branch.id ? ' is-dragging' : ''}`}
                      style={{ left: `${x}%`, top: `${y}%` }}
                    >
                      <button
                        type="button"
                        className="gmm-branch__btn"
                        onPointerDown={(e) => onOrbitPointerDown(branch.id, e)}
                      >
                        <span className="gmm-branch__ja japanese-text">{branch.labelJa || '—'}</span>
                        <span className="gmm-branch__vi">{branch.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <svg className="gmm-spokes" viewBox="0 0 100 100" aria-hidden>
                {draft.branches.map((branch, index) => {
                  const { x, y } = branchPosition(branch as JlptMindBranch, index, draft.branches.length);
                  const sx = 50 + ((x - 50) * 28) / 42;
                  const sy = 50 + ((y - 50) * 28) / 42;
                  return (
                    <line
                      key={branch.id}
                      x1="50"
                      y1="50"
                      x2={sx}
                      y2={sy}
                      className={branch.id === activeBranchId ? 'is-active' : undefined}
                    />
                  );
                })}
              </svg>
            </div>
          </section>

          <aside className="amm-editor glass-panel">
            <div className="amm-field-grid">
              <label>
                Tiêu đề
                <input
                  value={draft.title}
                  onChange={(e) => patchDraft({ title: e.target.value })}
                />
              </label>
              <label>
                Màu accent
                <input
                  type="color"
                  value={draft.accent || '#3b82f6'}
                  onChange={(e) => patchDraft({ accent: e.target.value })}
                />
              </label>
              <label className="amm-span-2">
                Tóm tắt
                <textarea
                  rows={2}
                  value={draft.summary}
                  onChange={(e) => patchDraft({ summary: e.target.value })}
                />
              </label>
            </div>

            {activeBranch ? (
              <>
                <div className="amm-branch-meta">
                  <h3>Nhánh đang chọn</h3>
                  <button type="button" className="btn btn-outline btn-sm amm-danger" onClick={() => removeBranch(activeBranch.id)}>
                    Xoá nhánh
                  </button>
                </div>
                <div className="amm-field-grid">
                  <label>
                    ID
                    <input
                      value={activeBranch.id}
                      onChange={(e) => patchBranch(activeBranch.id, { id: e.target.value })}
                    />
                  </label>
                  <label>
                    Label JP
                    <input
                      value={activeBranch.labelJa ?? ''}
                      onChange={(e) => patchBranch(activeBranch.id, { labelJa: e.target.value })}
                    />
                  </label>
                  <label className="amm-span-2">
                    Label VI
                    <input
                      value={activeBranch.label}
                      onChange={(e) => patchBranch(activeBranch.id, { label: e.target.value })}
                    />
                  </label>
                  <label className="amm-span-2">
                    Gợi ý
                    <input
                      value={activeBranch.hint ?? ''}
                      onChange={(e) => patchBranch(activeBranch.id, { hint: e.target.value })}
                    />
                  </label>
                </div>

                <div className="amm-patterns-head">
                  <h3>Mục trong nhánh</h3>
                  <button type="button" className="btn btn-outline btn-sm" onClick={addPattern}>
                    + Mục
                  </button>
                </div>
                <ul className="amm-pattern-editor">
                  {activeBranch.patterns.map((item, index) => (
                    <li key={`${activeBranch.id}-${index}`}>
                      <input
                        placeholder="Mẫu / chữ / từ"
                        value={item.pattern}
                        onChange={(e) => patchPattern(activeBranch.id, index, { pattern: e.target.value })}
                      />
                      <input
                        placeholder="Nghĩa"
                        value={item.meaning}
                        onChange={(e) => patchPattern(activeBranch.id, index, { meaning: e.target.value })}
                      />
                      <input
                        type="number"
                        placeholder="Bài #"
                        value={item.lessonNumber ?? ''}
                        onChange={(e) =>
                          patchPattern(activeBranch.id, index, {
                            lessonNumber: e.target.value === '' ? undefined : Number(e.target.value),
                          })
                        }
                      />
                      <input
                        placeholder="href (tuỳ chọn)"
                        value={item.href ?? ''}
                        onChange={(e) =>
                          patchPattern(activeBranch.id, index, {
                            href: e.target.value || undefined,
                          })
                        }
                      />
                      <button type="button" className="btn btn-outline btn-sm amm-danger" onClick={() => removePattern(index)}>
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="amm-status">Chọn hoặc thêm một nhánh trên sơ đồ.</p>
            )}
          </aside>
        </div>
      )}

      <AdminConfirmDialog
        open={confirmDelete}
        title="Xoá cấp sơ đồ?"
        message={`Xoá ${kind} · ${level}? Không hoàn tác được.`}
        confirmLabel="Xoá"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
