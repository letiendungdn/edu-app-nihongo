/** Một nút trong cây cấu tạo KanjiVG (xem scripts/build-kanji-components.mjs). */
export interface KanjiNode {
  /** id nhóm trong SVG, vd. "g1" (gốc là "") */
  id: string;
  /** Số nét thuộc nhóm */
  n: number;
  /** Thành phần (kvg:element) */
  e?: string;
  /** Dạng gốc (kvg:original), vd. 亻 → 人 */
  o?: string;
  /** Vị trí: left, right, top, bottom, tare, nyo, kamae… */
  p?: string;
  /** Là bộ thủ (general / tradit / nelson) */
  r?: string;
  /** Thành phần biểu âm */
  ph?: string;
  /** Thành phần bị tách làm nhiều phần (1, 2…) */
  pt?: string;
  c?: KanjiNode[];
}

export type KanjiComponentIndex = Record<string, KanjiNode>;

export function isKanji(char: string): boolean {
  return /\p{Script=Han}/u.test(char);
}

/** Mã nội bộ KanjiVG/CHISE (vd. CDP-8BC4), không phải một chữ để hiển thị. */
export function isCodedElement(value: string): boolean {
  return /^[A-Z][A-Z0-9]*-/.test(value);
}

/**
 * Bảng ghi đè chi tiết cấu tạo cho các chữ bị KanjiVG phân tích sai.
 */
const KANJI_OVERRIDE_LABELS: Record<string, string> = {
  '師': 'Phần trên (biến thể của 方) + 巾',
  '行': '彳 (Xích) + 亍 (Xúc)',
};

/**
 * Bảng ghi đè thành phần con để tránh bị phân tích sai thành các nét đơn.
 */
const KANJI_OVERRIDE_COMPONENTS: Record<string, string[]> = {
  '師': ['Phần trên (biến thể của 方)', '巾'],
  '行': ['彳', '亍'],
};

/**
 * Chữ dùng để vẽ một nút.
 */
export function componentParts(node: KanjiNode, rootChar?: string): string[] {
  // Nếu là nút gốc và có trong bảng ghi đè thành phần, trả về các thành phần đúng.
  if (rootChar && KANJI_OVERRIDE_COMPONENTS[rootChar] && node.id === '') {
    return KANJI_OVERRIDE_COMPONENTS[rootChar];
  }

  // Nếu chữ chính bị lỗi phân tích, chúng ta không cho phép phân tích sâu hơn các nút con
  // để tránh hiện ra các nét đơn lẻ như 丿, 丨.
  if (rootChar && KANJI_OVERRIDE_COMPONENTS[rootChar]) {
    const raw = node.e ?? '';
    if (raw && !isCodedElement(raw)) return [raw];
    if (node.o && !isCodedElement(node.o)) return [node.o];
    
    // Đối với các nút con của chữ bị override, ta chỉ lấy những thành phần có nghĩa 
    // và tránh đệ quy sâu vào các nhóm nét đơn.
    const children = meaningfulChildren(node);
    if (children.length > 0) {
        const parts = children.flatMap(c => c.e ? [c.e] : []);
        if (parts.length > 0) return parts;
    }
    return [];
  }

  const raw = node.e ?? '';
  if (raw && !isCodedElement(raw)) return [raw];
  if (node.o && !isCodedElement(node.o)) return [node.o];
  return meaningfulChildren(node).flatMap((n) => componentParts(n, rootChar));
}

export function componentLabel(node: KanjiNode, rootChar?: string): string {
  if (rootChar && KANJI_OVERRIDE_LABELS[rootChar] && node.id === '') {
    return KANJI_OVERRIDE_LABELS[rootChar];
  }
  
  const parts = componentParts(node, rootChar);
  return parts.length > 0 ? parts.join('+') : '';
}

/** Nhãn khi chỉ có chuỗi element (ô “chữ có thành phần …”), không có cả nút cây. */
const CODED_ELEMENT_LABEL: Record<string, string> = {
  'CDP-8BC4': '白+小',
};

export function displayElement(key: string): string {
  return CODED_ELEMENT_LABEL[key] ?? (isCodedElement(key) ? '' : key);
}

const ATTRS: Record<string, keyof KanjiNode> = {
  'kvg:element': 'e',
  'kvg:original': 'o',
  'kvg:position': 'p',
  'kvg:radical': 'r',
  'kvg:phon': 'ph',
  'kvg:part': 'pt',
};

/** Đọc cây thành phần từ nội dung SVG KanjiVG. */
export function parseKanjiVgTree(svgText: string): KanjiNode | null {
  const start = svgText.indexOf('<g id="kvg:StrokePaths_');
  if (start < 0) return null;
  const end = svgText.indexOf('<g id="kvg:StrokeNumbers_');
  const body = svgText.slice(start, end < 0 ? undefined : end);

  const stack: Array<KanjiNode | null> = [];
  let root: KanjiNode | null = null;
  for (const m of body.matchAll(/<g\b[^>]*>|<\/g>|<path\b[^>]*\/?>/g)) {
    const tag = m[0];
    if (tag.startsWith('</g')) {
      stack.pop();
      continue;
    }
    if (tag.startsWith('<path')) {
      for (const node of stack) if (node) node.n += 1;
      continue;
    }
    const attrs: Record<string, string> = {};
    for (const a of tag.matchAll(/([\w:]+)="([^"]*)"/g)) attrs[a[1]!] = a[2]!;
    if (attrs.id?.startsWith('kvg:StrokePaths_')) {
      stack.push(null);
      continue;
    }
    const node: KanjiNode = { id: attrs.id?.replace(/^kvg:[0-9a-f]+-?/, '') ?? '', n: 0 };
    for (const [attr, key] of Object.entries(ATTRS)) {
      if (attrs[attr] != null) (node as unknown as Record<string, string>)[key] = attrs[attr]!;
    }
    const parent = stack[stack.length - 1];
    if (parent) (parent.c ??= []).push(node);
    else root ??= node;
    stack.push(node);
  }
  return root;
}

