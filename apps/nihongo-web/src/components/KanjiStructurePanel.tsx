'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchKanjiSearch } from '../api';
import type { KanjiEntry } from '../types/api';
import {
  KANJI_COMPONENT_INFO,
  KANJI_POSITION_LABEL,
  type KanjiComponentInfo,
} from '../data/kanji-component-info';
import { fetchKanjiSvg, loadComponentIndex } from '../utils/kanji-structure-fetch';
import {
  buildReverseIndex,
  focusGroupIds,
  isKanji,
  kanjiLayout,
  componentLabel,
  componentParts,
  displayElement,
  meaningfulChildren,
  parseKanjiVgTree,
  type KanjiComponentIndex,
  type KanjiNode,
} from '../utils/kanji-structure';
import './KanjiStructurePanel.css';

const BROWSE_LIMIT = 60;

// ── Glyph: dựng lại SVG từ path KanjiVG để tô sáng từng thành phần ────────────

interface GlyphPath {
  d: string;
  groups: string[];
}

interface GlyphNumber {
  x: number;
  y: number;
  text: string;
}

function parseGlyph(svgText: string): {
  paths: GlyphPath[];
  numbers: GlyphNumber[];
} {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const paths: GlyphPath[] = [];
  doc.querySelectorAll('g[id^="kvg:StrokePaths_"] path').forEach((path) => {
    const d = path.getAttribute('d');
    if (!d) return;
    const groups: string[] = [];
    for (let el = path.parentElement; el && el.tagName === 'g'; el = el.parentElement) {
      const id = el.getAttribute('id') ?? '';
      if (id.startsWith('kvg:StrokePaths_')) break;
      groups.push(id.replace(/^kvg:[0-9a-f]+-?/, ''));
    }
    paths.push({ d, groups });
  });
  const numbers: GlyphNumber[] = [];
  doc.querySelectorAll('g[id^="kvg:StrokeNumbers_"] text').forEach((t) => {
    const m = (t.getAttribute('transform') ?? '').match(/matrix\(1 0 0 1 ([\d.]+) ([\d.]+)\)/);
    if (m)
      numbers.push({
        x: Number(m[1]),
        y: Number(m[2]),
        text: t.textContent ?? '',
      });
  });
  return { paths, numbers };
}

function KanjiGlyph({
  svgText,
  colorOf,
  focus,
  showNumbers,
}: {
  svgText: string;
  /** Màu (0–3) của nét theo thành phần cấp 1 chứa nó; -1 = không tô */
  colorOf: (groups: string[]) => number;
  focus: string[] | null;
  showNumbers: boolean;
}) {
  const { paths, numbers } = useMemo(() => parseGlyph(svgText), [svgText]);
  const focusSet = focus && !focus.includes('') ? new Set(focus) : null;
  return (
    <svg
      className={`ks-glyph${focusSet ? ' ks-glyph--focus' : ''}`}
      viewBox="0 0 109 109"
      role="img"
      aria-hidden="true"
    >
      <g className="ks-glyph-guide">
        <line x1="54.5" y1="2" x2="54.5" y2="107" />
        <line x1="2" y1="54.5" x2="107" y2="54.5" />
      </g>
      {paths.map((p, i) => {
        const color = colorOf(p.groups);
        const cls = [
          color >= 0 ? `ks-c${color}` : '',
          focusSet && p.groups.some((g) => focusSet.has(g)) ? 'is-focus' : '',
        ]
          .filter(Boolean)
          .join(' ');
        return <path key={i} d={p.d} className={cls || undefined} />;
      })}
      {showNumbers &&
        numbers.map((n, i) => (
          <text key={i} x={n.x} y={n.y} className="ks-glyph-number">
            {n.text}
          </text>
        ))}
    </svg>
  );
}

/** Sơ đồ bố cục nhỏ thay cho ký tự ⿰⿱… (nhiều font không có các ký tự này). */
const LAYOUT_SHAPES: Record<string, string> = {
  '⿰': 'M1 1h8v18H1zM11 1h8v18h-8z',
  '⿲': 'M1 1h5v18H1zM7.5 1h5v18h-5zM14 1h5v18h-5z',
  '⿱': 'M1 1h18v8H1zM1 11h18v8H1z',
  '⿳': 'M1 1h18v5H1zM1 7.5h18v5H1zM1 14h18v5H1z',
  '⿴': 'M1 1h18v18H1zM6 6h8v8H6z',
  '⿸': 'M1 19V1h18M7 7h12v12H7z',
  '⿺': 'M1 1v18h18M7 1h12v12H7z',
  '◻': 'M1 1h18v18H1z',
};

