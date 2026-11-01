'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import KanjiView from '@/views/KanjiView';
import KanjiLessonPickerView from '@/views/KanjiLessonPickerView';

function KanjiPageInner() {
  const searchParams = useSearchParams();
  const raw = searchParams.get('lesson');
  const lesson = raw ? Number(raw) : NaN;
  const initialLessonNumber = Number.isFinite(lesson) && lesson > 0 ? Math.floor(lesson) : undefined;

  // Chưa chọn bài → bảng chọn bài. Có ?lesson= → màn học.
  if (initialLessonNumber == null) return <KanjiLessonPickerView />;

  return <KanjiView initialLessonNumber={initialLessonNumber} />;
}

export default function KanjiPage() {
  return (
    <Suspense fallback={<div className="page-loading">Đang tải...</div>}>
      <KanjiPageInner />
    </Suspense>
  );
}