/** Thành phần trực tiếp có ý nghĩa: bỏ qua nhóm không có kvg:element (chỉ gom nét). */
export function meaningfulChildren(node: KanjiNode): KanjiNode[] {
  const out: KanjiNode[] = [];
  for (const child of node.c ?? []) {
    if (child.e) out.push(child);
    else out.push(...meaningfulChildren(child));
  }
  return out;
}

/**
 * Nét KanjiVG không gán vào thành phần nào (vd 2 nét dưới của 方, 2 nét của 万).
 * `groups` là các nhóm không tên chứa những nét đó — dùng để tô sáng khi rê chuột.
 */
export function unlabeledStrokes(root: KanjiNode): { strokes: number; groups: KanjiNode[] } {
  const labeled = meaningfulChildren(root).reduce((sum, n) => sum + n.n, 0);
  const groups: KanjiNode[] = [];
  const walk = (node: KanjiNode) => {
    for (const child of node.c ?? []) {
      if (child.e) continue;
      if (meaningfulChildren(child).length === 0) groups.push(child);
      else walk(child);
    }
  };
  walk(root);
  return { strokes: Math.max(root.n - labeled, 0), groups };
}

export interface KanjiLayout {
  symbol: string;
  label: string;
}

/** Kiểu bố cục của chữ, suy từ vị trí các thành phần cấp 1. */
export function kanjiLayout(root: KanjiNode): KanjiLayout | null {
  const positions = new Set((root.c ?? []).map((c) => c.p).filter(Boolean));
  const children = meaningfulChildren(root);
  if (positions.has('kamae')) return { symbol: '⿴', label: 'Bao quanh (構 かまえ)' };
  if (positions.has('tare')) return { symbol: '⿸', label: 'Che trên – trái (垂 たれ)' };
  if (positions.has('nyo')) return { symbol: '⿺', label: 'Bao dưới – trái (繞 にょう)' };
  if (positions.has('left') || positions.has('right')) {
    return children.length >= 3
      ? { symbol: '⿲', label: 'Trái – giữa – phải' }
      : { symbol: '⿰', label: 'Trái – phải (偏・旁)' };
  }
  if (positions.has('top') || positions.has('bottom')) {
    return children.length >= 3
      ? { symbol: '⿳', label: 'Trên – giữa – dưới' }
      : { symbol: '⿱', label: 'Trên – dưới (冠・脚)' };
  }
  if (children.length === 0) return { symbol: '◻', label: 'Chữ đơn (không tách được)' };
  return null;
}

/**
 * Các nhóm SVG cần tô sáng khi chọn một thành phần. Thành phần bị tách nhiều phần
 * (kvg:part) thì tô cả các phần còn lại.
 */
export function focusGroupIds(root: KanjiNode, node: KanjiNode): string[] {
  if (!node.pt || !node.e) return [node.id];
  const ids: string[] = [];
  const walk = (n: KanjiNode) => {
    if (n.e === node.e && n.pt) ids.push(n.id);
    n.c?.forEach(walk);
  };
  walk(root);
  return ids;
}

/** Thành phần → danh sách chữ chứa nó (tính cả dạng gốc 亻 → 人). */
export function buildReverseIndex(index: KanjiComponentIndex): Map<string, string[]> {
  const map = new Map<string, Set<string>>();
  for (const [char, root] of Object.entries(index)) {
    const walk = (n: KanjiNode) => {
      for (const key of [n.e, n.o]) {
        if (key && key !== char) {
          if (!map.has(key)) map.set(key, new Set());
          map.get(key)!.add(char);
        }
      }
      n.c?.forEach(walk);
    };
    root.c?.forEach(walk);
  }
  return new Map([...map].map(([k, v]) => [k, [...v]]));
}

/** Vị trí thành phần theo KanjiVG → nhãn tiếng Việt */
export const KANJI_POSITION_LABEL: Record<string, { vi: string; jp: string }> = {
  left: { vi: 'Bên trái', jp: '偏 へん' },
  right: { vi: 'Bên phải', jp: '旁 つくり' },
  top: { vi: 'Phía trên', jp: '冠 かんむり' },
  bottom: { vi: 'Phía dưới', jp: '脚 あし' },
  tare: { vi: 'Che trên – trái', jp: '垂 たれ' },
  tarec: { vi: 'Bên trong (dưới 垂)', jp: '' },
  nyo: { vi: 'Bao dưới – trái', jp: '繞 にょう' },
  nyoc: { vi: 'Bên trong (trên 繞)', jp: '' },
  kamae: { vi: 'Bao quanh', jp: '構 かまえ' },
  kamaec: { vi: 'Bên trong (giữa 構)', jp: '' },
  middle: { vi: 'Ở giữa', jp: '' },
};
