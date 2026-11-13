import { Suspense } from 'react';
import PersonalWordsView from '@/views/PersonalWordsView';

export default function PersonalWordsPage() {
  // useSearchParams() cần nằm trong Suspense (Next.js)
  return (
    <Suspense fallback={null}>
      <PersonalWordsView />
    </Suspense>
  );
}
