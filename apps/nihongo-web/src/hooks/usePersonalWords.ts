'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPersonalWord,
  deletePersonalWord,
  fetchPersonalWords,
  type NewPersonalWord,
  type PersonalWordPage,
} from '../api';
import { queryKeys } from '../api/query-keys';

/** Sổ từ cá nhân. `enabled=false` khi chưa đăng nhập: không gọi API để nhận 401. */
export function usePersonalWords(lesson: number | undefined, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.personalWords.list(lesson),
    queryFn: () => fetchPersonalWords(lesson),
    enabled,
  });
}

export function useCreatePersonalWord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: NewPersonalWord) => createPersonalWord(data),
    // Thêm xong: đánh dấu MỌI danh sách (mọi bài) là cũ để tải lại.
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.personalWords.all }),
  });
}

/** Xóa "lạc quan": dòng biến mất ngay, server lỗi thì trả lại. */
export function useDeletePersonalWord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deletePersonalWord(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.personalWords.all }); // lần tải đang chạy không ghi đè
      const previous = qc.getQueriesData<PersonalWordPage>({ queryKey: queryKeys.personalWords.all });
      qc.setQueriesData<PersonalWordPage>({ queryKey: queryKeys.personalWords.all }, (old) =>
        old ? { ...old, data: old.data.filter((w) => w.id !== id), total: old.total - 1 } : old,
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      ctx?.previous.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.personalWords.all }),
  });
}
