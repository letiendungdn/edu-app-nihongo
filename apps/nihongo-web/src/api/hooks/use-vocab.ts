import { useQuery } from '@tanstack/react-query';
import { fetchVocabularies } from '../index';
import { queryKeys } from '../query-keys';
import { STALE_5M } from './constants';
import { apiRequest } from '../../lib/api-client';
import type { VocabAnalysisToken } from '../../types/api';

export function useVocab(lessonNumber: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.vocab.byLesson(lessonNumber),
    queryFn: () => fetchVocabularies(lessonNumber),
    enabled: enabled && lessonNumber > 0,
    staleTime: STALE_5M,
  });
}

export function useVocabAnalysisMeta() {
  return useQuery({
    queryKey: queryKeys.vocab.analysisMeta,
    queryFn: () =>
      apiRequest<VocabAnalysisToken[]>('/vocabularies/analysis-meta'),
    staleTime: STALE_5M,
  });
}
