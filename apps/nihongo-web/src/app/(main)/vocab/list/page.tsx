'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import VocabLessonListView from '@/views/VocabLessonListView';
import VocabLessonPickerView from '@/views/VocabLessonPickerView';

function positiveInt(raw: string | null): number | undefined {
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : undefined;
}

function VocabListPageInner() {
  const searchParams = useSearchParams();
  const lesson = positiveInt(searchParams.get('lesson'));

  if (lesson == null) {
    return (
      <VocabLessonPickerView
        hrefFor={(lessonNumber) => `/vocab/list?lesson=${lessonNumber}`}
        title="Danh sách từ — Chọn bài học"
        subtitle="Chọn một bài để xem bảng từ. Sau đó có thể học thẻ, xem từ điển tranh hoặc làm trắc nghiệm."
      />
    );
  }

  return <VocabLessonListView initialLessonNumber={lesson} />;
}

export default function VocabListPage() {
  return (
    <Suspense fallback={<div className="page-loading">Đang tải...</div>}>
      <VocabListPageInner />
    </Suspense>
  );
}
