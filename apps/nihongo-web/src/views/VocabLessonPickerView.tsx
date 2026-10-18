'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useLessons } from '../hooks/queries';
import { groupLessons } from '../utils/lessonGroups';
import './VocabLessonPickerView.css';

export default function VocabLessonPickerView() {
  const { data: lessons = [], isLoading, isError } = useLessons({ has: 'vocab' });
  const [filter, setFilter] = useState('');

  const groups = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const filtered = q
      ? lessons.filter((l) => {
          const hay = [String(l.lessonNumber), l.title, l.jlptLevel, l.textbook]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return hay.includes(q);
        })
      : lessons;
    return groupLessons(filtered);
  }, [lessons, filter]);

  return (
    <div className="container vocab-lesson-picker">
      <header className="vocab-lesson-picker__header">
        <h2 className="view-title">Từ vựng — Chọn bài học</h2>
        <p className="vocab-lesson-picker__subtitle">
          Chọn bài để học flashcard. Sau đó có thể đổi bài, xem danh sách từ hoặc làm trắc nghiệm.
        </p>
        <nav className="vocab-lesson-picker__links" aria-label="Công cụ từ vựng">
          <Link href="/vocab/quiz" className="btn btn-outline btn-sm">
            Trắc nghiệm JP ↔ VI
          </Link>
          <Link href="/vocab/picture" className="btn btn-outline btn-sm">
            Từ điển tranh
          </Link>
          <Link href="/vocab/mindmap" className="btn btn-outline btn-sm">
            Sơ đồ tư duy
          </Link>
        </nav>
        <label className="vocab-lesson-picker__filter">
          <span className="sr-only">Lọc bài</span>
          <input
            type="search"
            className="select-input"
            placeholder="Lọc theo số bài, tên, N5…"
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
          const lessonCount = group.items.length;
          const wordCount = group.items.reduce(
            (sum, l) => sum + (l._count?.vocabularies ?? 0),
            0,
          );
          return (
            <section key={group.key} className="vocab-lesson-picker__group">
              <h3 className="vocab-lesson-picker__group-title">
                <span>{group.label}</span>
                <span className="vocab-lesson-picker__group-stats">
                  {lessonCount} bài · {wordCount.toLocaleString('vi-VN')} từ
                </span>
              </h3>
              <div className="vocab-lesson-picker__grid">
                {group.items.map((lesson) => {
                  const count = lesson._count?.vocabularies;
                  return (
                    <Link
                      key={lesson.id}
                      href={`/vocab?lesson=${lesson.lessonNumber}`}
                      className="vocab-lesson-picker__card glass-panel"
                    >
                      <span className="vocab-lesson-picker__num">Bài {lesson.lessonNumber}</span>
                      <span className="vocab-lesson-picker__name">
                        {lesson.title?.trim() || `第${lesson.lessonNumber}課`}
                      </span>
                      <span className="vocab-lesson-picker__meta">
                        {lesson.jlptLevel ? `${lesson.jlptLevel} · ` : ''}
                        {count != null ? `${count} từ` : 'Học ngay →'}
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
