'use client';

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { toLocalImageUrl } from '@edu/vocab-images';
import { deleteKanjiEntry, deleteVocabulary, fetchKanjiEntryById, fetchVocabularyById } from '../api';
import { useAuth } from '../hooks/useAuth';
import { playAudioSequence } from '../utils/speech';
import ImageLightbox from './ImageLightbox';
import MindMapItemEditor, { type EditableKind, type LessonOption } from './MindMapItemEditor';
import {
  JLPT_MIND_LEVELS,
  branchPosition,
  resolveMindItemHref,
  resolveMindItemLinkLabel,
  type JlptMindBranch,
  type JlptMindItem,
  type JlptMindKind,
  type JlptMindLevel,
  type JlptMindMapLevel,
} from '../data/jlpt-mind-map-shared';
import { booksFor } from '../data/jlpt-textbooks';
import { useTextbookCatalog } from '../hooks/useTextbookCatalog';
import { useMindMapData } from '../hooks/useMindMapData';
import '../views/GrammarMindMapView.css';

type MindMapMode = 'topic' | 'data';

/** Chữ đọc bằng loa: dữ liệu DB có sẵn `speak`; sơ đồ chủ đề từ vựng thì đọc phần kana trong （）. */
function speakTextsFor(item: JlptMindItem, kind: JlptMindKind | undefined): string[] {
  if (item.speak?.length) return item.speak;
  if (kind !== 'VOCAB') return [];
  const reading = /[（(]([^）)]+)[）)]/.exec(item.pattern)?.[1];
  const text = (reading ?? item.pattern).replace(/[〜~…]/g, '').trim();
  return text ? [text] : [];
}

const MODE_KEY = 'nihongo-mindmap-mode';
/** Số dòng hiện mỗi lần ở khung chi tiết — nhánh dữ liệu có thể > 1000 mục. */
const PAGE_SIZE = 100;

function loadMode(): MindMapMode {
  try {
    return window.localStorage.getItem(MODE_KEY) === 'data' ? 'data' : 'topic';
  } catch {
    return 'topic';
  }
}

type Props = {
  title: string;
  subtitle: string;
  maps: JlptMindMapLevel[];
  /** Base path for lessonNumber links, e.g. /grammar or /vocab */
  lessonPath: string;
  headerLinks?: ReactNode;
  footnote?: string;
  initialLevel?: JlptMindLevel;
  loading?: boolean;
  /** Hiện giáo trình tham khảo (Sou Matome / Shinkanzen / TRY!) cho cấp đang chọn */
  kind?: JlptMindKind;
};

/** Khi sơ đồ (từ DB) chưa có: đang tải / lỗi / chưa seed. */
export function MindMapStatus({ title, loading, error }: { title: string; loading: boolean; error: boolean }) {
  return (
    <div className="container gmm-view">
      <header className="gmm-header">
        <h1 className="view-title gmm-title">{title}</h1>
      </header>
      <p className="gmm-level-summary">
        {loading
          ? 'Đang tải sơ đồ…'
          : error
            ? 'Không tải được sơ đồ — kiểm tra API rồi thử lại.'
            : 'Chưa có sơ đồ trong DB. Chạy "npm run seed:mind-maps -w @edu/prisma-nihongo" hoặc tạo ở trang admin.'}
      </p>
    </div>
  );
}

