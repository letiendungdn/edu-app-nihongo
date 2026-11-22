'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ParticlesView from '@/views/ParticlesView';

function ParticlesPageInner() {
  const searchParams = useSearchParams();
  const raw = searchParams.get('lesson');
  const lesson = raw ? Number(raw) : NaN;
  const initialLesson = Number.isFinite(lesson) && lesson > 0 ? Math.floor(lesson) : undefined;
  return <ParticlesView initialLesson={initialLesson} />;
}

export default function ParticlesPage() {
  return (
    <Suspense fallback={<div className="page-loading">Đang tải...</div>}>
      <ParticlesPageInner />
    </Suspense>
  );
}
