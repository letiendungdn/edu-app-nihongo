'use client';

import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';

const SIGNAL_URL =
  process.env.NEXT_PUBLIC_SIGNALING_URL ?? 'http://localhost:3002';

/**
 * Danh sách user đang online (trang Cộng đồng).
 *
 * `socket.io-client` được tải bằng `import()` lúc cần, không import tĩnh: hook này nằm trong
 * `hooks/queries.ts`, file mà AuthContext (bọc toàn app) cũng import. Import tĩnh làm webpack
 * đưa socket.io vào chunk của layout gốc, tức trang nào cũng phải tải nó.
 */
export function usePresence(token: string | null, enabled = true) {
  const [onlineUserIds, setOnlineUserIds] = useState<number[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!enabled || !token) {
      setOnlineUserIds([]);
      return;
    }

    // Component có thể bị gỡ trong lúc thư viện còn đang tải: khi đó không mở socket nữa.
    let cancelled = false;
    let socket: Socket | null = null;
    let ping: ReturnType<typeof setInterval> | undefined;

    void import('socket.io-client').then(({ io }) => {
      if (cancelled) return;
      socket = io(`${SIGNAL_URL}/signal`, {
        auth: { token },
        transports: ['websocket'],
      });
      socketRef.current = socket;

      socket.on('presence-update', ({ userIds }: { userIds: number[] }) => {
        setOnlineUserIds(userIds);
      });

      ping = setInterval(() => {
        if (socket?.connected) socket.emit('presence-ping');
      }, 60_000);
    });

    return () => {
      cancelled = true;
      clearInterval(ping);
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [token, enabled]);

  return onlineUserIds;
}
