'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLessons } from '../../hooks/queries';
import GrammarView from '../GrammarView';
import { AdminLessonPicker } from '../../components/admin/AdminLessonPicker';

export default function AdminGrammarByLessonView({
  initialLessonNumber,
}: {
  initialLessonNumber?: number;
} = {}) {
  const { data: lessons = [], isLoading } = useLessons();
  const [selectedLessonNumber, setSelectedLessonNumber] = useState<number | null>(
    initialLessonNumber ?? null,
  );

  useEffect(() => {
    if (initialLessonNumber != null && initialLessonNumber > 0) {
      setSelectedLessonNumber(initialLessonNumber);
    }
  }, [initialLessonNumber]);

  const lessonItems = useMemo(
    () =>
      lessons.map((l) => ({
        id: l.id,
        lessonNumber: l.lessonNumber,
        title: l.title,
        jlptLevel: l.jlptLevel,
        count: l._count?.grammars ?? null,
      })),
    [lessons],
  );

  const activeLessonNumber =
    selectedLessonNumber ?? lessonItems[0]?.lessonNumber ?? null;
  const activeLesson = lessons.find((l) => l.lessonNumber === activeLessonNumber);

  return (
    <AdminLessonPicker
      title="Bài học"
      lessons={lessonItems}
      loading={isLoading}
      activeLessonNumber={activeLessonNumber}
      onSelectLesson={setSelectedLessonNumber}
      emptySelectHint="Chọn một bài bên trái để xem / sửa danh sách ngữ pháp."
    >
      {activeLessonNumber != null && (
        <>
          <div className="glass-panel admin-vocab-by-lesson__words-head">
            <div>
              <h2>
                #{activeLessonNumber}{' '}
                {activeLesson?.title?.trim() || `Bài ${activeLessonNumber}`}
                {activeLesson?.jlptLevel ? ` · ${activeLesson.jlptLevel}` : ''}
                {activeLesson?._count?.grammars != null
                  ? ` (${activeLesson._count.grammars})`
                  : ''}
              </h2>
              <p>Danh sách mẫu ngữ pháp trong bài — bật «Sửa» để thêm / sửa / xoá.</p>
            </div>
          </div>
          <GrammarView
            key={activeLessonNumber}
            initialLessonNumber={activeLessonNumber}
            hideLessonSelector
            startInEditMode
          />
        </>
      )}
    </AdminLessonPicker>
  );
}
