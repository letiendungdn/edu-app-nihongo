'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import GrammarView from '@/views/GrammarView';
import VocabLessonPickerView from '@/views/VocabLessonPickerView';

function GrammarPageInner() {
  const searchParams = useSearchParams();
  const raw = searchParams.get('lesson');
  const lesson = raw ? Number(raw) : NaN;
  const initialLessonNumber = Number.isFinite(lesson) && lesson > 0 ? Math.floor(lesson) : undefined;

  if (initialLessonNumber == null) {
    return (
      <VocabLessonPickerView
        has="grammar"
        hrefFor={(lessonNumber) => `/grammar?lesson=${lessonNumber}`}
        title="Ngữ pháp — Chọn bài học"
        subtitle="Chọn bài để học mẫu câu, cách dùng và ví dụ. Trong bài có thể đổi bài hoặc quay lại đây."
        countOf={(item) => item._count?.grammars}
        countUnit="mẫu"
        links={
          <>
            <Link href="/grammar-srs" className="btn btn-outline btn-sm">
              Ôn mẫu đã ghim
            </Link>
            <Link href="/grammar/mindmap" className="btn btn-outline btn-sm">
              Sơ đồ tư duy
            </Link>
          </>
        }
      />
    );
  }

  return <GrammarView initialLessonNumber={initialLessonNumber} />;
}

export default function GrammarPage() {
  return (
    <Suspense fallback={<div className="page-loading">Đang tải...</div>}>
      <GrammarPageInner />
    </Suspense>
  );
}