function LayoutIcon({ symbol }: { symbol: string }) {
  const d = LAYOUT_SHAPES[symbol];
  if (!d) return null;
  return (
    <svg className="ks-layout-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

// ── Thông tin thành phần ────────────────────────────────────────────────────

type EntryMap = Record<string, KanjiEntry | null>;

function componentKey(node: KanjiNode): string {
  return node.e ?? node.o ?? '';
}

/** Chữ hiện trên nút. Mã CHISE (CDP-…) thay bằng các thành phần con, ví dụ 白 trên 小. */
function NodeChar({ node }: { node: KanjiNode }) {
  const parts = componentParts(node);
  if (parts.length > 1) {
    return (
      <span className="ks-node-char ks-node-char--parts japanese-text" title={componentLabel(node)}>
        {parts.map((part, i) => (
          <span key={`${part}-${i}`}>{part}</span>
        ))}
      </span>
    );
  }
  return <span className="ks-node-char japanese-text">{parts[0] ?? componentLabel(node)}</span>;
}

function describe(char: string, entries: EntryMap): { title: string; meaning: string } | null {
  const info: KanjiComponentInfo | undefined = KANJI_COMPONENT_INFO[char];
  if (info) {
    const base = info.base ? ` · dạng biến thể của ${info.base}` : '';
    return {
      title: `Bộ ${info.hv}${info.jp ? ` (${info.jp})` : ''}`,
      meaning: `${info.vi}${base}`,
    };
  }
  const entry = entries[char];
  if (entry) {
    return {
      title: entry.hanViet ? entry.hanViet.toUpperCase() : char,
      meaning: entry.meaningVi,
    };
  }
  return null;
}

function findRadical(root: KanjiNode): KanjiNode | null {
  let best: KanjiNode | null = null;
  const rank = (r?: string) => (r === 'general' ? 3 : r === 'tradit' ? 2 : r ? 1 : 0);
  const walk = (n: KanjiNode) => {
    if (n.e && rank(n.r) > rank(best?.r)) best = n;
    n.c?.forEach(walk);
  };
  root.c?.forEach(walk);
  return best;
}

function findPhonetic(root: KanjiNode): KanjiNode | null {
  let found: KanjiNode | null = null;
  const walk = (n: KanjiNode) => {
    if (!found && n.ph && n.e) found = n;
    n.c?.forEach(walk);
  };
  root.c?.forEach(walk);
  return found;
}

const COLOR_COUNT = 4;

function containsId(node: KanjiNode, id: string): boolean {
  return node.id === id || (node.c ?? []).some((c) => containsId(c, id));
}

/** Gộp các phần của cùng một thành phần bị tách (kvg:part 1, 2…) thành một dòng. */
function mergeParts(nodes: KanjiNode[]): { node: KanjiNode; parts: number }[] {
  const out: { node: KanjiNode; parts: number }[] = [];
  for (const node of nodes) {
    const prev = node.pt && node.e ? out.find((x) => x.node.pt && x.node.e === node.e) : undefined;
    if (prev) prev.parts += 1;
    else out.push({ node, parts: 1 });
  }
  return out;
}

interface FocusProps {
  focusId: string | null;
  onFocus: (node: KanjiNode | null) => void;
}

function focusHandlers(node: KanjiNode, onFocus: FocusProps['onFocus']) {
  return {
    onMouseEnter: () => onFocus(node),
    onMouseLeave: () => onFocus(null),
    onFocus: () => onFocus(node),
    onBlur: () => onFocus(null),
  };
}

function SubComponents({
  nodes,
  entries,
  focusId,
  onFocus,
}: { nodes: KanjiNode[]; entries: EntryMap } & FocusProps) {
  return (
    <ul className="ks-sub">
      {mergeParts(nodes).map(({ node, parts }) => {
        const key = componentKey(node);
        const info = describe(key, entries) ?? (node.o ? describe(node.o, entries) : null);
        const children = meaningfulChildren(node);
        return (
          <li key={node.id}>
            <div
              className={`ks-sub-row${focusId === node.id ? ' is-active' : ''}`}
              tabIndex={0}
              {...focusHandlers(node, onFocus)}
            >
              <NodeChar node={node} />
              <span className="ks-sub-text">
                {info ? (
                  <>
                    <strong>{info.title.replace(/^Bộ /, '')}</strong>
                    <span className="ks-sub-meaning"> · {info.meaning}</span>
                  </>
                ) : (
                  <span className="ks-sub-meaning">Chưa có ghi chú</span>
                )}
              </span>
              <span className="ks-sub-meta">
                {parts > 1 ? `tách ${parts} phần · ` : ''}
                {node.n * parts} nét
              </span>
            </div>
            {children.length > 0 && (
              <SubComponents nodes={children} entries={entries} focusId={focusId} onFocus={onFocus} />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ComponentCard({
  node,
  color,
  entries,
  focusId,
  onFocus,
  onBrowse,
  browsing,
}: {
  node: KanjiNode;
  color: number;
  entries: EntryMap;
  onBrowse: (char: string) => void;
  browsing: string | null;
} & FocusProps) {
  const key = componentKey(node);
  const info = describe(key, entries) ?? (node.o ? describe(node.o, entries) : null);
  const pos = node.p ? KANJI_POSITION_LABEL[node.p] : undefined;
  const children = meaningfulChildren(node);
  const active = focusId !== null && containsId(node, focusId);
  return (
    <article className={`ks-comp ks-c${color}${active ? ' is-active' : ''}`}>
      <div className="ks-comp-head" tabIndex={0} {...focusHandlers(node, onFocus)}>
        <div className="ks-comp-tile">
          <NodeChar node={node} />
        </div>
        <div className="ks-comp-title-wrap">
          <h4 className="ks-comp-title">{info ? info.title : componentLabel(node) || key}</h4>
          <p className={`ks-comp-meaning${info ? '' : ' is-muted'}`}>
            {info ? info.meaning : 'Chưa có ghi chú cho thành phần này.'}
          </p>
        </div>
      </div>
      <div className="ks-tags">
        {pos && (
          <span className="ks-tag">
            {pos.vi}
            {pos.jp ? <span className="japanese-text"> · {pos.jp}</span> : null}
          </span>
        )}
        {node.r && <span className="ks-tag ks-tag--radical">Bộ thủ</span>}
        {node.ph && <span className="ks-tag ks-tag--phon">Gợi âm đọc</span>}
        {node.o && node.o !== key && (
          <span className="ks-tag">
            dạng gốc <span className="japanese-text">{node.o}</span>
          </span>
        )}
        <span className="ks-tag ks-tag--plain">{node.n} nét</span>
      </div>
      {children.length > 0 && (
        <div className="ks-comp-children">
          <span className="ks-comp-children-label">Gồm</span>
          <SubComponents nodes={children} entries={entries} focusId={focusId} onFocus={onFocus} />
        </div>
      )}
      <button
        type="button"
        className={`ks-browse-btn${browsing === key ? ' is-active' : ''}`}
        aria-pressed={browsing === key}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onBrowse(key);
        }}
      >
        Chữ khác có <span className="japanese-text">{componentLabel(node) || key}</span>
        <span aria-hidden="true">→</span>
      </button>
    </article>
  );
}

// ── Bộ nhớ đệm dùng chung (trang /kanji/structure và cửa sổ phân tích) ─────

const entryCache = new Map<string, Promise<KanjiEntry | null>>();

/** Tra KanjiEntry đúng chữ (API tìm theo chuỗi con nên lọc lại). null = không có trong DB. */
function lookupEntry(char: string): Promise<KanjiEntry | null> {
  let p = entryCache.get(char);
  if (!p) {
    p = fetchKanjiSearch(char)
      .then((list) => list.find((e) => e.character === char) ?? null)
      .catch(() => {
        entryCache.delete(char);
        return null;
      });
    entryCache.set(char, p);
  }
  return p;
}

let reverseIndexCache: {
  index: KanjiComponentIndex;
  reverse: Map<string, string[]>;
} | null = null;

function reverseIndexOf(index: KanjiComponentIndex): Map<string, string[]> {
  if (reverseIndexCache?.index !== index) {
    reverseIndexCache = { index, reverse: buildReverseIndex(index) };
  }
  return reverseIndexCache.reverse;
}

// ── Panel ───────────────────────────────────────────────────────────────────

export interface KanjiStructurePanelProps {
  /** Chữ kanji cần phân tích */
  char: string;
  /** Bấm một chữ trong danh sách "chữ cùng thành phần" */
  onPickChar: (char: string) => void;
}

export default function KanjiStructurePanel({ char, onPickChar }: KanjiStructurePanelProps) {
  const [index, setIndex] = useState<KanjiComponentIndex | null>(null);
  const [svgText, setSvgText] = useState<string | null>(null);
  const [tree, setTree] = useState<KanjiNode | null>(null);
  const [loadedChar, setLoadedChar] = useState<string | null>(null);
  const [entries, setEntries] = useState<EntryMap>({});
  const [focus, setFocus] = useState<KanjiNode | null>(null);
  const [browse, setBrowse] = useState<string | null>(null);
  const [showNumbers, setShowNumbers] = useState(false);
  const browseRef = useRef<HTMLElement | null>(null);

  const handleBrowse = (key: string) => {
    setBrowse((prev) => (prev === key ? null : key));
  };

  useEffect(() => {
    if (!browse) return;
    browseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [browse]);

  useEffect(() => {
    loadComponentIndex()
      .then(setIndex)
      .catch(() => setIndex({}));
  }, []);

  // SVG + cây cấu tạo của chữ đang chọn
  useEffect(() => {
    if (!index) return undefined;
    let cancelled = false;
    setFocus(null);
    setBrowse(null);
    void fetchKanjiSvg(char).then((svg) => {
      if (cancelled) return;
      setSvgText(svg);
      setTree(index[char] ?? (svg ? parseKanjiVgTree(svg) : null));
      setLoadedChar(char);
    });
    return () => {
      cancelled = true;
    };
  }, [char, index]);

  // Hán Việt / nghĩa trong DB cho chữ chính và các thành phần là kanji
  useEffect(() => {
    const wanted = new Set<string>([char]);
    const walk = (n: KanjiNode) => {
      for (const k of [n.e, n.o]) if (k && isKanji(k) && !KANJI_COMPONENT_INFO[k]) wanted.add(k);
      n.c?.forEach(walk);
    };
    if (tree && loadedChar === char) tree.c?.forEach(walk);
    let cancelled = false;
    for (const c of wanted) {
      void lookupEntry(c).then((entry) => {
        if (!cancelled) setEntries((prev) => (prev[c] === entry ? prev : { ...prev, [c]: entry }));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [char, tree, loadedChar]);

  const browseList = useMemo(() => {
    if (!browse || !index) return [];
    return [...(reverseIndexOf(index).get(browse) ?? [])].sort(
      (a, b) => (index[a]?.n ?? 0) - (index[b]?.n ?? 0) || a.localeCompare(b),
    );
  }, [browse, index]);

  if (loadedChar !== char) {
    return <p className="ks-empty">Đang tải dữ liệu cấu tạo…</p>;
  }
  if (!tree) {
    return (
      <p className="ks-empty">
        Chưa có dữ liệu cấu tạo cho chữ <span className="japanese-text">{char}</span>.
      </p>
    );
  }

  const top = meaningfulChildren(tree);
  const layout = kanjiLayout(tree);
  const radical = findRadical(tree);
  const phonetic = findPhonetic(tree);
  const mainEntry = entries[char];
  const focusIds = focus ? focusGroupIds(tree, focus) : null;
  const radicalInfo = radical ? describe(componentKey(radical), entries) : null;

  // Mỗi thành phần cấp 1 một màu; chữ đơn thì để nét màu chữ thường.
  const topGroups = top.length > 1 ? top.map((n) => new Set(focusGroupIds(tree, n))) : [];
  const colorOf = (groups: string[]) =>
    topGroups.findIndex((set) => groups.some((g) => set.has(g))) % COLOR_COUNT;
  const colorIndex = (i: number) => (top.length > 1 ? i % COLOR_COUNT : -1);

  const readings = [
    mainEntry?.onyomi && { label: 'On', value: mainEntry.onyomi },
    mainEntry?.kunyomi && { label: 'Kun', value: mainEntry.kunyomi },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="ks-result">
      <div className="ks-layout">
        <aside className="ks-aside">
          <div className="ks-glyph-card glass-panel">
            {svgText ? (
              <KanjiGlyph svgText={svgText} colorOf={colorOf} focus={focusIds} showNumbers={showNumbers} />
            ) : (
              <span className="ks-glyph-fallback japanese-text">{char}</span>
            )}
            {svgText && (
              <button
                type="button"
                className={`ks-toggle${showNumbers ? ' is-on' : ''}`}
                aria-pressed={showNumbers}
                onClick={() => setShowNumbers((v) => !v)}
              >
                <span className="ks-toggle-dot" aria-hidden="true" />
                Thứ tự nét
              </button>
            )}
            <dl className="ks-stats">
              <div>
                <dt>Số nét</dt>
                <dd>{tree.n}</dd>
              </div>
              {layout && (
                <div>
                  <dt>Bố cục</dt>
                  <dd className="ks-stats-layout">
                    <LayoutIcon symbol={layout.symbol} />
                    {layout.label}
                  </dd>
                </div>
              )}
              {radical && (
                <div>
                  <dt>Bộ thủ</dt>
                  <dd>
                    <span className="japanese-text">{componentLabel(radical)}</span>
                    {radicalInfo && ` ${radicalInfo.title.replace(/^Bộ /, '')}`}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </aside>

        <div className="ks-main">
          <section className="ks-overview glass-panel">
            {(mainEntry?.hanViet || mainEntry?.meaningVi) && (
              <div className="ks-headline">
                {mainEntry?.hanViet && <span className="ks-hv">{mainEntry.hanViet.toUpperCase()}</span>}
                {mainEntry?.meaningVi && <span className="ks-meaning">{mainEntry.meaningVi}</span>}
              </div>
            )}
            {readings.length > 0 && (
              <div className="ks-readings">
                {readings.map((r) => (
                  <span key={r.label} className="ks-reading">
                    <span className="ks-reading-label">{r.label}</span>
                    <span className="japanese-text">{r.value}</span>
                  </span>
                ))}
              </div>
            )}
            {top.length > 0 && (
              <div
                className="ks-formula japanese-text"
                aria-label={`${char} gồm ${top.map(componentLabel).join(', ')}`}
              >
                <span className="ks-formula-char">{char}</span>
                <span className="ks-formula-op">=</span>
                {top.map((n, i) => (
                  <span key={n.id} className="ks-formula-item">
                    {i > 0 && <span className="ks-formula-op">+</span>}
                    <button
                      type="button"
                      className={`ks-formula-part ks-c${colorIndex(i)}${
                        focus && containsId(n, focus.id) ? ' is-active' : ''
                      }`}
                      title="Xem các chữ khác có thành phần này"
                      {...focusHandlers(n, setFocus)}
                      onClick={() => handleBrowse(componentKey(n))}
                    >
                      {componentLabel(n)}
                    </button>
                  </span>
                ))}
              </div>
            )}
            {phonetic && radical && componentKey(phonetic) !== componentKey(radical) && (
              <p className="ks-note">
                <span className="ks-note-label">Chữ hình thanh</span>
                Phần <span className="japanese-text">{componentLabel(radical)}</span> gợi ý nghĩa, phần{' '}
                <span className="japanese-text">{componentLabel(phonetic)}</span> gợi âm đọc (On). Các chữ
                cùng phần gợi âm thường đọc giống hoặc gần giống nhau.
              </p>
            )}
            {mainEntry?.mnemonicVi && (
              <p className="ks-note ks-note--tip">
                <span className="ks-note-label">Mẹo nhớ</span>
                {mainEntry.mnemonicVi}
              </p>
            )}
            {mainEntry === null && (
              <p className="ks-note ks-note--muted">Chữ này chưa có trong bảng kanji của ứng dụng.</p>
            )}
          </section>

          <section className="ks-section">
            <h3 className="ks-section-title">
              Các thành phần
              {top.length > 0 && <span className="ks-section-hint">Rê chuột để xem nét trên chữ</span>}
            </h3>
            {top.length > 0 ? (
              <div className="ks-comps">
                {top.map((n, i) => (
                  <ComponentCard
                    key={n.id}
                    node={n}
                    color={Math.max(colorIndex(i), 0)}
                    entries={entries}
                    focusId={focus?.id ?? null}
                    onFocus={setFocus}
                    onBrowse={handleBrowse}
                    browsing={browse}
                  />
                ))}
              </div>
            ) : (
              <p className="ks-empty glass-panel">
                <span className="japanese-text">{char}</span> là chữ đơn (tượng hình / chỉ sự), không tách
                thành bộ phận nhỏ hơn.
              </p>
            )}
          </section>

          {browse && (
            <section ref={browseRef} className="ks-section ks-browse-panel glass-panel">
              <div className="ks-section-head">
                <h3 className="ks-section-title">
                  Chữ có thành phần <span className="japanese-text">{displayElement(browse)}</span>
                  <span className="ks-count">{browseList.length} chữ</span>
                </h3>
                <button
                  type="button"
                  className="ks-close-btn"
                  onClick={() => setBrowse(null)}
                  aria-label="Đóng"
                >
                  ×
                </button>
              </div>
              {browseList.length > 0 ? (
                <div className="ks-browse">
                  {browseList.slice(0, BROWSE_LIMIT).map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`ks-browse-char japanese-text${c === char ? ' is-active' : ''}`}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        onPickChar(c);
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="ks-empty">Không có chữ nào khác trong dữ liệu có thành phần này.</p>
              )}
              {browseList.length > BROWSE_LIMIT && (
                <p className="ks-count">Hiển thị {BROWSE_LIMIT} chữ ít nét nhất.</p>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
