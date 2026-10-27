'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchMindMaps, type MindMapKindApi, type MindMapLevelApi } from '../api';
import type { JlptMindMapLevel } from '../data/jlpt-mind-map-shared';

const LEVEL_ORDER = ['N5', 'N4', 'N3', 'N2', 'N1'];

export function apiToView(rows: MindMapLevelApi[]): JlptMindMapLevel[] {
  return [...rows]
    .sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level))
    .map((row) => ({
      id: row.id,
      kind: row.kind,
      level: row.level,
      title: row.title,
      summary: row.summary,
      accent: row.accent,
      sortOrder: row.sortOrder,
      branches: (Array.isArray(row.branches) ? row.branches : []).map((b) => ({
        id: b.id,
        label: b.label,
        labelJa: b.labelJa,
        hint: b.hint,
        posX: b.posX,
        posY: b.posY,
        patterns: (b.patterns ?? []).map((p) => ({
          pattern: p.pattern,
          meaning: p.meaning,
          href: p.href,
          lessonNumber: p.lessonNumber,
          linkLabel: p.linkLabel,
        })),
      })),
    }));
}

/**
 * Sơ đồ chủ đề từ DB (bảng MindMapLevel, seed: infra/postgres/nihongo-content-seed.sql).
 * Không còn bản sao trong code — sửa qua trang admin "Sơ đồ tư duy".
 */
export function useMindMapLevels(kind: MindMapKindApi) {
  const query = useQuery({
    queryKey: ['mind-maps', kind],
    queryFn: () => fetchMindMaps(kind),
    staleTime: 5 * 60 * 1000,
    select: apiToView,
  });
  return { maps: query.data ?? [], loading: query.isLoading, error: query.isError };
}
