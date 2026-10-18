'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import VocabView from '@/views/VocabView';
import VocabLessonPickerView from '@/views/VocabLessonPickerView';

function positiveInt(raw: string | null): number | undefined {
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : undefined;
}

function VocabPageInner() {
  const searchParams = useSearchParams();
  const lesson = positiveInt(searchParams.get('lesson'));
  const word = positiveInt(searchParams.get('word'));

  // Chưa chọn bài → trang lưới bài học. Có ?lesson= hoặc ?word= → flashcard.
  if (lesson == null && word == null) {
    return <VocabLessonPickerView />;
  }

  return <VocabView initialLessonNumber={lesson} initialVocabId={word} />;
}

export default function VocabPage() {
  return (
    <Suspense fallback={<div className="page-loading">Đang tải...</div>}>
      <VocabPageInner />
    </Suspense>
  );
}
