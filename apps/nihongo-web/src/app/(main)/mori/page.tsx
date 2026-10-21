'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import MoriCourseView from '@/views/MoriCourseView';

function MoriPageInner() {
  const searchParams = useSearchParams();
  return <MoriCourseView initialLevel={searchParams.get('level') ?? undefined} />;
}

export default function MoriPage() {
  return (
    <Suspense fallback={<div className="page-loading">Đang tải...</div>}>
      <MoriPageInner />
    </Suspense>
  );
}
