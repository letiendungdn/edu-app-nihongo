import { useQuery } from '@tanstack/react-query';
import { fetchGrammars, searchGrammars } from '../index';
import { queryKeys } from '../query-keys';
import { STALE_5M } from './constants';

export function useGrammar(lessonNumber: number) {
  return useQuery({
    queryKey: queryKeys.grammar.byLesson(lessonNumber),
    queryFn: () => fetchGrammars(lessonNumber),
    enabled: lessonNumber > 0,
    staleTime: STALE_5M,
  });
}

export function useGrammarSearch(query: string) {
  return useQuery({
    queryKey: queryKeys.grammar.search(query),
    queryFn: () => searchGrammars(query),
    enabled: query.trim().length > 0,
    staleTime: STALE_5M,
  });
}
