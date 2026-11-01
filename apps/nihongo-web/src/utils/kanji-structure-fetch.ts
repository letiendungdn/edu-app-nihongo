import { kanjivgHex, kanjivgStrokeFetchUrls } from '@edu/vocab-images';
import { fetchKanjiComponents } from '../api';
import type { KanjiComponent } from '../types/api';
import type { KanjiComponentIndex } from './kanji-structure';

/** Thành phần / bộ thủ theo chữ KanjiVG (亻, 氵, 袁…). */
export type ComponentInfoMap = Record<string, KanjiComponent>;

const INDEX_URL = '/media/kanji-components.json';
const CDN_BASE = 'https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji';

let indexPromise: Promise<KanjiComponentIndex> | null = null;

/** Chỉ mục cấu tạo sinh từ SVG local (scripts/build-kanji-components.mjs). */
export function loadComponentIndex(): Promise<KanjiComponentIndex> {
  indexPromise ??= fetch(INDEX_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<KanjiComponentIndex>;
    })
    .catch((err) => {
      indexPromise = null;
      throw err;
    });
  return indexPromise;
}

let infoPromise: Promise<ComponentInfoMap> | null = null;

/** Bảng KanjiComponent trong DB (tải một lần, dùng chung cho mọi lần mở bảng cấu tạo). */
export function loadComponentInfo(): Promise<ComponentInfoMap> {
  infoPromise ??= fetchKanjiComponents()
    .then((rows) => Object.fromEntries(rows.map((row) => [row.component, row])))
    .catch((err) => {
      infoPromise = null;
      throw err;
    });
  return infoPromise;
}

/** SVG KanjiVG của một chữ: file local trước, không có thì tải từ CDN của KanjiVG. */
export async function fetchKanjiSvg(char: string): Promise<string | null> {
  const urls = [...kanjivgStrokeFetchUrls(char), `${CDN_BASE}/${kanjivgHex(char)}.svg`];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const text = await res.text();
        if (text.includes('kvg:StrokePaths_')) return text;
      }
    } catch {
      /* thử nguồn tiếp theo */
    }
  }
  return null;
}