export default function JlptMindMapShell({
  title,
  subtitle,
  maps,
  lessonPath,
  headerLinks,
  footnote,
  initialLevel = 'N5',
  loading = false,
  kind,
}: Props) {
  const [level, setLevel] = useState<JlptMindLevel>(initialLevel);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [mode, setModeState] = useState<MindMapMode>('topic');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);

  useEffect(() => setModeState(loadMode()), []);
  const setMode = (next: MindMapMode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(MODE_KEY, next);
    } catch {
      // storage bị chặn — chỉ nhớ trong phiên
    }
  };

  const data = useMindMapData(kind ?? 'GRAMMAR', Boolean(kind) && mode === 'data', maps);
  const { isAdmin, token } = useAuth();
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState<{ id?: number } | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const showingData = mode === 'data' && data.maps !== null;
  const activeMaps = showingData ? data.maps! : maps;

  const map = useMemo(
    () => activeMaps.find((item) => item.level === level) ?? activeMaps[0],
    [activeMaps, level],
  );

  const activeBranch: JlptMindBranch | null =
    map.branches.find((b) => b.id === activeBranchId) ?? map.branches[0] ?? null;

  useEffect(() => {
    setActiveBranchId(map.branches[0]?.id ?? null);
  }, [map]);

  useEffect(() => {
    setQuery('');
    setLimit(PAGE_SIZE);
  }, [activeBranch?.id, map]);

  // Admin sửa trực tiếp trên dữ liệu thật (chỉ từ vựng & kanji — có ảnh; ngữ pháp sửa ở trang Ngữ pháp)
  const editableKind: EditableKind | null =
    showingData && isAdmin && token && (kind === 'VOCAB' || kind === 'KANJI') ? kind : null;

  const branchLessons = useMemo<LessonOption[]>(() => {
    const seen = new Map<number, LessonOption>();
    for (const p of activeBranch?.patterns ?? []) {
      if (p.lessonId != null && p.lessonNumber != null && !seen.has(p.lessonId)) {
        seen.set(p.lessonId, { lessonId: p.lessonId, lessonNumber: p.lessonNumber });
      }
    }
    return [...seen.values()].sort((a, b) => a.lessonNumber - b.lessonNumber);
  }, [activeBranch]);

  const refreshData = () => queryClient.invalidateQueries({ queryKey: ['mind-map-data', kind] });

  const removeItem = async (item: JlptMindItem) => {
    if (!editableKind || item.id == null || !token) return;
    if (!window.confirm(`Xóa "${item.pattern}"? Không hoàn tác được.`)) return;
    try {
      if (editableKind === 'VOCAB') await deleteVocabulary(item.id, token);
      else await deleteKanjiEntry(item.id, token);
      await refreshData();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Xóa thất bại');
    }
  };

  /** Ảnh dạng data URL không gửi kèm danh sách — tải bản ghi khi bấm xem. */
  const openImage = async (item: JlptMindItem) => {
    if (item.imageUrl) {
      setLightbox(toLocalImageUrl(item.imageUrl) ?? item.imageUrl);
      return;
    }
    if (item.id == null) return;
    try {
      const full = kind === 'KANJI' ? await fetchKanjiEntryById(item.id) : await fetchVocabularyById(item.id);
      if (full.imageUrl) setLightbox(toLocalImageUrl(full.imageUrl) ?? full.imageUrl);
    } catch {
      // bỏ qua — không xem được ảnh thì thôi
    }
  };

  const needle = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      (activeBranch?.patterns ?? []).filter(
        (p) =>
          !needle ||
          p.pattern.toLowerCase().includes(needle) ||
          p.meaning.toLowerCase().includes(needle),
      ),
    [activeBranch, needle],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Đang gõ trong ô tìm kiếm thì ←/→ là di chuyển con trỏ, không phải đổi cấp.
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      const idx = JLPT_MIND_LEVELS.indexOf(level);
      if (e.key === 'ArrowLeft' && idx > 0) {
        e.preventDefault();
        setLevel(JLPT_MIND_LEVELS[idx - 1]);
      } else if (e.key === 'ArrowRight' && idx < JLPT_MIND_LEVELS.length - 1) {
        e.preventDefault();
        setLevel(JLPT_MIND_LEVELS[idx + 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [level]);

  const branchCount = map.branches.length;
  const getMeta = (lv: JlptMindLevel) => activeMaps.find((m) => m.level === lv) ?? activeMaps[0];

  return (
    <div className="container gmm-view">
      <header className="gmm-header">
        <div>
          <h1 className="view-title gmm-title">{title}</h1>
          <p className="gmm-subtitle">{subtitle}</p>
        </div>
        {headerLinks ? <div className="gmm-header-links">{headerLinks}</div> : null}
      </header>

      {kind ? (
        <div className="gmm-mode" role="group" aria-label="Chế độ sơ đồ">
          <button
            type="button"
            className={`gmm-mode__btn${mode === 'topic' ? ' is-active' : ''}`}
            aria-pressed={mode === 'topic'}
            onClick={() => setMode('topic')}
          >
            Sơ đồ chủ đề
          </button>
          <button
            type="button"
            className={`gmm-mode__btn${mode === 'data' ? ' is-active' : ''}`}
            aria-pressed={mode === 'data'}
            onClick={() => setMode('data')}
          >
            Toàn bộ dữ liệu
          </button>
          {mode === 'data' && data.loading ? <span className="gmm-mode__note">Đang tải dữ liệu…</span> : null}
          {mode === 'data' && data.error ? (
            <span className="gmm-mode__note">Không tải được dữ liệu — đang hiện sơ đồ chủ đề.</span>
          ) : null}
        </div>
      ) : null}

      <div className="gmm-level-tabs" role="tablist" aria-label="Cấp JLPT">
        {JLPT_MIND_LEVELS.map((lv) => {
          const meta = getMeta(lv);
          const active = lv === level;
          return (
            <button
              key={lv}
              type="button"
              role="tab"
              aria-selected={active}
              className={`gmm-level-tab${active ? ' is-active' : ''}`}
              style={{ '--gmm-accent': meta.accent } as CSSProperties}
              onClick={() => setLevel(lv)}
            >
              <span className="gmm-level-tab__code">{lv}</span>
              <span className="gmm-level-tab__title">{meta.title}</span>
            </button>
          );
        })}
      </div>

      <p className="gmm-level-summary" style={{ borderColor: map.accent }}>
        <strong style={{ color: map.accent }}>{map.level}</strong> — {map.summary}
        {loading ? ' · Đang đồng bộ…' : ''}
      </p>

      <div className="gmm-layout">
        <section className="gmm-map glass-panel" aria-label={`Sơ đồ ${map.level}`}>
          <div className="gmm-orbit" style={{ '--gmm-accent': map.accent } as CSSProperties}>
            <div className="gmm-hub">
              <span className="gmm-hub__level">{map.level}</span>
              <span className="gmm-hub__label">Mind map</span>
              <span className="gmm-hub__count">{branchCount} nhánh</span>
            </div>

            <ul className="gmm-branches">
              {map.branches.map((branch, index) => {
                const { x, y } = branchPosition(branch, index, branchCount);
                const selected = branch.id === activeBranch?.id;
                return (
                  <li
                    key={branch.id}
                    className={`gmm-branch${selected ? ' is-active' : ''}`}
                    style={{ left: `${x}%`, top: `${y}%` }}
                  >
                    <button
                      type="button"
                      className="gmm-branch__btn"
                      onClick={() => setActiveBranchId(branch.id)}
                      aria-pressed={selected}
                    >
                      <span className="gmm-branch__ja japanese-text">{branch.labelJa}</span>
                      <span className="gmm-branch__vi">{branch.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <svg className="gmm-spokes" viewBox="0 0 100 100" aria-hidden>
              {map.branches.map((branch, index) => {
                const { x, y } = branchPosition(branch, index, branchCount);
                // Kéo tới tâm nhánh; hộp nhánh (z-index cao hơn) che phần thừa nên đường nối chạm mép hộp.
                return (
                  <line
                    key={branch.id}
                    x1="50"
                    y1="50"
                    x2={x}
                    y2={y}
                    className={branch.id === activeBranch?.id ? 'is-active' : undefined}
                  />
                );
              })}
            </svg>
          </div>
        </section>

        <aside className="gmm-detail glass-panel">
          {activeBranch ? (
            <>
              <div className="gmm-detail__head">
                {activeBranch.labelJa ? (
                  <p className="gmm-detail__ja japanese-text">{activeBranch.labelJa}</p>
                ) : null}
                <h2>{activeBranch.label}</h2>
                {activeBranch.hint ? <p className="gmm-detail__hint">{activeBranch.hint}</p> : null}
              </div>
              {activeBranch.patterns.length > 12 ? (
                <input
                  type="search"
                  className="gmm-search"
                  placeholder={`Tìm trong ${activeBranch.patterns.length} mục…`}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setLimit(PAGE_SIZE);
                  }}
                  aria-label="Tìm trong nhánh"
                />
              ) : null}
              {editableKind ? (
                <button
                  type="button"
                  className="btn btn-primary btn-sm gmm-add"
                  onClick={() => setEditor({})}
                  disabled={branchLessons.length === 0}
                >
                  + Thêm {editableKind === 'VOCAB' ? 'từ' : 'chữ'} vào nhánh này
                </button>
              ) : null}
              {needle ? (
                <p className="gmm-detail__count">
                  {filtered.length} / {activeBranch.patterns.length} mục khớp
                </p>
              ) : null}
              <ul className="gmm-pattern-list">
                {filtered.slice(0, limit).map((item, index) => {
                  const href = resolveMindItemHref(item, lessonPath);
                  const label = resolveMindItemLinkLabel(item);
                  const speak = speakTextsFor(item, kind);
                  const thumb = item.imageUrl ? (toLocalImageUrl(item.imageUrl) ?? item.imageUrl) : null;
                  return (
                    <li key={`${index}-${item.id ?? item.pattern}`}>
                      {thumb ? (
                        <button type="button" className="gmm-thumb" onClick={() => void openImage(item)} aria-label="Xem ảnh">
                          <img src={thumb} alt="" loading="lazy" />
                        </button>
                      ) : item.hasImage ? (
                        <button
                          type="button"
                          className="gmm-thumb gmm-thumb--lazy"
                          onClick={() => void openImage(item)}
                          aria-label="Xem ảnh"
                          title="Xem ảnh"
                        >
                          🖼
                        </button>
                      ) : null}
                      <div className="gmm-pattern">
                        <span className="gmm-pattern__form japanese-text">{item.pattern}</span>
                        <span className="gmm-pattern__meaning">{item.meaning}</span>
                      </div>
                      <div className="gmm-row-actions">
                        {speak.length ? (
                          <button
                            type="button"
                            className="gmm-icon-btn"
                            onClick={() => void playAudioSequence(speak, { pauseMs: 450 })}
                            aria-label={`Phát âm ${speak.join(', ')}`}
                            title={speak.join(' · ')}
                          >
                            🔊
                          </button>
                        ) : null}
                        {editableKind && item.id != null ? (
                          <>
                            <button
                              type="button"
                              className="gmm-icon-btn"
                              onClick={() => setEditor({ id: item.id })}
                              aria-label={`Sửa ${item.pattern}`}
                              title="Sửa / đổi ảnh"
                            >
                              ✎
                            </button>
                            <button
                              type="button"
                              className="gmm-icon-btn gmm-icon-btn--danger"
                              onClick={() => void removeItem(item)}
                              aria-label={`Xóa ${item.pattern}`}
                              title="Xóa"
                            >
                              🗑
                            </button>
                          </>
                        ) : null}
                        {href && label ? (
                          <Link href={href} className="btn btn-nav btn-sm">
                            {label}
                          </Link>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {filtered.length > limit ? (
                <button type="button" className="btn btn-outline btn-sm gmm-more" onClick={() => setLimit((n) => n + PAGE_SIZE)}>
                  Xem thêm ({filtered.length - limit} mục)
                </button>
              ) : null}
            </>
          ) : (
            <p className="gmm-detail__empty">Chọn một nhánh trên sơ đồ.</p>
          )}
        </aside>
      </div>

      {editor && editableKind && token ? (
        <MindMapItemEditor
          kind={editableKind}
          token={token}
          id={editor.id}
          lessons={branchLessons}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            void refreshData();
          }}
        />
      ) : null}
      {lightbox ? <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} /> : null}

      {kind ? <TextbookPanel level={map.level} kind={kind} accent={map.accent} /> : null}

      <p className="gmm-footnote">
        {footnote ??
          (showingData
            ? `Mẹo: phím ← / → đổi cấp N5–N1. Chế độ "Toàn bộ dữ liệu" liệt kê mọi mục ${map.level} đang có trong app.`
            : `Mẹo: phím ← / → đổi cấp N5–N1. Sơ đồ theo chủ đề — bấm "Toàn bộ dữ liệu" để xem hết các mục ${map.level}.`)}
      </p>
    </div>
  );
}

function TextbookPanel({
  level,
  kind,
  accent,
}: {
  level: JlptMindLevel;
  kind: JlptMindKind;
  accent: string;
}) {
  // Danh mục giáo trình lấy từ DB (TextbookSeries / TextbookBook)
  const { data: catalog } = useTextbookCatalog();
  if (!catalog?.series.length) return null;
  return (
    <section
      className="gmm-books glass-panel"
      style={{ '--gmm-accent': accent } as CSSProperties}
      aria-label={`Giáo trình ${level}`}
    >
      <h2 className="gmm-books__title">Giáo trình tham khảo {level}</h2>
      <div className="gmm-books__grid">
        {catalog.series.map((meta) => {
          const series = meta.code;
          const items = booksFor(meta, level, kind);
          // Bộ không có sách nào cho loại sơ đồ này (vd KLL ở ngữ pháp, Minna ở kanji) → ẩn hẳn
          if (!items.length && !meta.books.some((b) => b.kinds.includes(kind))) return null;
          return (
            <div key={series} className="gmm-books__series">
              <a href={meta.url} target="_blank" rel="noopener noreferrer" className="gmm-books__name">
                <span>{meta.name}</span>
                <span className="japanese-text">{meta.nameJa}</span>
              </a>
              <p className="gmm-books__blurb">
                {meta.publisher} · {meta.blurb}
              </p>
              {items.length ? (
                <ul>
                  {items.map((b) => (
                    <li key={b.title}>
                      {b.url ? (
                        <a href={b.url} target="_blank" rel="noopener noreferrer" className="japanese-text">
                          {b.title}
                        </a>
                      ) : (
                        <span className="japanese-text">{b.title}</span>
                      )}
                      {b.note ? <span className="gmm-books__note"> — {b.note}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="gmm-books__none">Không có sách cấp {level} cho mục này.</p>
              )}
              {items.length && meta.planLevels.includes(level) ? (
                <Link
                  href={`/textbooks?series=${series.toLowerCase()}&level=${level.toLowerCase()}`}
                  className="btn btn-nav btn-sm gmm-books__plan"
                >
                  Học theo lộ trình {meta.name}
                </Link>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
