import { api } from './api';

/** Sổ từ cá nhân (`/api/personal-words`). Interceptor của `api` đã gắn token và mở lớp `{ success, data }`. */
export interface PersonalWord {
  id: number;
  kana: string;
  meaning: string;
  lesson: number;
}

export interface PersonalWordPage {
  data: PersonalWord[];
  total: number;
}

export async function fetchPersonalWords(lesson?: number): Promise<PersonalWordPage> {
  const res = await api.get<PersonalWordPage>('/personal-words', { params: { lesson, limit: 200 } });
  return res.data;
}

export async function createPersonalWord(word: Omit<PersonalWord, 'id'>): Promise<PersonalWord> {
  const res = await api.post<PersonalWord>('/personal-words', word);
  return res.data;
}

export async function deletePersonalWord(id: number): Promise<void> {
  await api.delete(`/personal-words/${id}`);
}
