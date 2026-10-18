'use client';

import { useEffect } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import type { SupportMessage, GroupChatMessage } from '@/types/chat';
import { getStoredToken } from '@/lib/api-client';
import { openAuthedStream } from '@/lib/sse';
import { queryKeys } from './queries';

/** Thêm tin vào cache (bỏ trùng theo id: cùng một tin có thể tới từ cả REST lẫn SSE). */
export function appendMessage<M extends { id: number }, D extends { messages: M[] }>(
  prev: D | undefined,
  msg: M,
): D | undefined {
  if (!prev || prev.messages.some((m) => m.id === msg.id)) return prev;
  return { ...prev, messages: [...prev.messages, msg] };
}

/**
 * Nghe stream và ghi tin mới vào ĐÚNG khóa cache mà màn hình đang đọc.
 * Bản cũ: (1) dùng EventSource nên không gửi được token → luôn 401; (2) ghi vào khóa gõ tay
 * `['support-thread']`, `['community-room', id]` trong khi query thật là `['support','thread']`,
 * `['community','room',id]` → tin có tới cũng không hiện; (3) lỗi là đóng hẳn, không nối lại.
 */
function useChatStream<M extends { id: number }>(path: string | null, key: QueryKey) {
  const queryClient = useQueryClient();
  const keyString = JSON.stringify(key);

  useEffect(() => {
    if (!path || !getStoredToken()) return undefined;
    const cacheKey = JSON.parse(keyString) as QueryKey;
    return openAuthedStream<M>(path, {
      onMessage: (msg) =>
        queryClient.setQueryData<{ messages: M[] }>(cacheKey, (prev) => appendMessage(prev, msg)),
      // Vừa nối lại: tải lại để lấp tin gửi trong lúc mất kết nối
      onOpen: () => void queryClient.invalidateQueries({ queryKey: cacheKey }),
    });
  }, [path, keyString, queryClient]);
}

export function useSupportSSE(threadId: number | null, enabled = true) {
  useChatStream<SupportMessage>(enabled && threadId ? '/support/stream' : null, queryKeys.supportThread);
}

export function useCommunityRoomSSE(roomId: number | null, enabled = true) {
  useChatStream<GroupChatMessage>(
    enabled && roomId ? `/community/rooms/${roomId}/stream` : null,
    queryKeys.communityRoom(roomId ?? 0),
  );
}
