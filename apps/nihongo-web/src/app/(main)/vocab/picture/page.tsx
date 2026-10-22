'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PictureDictionaryView from '@/views/PictureDictionaryView';
import VocabLessonPickerView from '@/views/VocabLessonPickerView';

function positiveInt(raw: string | null): number | undefined {
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : undefined;
}

function PicturePageInner() {
  const searchParams = useSearchParams();
  const lesson = positiveInt(searchParams.get('lesson'));

  if (lesson == null) {
    return (
      <VocabLessonPickerView
        hrefFor={(lessonNumber) => `/vocab/picture?lesson=${lessonNumber}`}
        title="Từ điển tranh — Chọn bài học"
        subtitle="Chọn một bài để xem từ kèm hình. Bài 3–15 có nhiều từ vật thể hơn."
      />
    );
  }

  return <PictureDictionaryView />;
}

export default function PictureDictionaryPage() {
  return (
    <Suspense fallback={<div className="page-loading">Đang tải...</div>}>
      <PicturePageInner />
    </Suspense>
  );
}
