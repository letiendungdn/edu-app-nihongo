'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import VocabView from '@/views/VocabView';

function positiveInt(raw: string | null): number | undefined {
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : undefined;
}

function VocabPageInner() {
  const searchParams = useSearchParams();
  return (
    <VocabView
      initialLessonNumber={positiveInt(searchParams.get('lesson'))}
      initialVocabId={positiveInt(searchParams.get('word'))}
    />
  );
}

export default function VocabPage() {
  return (
    <Suspense fallback={<div className="page-loading">Đang tải...</div>}>
      <VocabPageInner />
    </Suspense>
  );
}
