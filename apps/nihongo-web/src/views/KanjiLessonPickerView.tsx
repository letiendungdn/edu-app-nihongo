'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useKanjiLessonsQuery } from '../hooks/queries';
import type { KanjiLesson } from '../types/api';
import './VocabLessonPickerView.css';
import './KanjiLessonPickerView.css';

export const KANJI_BOOK_LABELS: Record<string, string> = {
  KLL: 'Kanji Look and Learn',
  // Tự tổng hợp: kanji xuất hiện lần đầu trong từ vựng từng bài Minna (không phải sách kanji chính thức)
  MINNA: 'Kanji theo bài Minna no Nihongo',
  SOUMATOME: 'Sou Matome',
  SHINKANZEN: 'Shinkanzen Master',
};

const LEVEL_ORDER = ['N5', 'N4', 'N3', 'N2', 'N1'];

type LessonGroup = { key: string; label: string; items: KanjiLesson[] };

/** Nhóm bài theo giáo trình rồi cấp JLPT, giữ thứ tự KLL → Minna → Sou Matome → Shinkanzen → JLPT. */
export function groupKanjiLessons(lessons: KanjiLesson[]): LessonGroup[] {
  const groups = new Map<string, LessonGroup>();
  for (const lesson of lessons) {
    const book = lesson.textbook ?? '';
    const level = lesson.jlptLevel ?? '';
    const key = `${book}|${level}`;
    if (!groups.has(key)) {
      const bookLabel = KANJI_BOOK_LABELS[book] ?? 'JLPT';
      groups.set(key, { key, label: level ? `${bookLabel} · ${level}` : bookLabel, items: [] });
    }
    groups.get(key)!.items.push(lesson);
  }
  const bookRank = (key: string) => {
    const book = key.split('|')[0];
    const order = ['KLL', 'MINNA', 'SOUMATOME', 'SHINKANZEN'];
    const i = order.indexOf(book);
    return i < 0 ? order.length : i;
  };
  const levelRank = (key: string) => {
    const i = LEVEL_ORDER.indexOf(key.split('|')[1]);
    return i < 0 ? LEVEL_ORDER.length : i;
  };
  return [...groups.values()].sort(
    (a, b) => bookRank(a.key) - bookRank(b.key) || levelRank(a.key) - levelRank(b.key),
  );
}

export default function KanjiLessonPickerView() {
  const { data: lessons = [], isLoading, isError } = useKanjiLessonsQuery();
  const [filter, setFilter] = useState('');

  const groups = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const filtered = q
      ? lessons.filter((l) => {
          const hay = [
            String(l.lessonNumber),
            l.title,
            l.jlptLevel,
            l.textbook ? KANJI_BOOK_LABELS[l.textbook] : '',
            (l.entries ?? []).map((e) => e.character).join(''),
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return hay.includes(q);
        })
      : lessons;
    return groupKanjiLessons(filtered.filter((l) => (l._count?.entries ?? 1) > 0));
  }, [lessons, filter]);

  return (
    <div className="container vocab-lesson-picker kanji-lesson-picker">
      <header className="vocab-lesson-picker__header">
        <h2 className="view-title">Kanji — Chọn bài học</h2>
        <p className="vocab-lesson-picker__subtitle">
          Chọn bài để học từng chữ: nét viết, âm đọc, nghĩa và từ vựng liên quan.
        </p>
        <nav className="vocab-lesson-picker__links" aria-label="Công cụ kanji">
          <Link href="/kanji/quiz" className="btn btn-outline btn-sm">
            Trắc nghiệm Kanji
          </Link>
          <Link href="/kanji/list" className="btn btn-outline btn-sm">
            Bảng N5 → N1
          </Link>
          <Link href="/kanji/structure" className="btn btn-outline btn-sm">
            Cấu tạo Kanji
          </Link>
        </nav>
        <label className="vocab-lesson-picker__filter">
          <span className="sr-only">Lọc bài</span>
          <input
            type="search"
            className="select-input"
            placeholder="Lọc theo số bài, N5, giáo trình hoặc chữ kanji…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </label>
      </header>

      {isLoading ? (
        <p className="vocab-lesson-picker__status">Đang tải danh sách bài…</p>
      ) : isError ? (
        <p className="vocab-lesson-picker__status">Không tải được bài học. Thử tải lại trang.</p>
      ) : groups.length === 0 ? (
        <p className="vocab-lesson-picker__status">Không có bài khớp bộ lọc.</p>
      ) : (
        groups.map((group) => {
          const kanjiCount = group.items.reduce((sum, l) => sum + (l._count?.entries ?? 0), 0);
          return (
            <section key={group.key} className="vocab-lesson-picker__group">
              <h3 className="vocab-lesson-picker__group-title">
                <span>{group.label}</span>
                <span className="vocab-lesson-picker__group-stats">
                  {group.items.length} bài · {kanjiCount.toLocaleString('vi-VN')} chữ
                </span>
              </h3>
              <div className="vocab-lesson-picker__grid">
                {group.items.map((lesson) => {
                  const preview = (lesson.entries ?? []).map((e) => e.character).join('');
                  const count = lesson._count?.entries;
                  return (
                    <Link
                      key={lesson.id}
                      href={`/kanji?lesson=${lesson.lessonNumber}`}
                      className="vocab-lesson-picker__card glass-panel kanji-lesson-picker__card"
                    >
                      <span className="vocab-lesson-picker__num">
                        {lesson.title?.trim() || `Bài ${lesson.lessonNumber}`}
                      </span>
                      {preview ? (
                        <span className="kanji-lesson-picker__preview japanese-text">{preview}</span>
                      ) : null}
                      <span className="vocab-lesson-picker__meta">
                        {lesson.jlptLevel ? `${lesson.jlptLevel} · ` : ''}
                        {count != null ? `${count} chữ` : 'Học ngay →'}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
