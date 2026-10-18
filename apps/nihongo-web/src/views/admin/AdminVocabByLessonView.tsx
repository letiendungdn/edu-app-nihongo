'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLessons, useVocab } from '../../hooks/queries';
import type { Lesson } from '../../types/api';
import VocabWordList from '../../components/VocabWordList';
import { AdminLessonPicker, type AdminLessonListItem } from '../../components/admin/AdminLessonPicker';
import './AdminPages.css';

function lessonLabel(lesson: Lesson): string {
  const title = lesson.title?.trim() || `Bài ${lesson.lessonNumber}`;
  const jlpt = lesson.jlptLevel ? ` · ${lesson.jlptLevel}` : '';
  const count = lesson._count?.vocabularies;
  const countLabel = count != null ? ` (${count})` : '';
  return `#${lesson.lessonNumber} ${title}${jlpt}${countLabel}`;
}

export default function AdminVocabByLessonView({
  initialLessonNumber,
}: {
  initialLessonNumber?: number;
} = {}) {
  const { data: lessons = [], isLoading: lessonsLoading } = useLessons();
  const [selectedLessonNumber, setSelectedLessonNumber] = useState<number | null>(
    initialLessonNumber ?? null,
  );
  const [selectedWordIndex, setSelectedWordIndex] = useState(0);

  useEffect(() => {
    if (initialLessonNumber != null && initialLessonNumber > 0) {
      setSelectedLessonNumber(initialLessonNumber);
    }
  }, [initialLessonNumber]);

  const activeLessonNumber = selectedLessonNumber ?? lessons[0]?.lessonNumber ?? null;
  const activeLesson = lessons.find((l) => l.lessonNumber === activeLessonNumber) ?? null;

  const { data: vocabularies = [], isLoading: vocabLoading } = useVocab(
    activeLessonNumber ?? 0,
    activeLessonNumber != null,
  );

  const pickerLessons: AdminLessonListItem[] = useMemo(
    () =>
      lessons.map((l) => ({
        id: l.id,
        lessonNumber: l.lessonNumber,
        title: l.title,
        jlptLevel: l.jlptLevel,
        count: l._count?.vocabularies ?? null,
      })),
    [lessons],
  );

  return (
    <AdminLessonPicker
      lessons={pickerLessons}
      loading={lessonsLoading}
      activeLessonNumber={activeLessonNumber}
      onSelectLesson={(n) => {
        setSelectedLessonNumber(n);
        setSelectedWordIndex(0);
      }}
      emptySelectHint="Chọn một bài bên trái để xem / sửa danh sách từ vựng."
    >
      {activeLesson && (
        <>
          <div className="glass-panel admin-vocab-by-lesson__words-head">
            <div>
              <h2>{lessonLabel(activeLesson)}</h2>
              <p>Danh sách từ trong bài — bật «Sửa» trên panel để thêm / sửa / xoá / kéo thả.</p>
            </div>
          </div>
          {vocabLoading ? (
            <div className="glass-panel admin-vocab-by-lesson__empty-panel">Đang tải từ vựng…</div>
          ) : (
            <VocabWordList
              lessonNumber={activeLesson.lessonNumber}
              lessonId={activeLesson.id}
              vocabularies={vocabularies}
              currentIndex={selectedWordIndex}
              expectedCount={activeLesson._count?.vocabularies ?? null}
              onSelectWord={setSelectedWordIndex}
              startInEditMode
            />
          )}
        </>
      )}
    </AdminLessonPicker>
  );
}
