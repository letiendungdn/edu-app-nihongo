'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import VocabLessonListView from '@/views/VocabLessonListView';

function positiveInt(raw: string | null): number | undefined {
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : undefined;
}

function VocabListPageInner() {
  const searchParams = useSearchParams();
  return <VocabLessonListView initialLessonNumber={positiveInt(searchParams.get('lesson'))} />;
}

export default function VocabListPage() {
  return (
    <Suspense fallback={<div className="page-loading">Đang tải...</div>}>
      <VocabListPageInner />
    </Suspense>
  );
}
