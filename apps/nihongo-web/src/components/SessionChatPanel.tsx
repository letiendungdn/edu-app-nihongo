'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchSessionMessages, sendSessionMessage, getPresignedUploadUrl } from '@/api';
import { getStoredToken } from '@/lib/api-client';
import type { SessionChatMessage } from '@/types/chat';
import { queryKeys } from '@/api/query-keys';
import { appendMessage } from '@/hooks/useChatSSE';
import './SupportChat.css';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function MessageBubble({ msg, isMine }: { msg: SessionChatMessage; isMine: boolean }) {
  return (
    <div className={`support-chat-bubble${isMine ? ' support-chat-bubble--mine' : ''}`}>
      <div className="support-chat-bubble-meta">
        <strong>{msg.sender.name ?? msg.sender.email}</strong>
        <span>{formatTime(msg.createdAt)}</span>
      </div>
      {msg.content && <p>{msg.content}</p>}
      {msg.fileUrl && (
        <div style={{ marginTop: 4 }}>
          {msg.fileType?.startsWith('image/') ? (
            <img src={msg.fileUrl} alt="attachment" style={{ maxWidth: 200, maxHeight: 200, borderRadius: 6, display: 'block' }} />
          ) : (
            <a href={msg.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--primary-color)' }}>
              📎 File đính kèm
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function SessionChatPanel({
  sessionId,
  currentUserId,
}: {
  sessionId: number;
  currentUserId: number;
}) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(false);
  const [lastSeenId, setLastSeenId] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const token = getStoredToken();
  const queryClient = useQueryClient();
  const key = queryKeys.sessionMessages(sessionId);

  // Bản cũ tải tin MỘT lần khi mở trang: tin của người kia không bao giờ hiện cho tới khi tải lại,
  // và đổi buổi nhanh thì tin buổi cũ có thể ghi đè. Backend chưa có stream cho chat buổi học nên
  // hỏi lại định kỳ: dày khi khung chat đang mở, thưa khi đóng (vẫn cần để đếm tin chưa đọc).
  const { data } = useQuery({
    queryKey: key,
    queryFn: () => fetchSessionMessages('', sessionId),
    enabled: !!token,
    refetchInterval: open ? 4000 : 15000,
  });
  const messages = useMemo(() => data ?? [], [data]);

  // Lịch sử có sẵn lúc vào trang không tính là "chưa đọc"
  const baselineSet = useRef(false);
  useEffect(() => {
    if (baselineSet.current || !data) return;
    baselineSet.current = true;
    setLastSeenId(data.reduce((max, m) => Math.max(max, m.id), 0));
  }, [data]);

  // Tin chưa đọc = tin của người kia mới hơn lần cuối mở khung chat (bản cũ luôn là 0)
  const unread = open ? 0 : messages.filter((m) => m.id > lastSeenId && m.sender.id !== currentUserId).length;

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    const newest = messages.reduce((max, m) => Math.max(max, m.id), 0);
    setLastSeenId((prev) => Math.max(prev, newest));
  }, [messages, open]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setUploading(true);
    try {
      const { url, publicUrl } = await getPresignedUploadUrl(token, file.type, 'session');
      await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      await handleSend('', publicUrl, file.type);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSend(text: string, fileUrl?: string, fileType?: string) {
    if ((!text && !fileUrl) || sending || !token) return;
    setSending(true);
    try {
      const msg = await sendSessionMessage(token, sessionId, text, fileUrl, fileType);
      queryClient.setQueryData<SessionChatMessage[]>(key, (prev) =>
        appendMessage({ messages: prev ?? [] }, msg)?.messages ?? prev,
      );
    } finally {
      setSending(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    await handleSend(text);
  }

  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 50,
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
    }}>
      {open && (
        <div style={{
          width: 320, height: 420, marginBottom: 8,
          display: 'flex', flexDirection: 'column',
          background: 'var(--surface-color)', border: '1px solid var(--border-color)',
          borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', overflow: 'hidden',
        }}>
          <header style={{
            padding: '10px 14px', borderBottom: '1px solid var(--border-color)',
            fontWeight: 700, fontSize: 13, color: 'var(--text-primary)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span>💬 Chat phiên học</span>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 16 }}>✕</button>
          </header>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
            {messages.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13, marginTop: 40 }}>
                Chưa có tin nhắn
              </p>
            )}
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} isMine={msg.senderId === currentUserId} />
            ))}
            <div ref={bottomRef} />
          </div>

          <form
            style={{ display: 'flex', gap: 6, padding: '8px 10px', borderTop: '1px solid var(--border-color)' }}
            onSubmit={(e) => void handleSubmit(e)}
          >
            <input
              type="text"
              placeholder="Nhắn tin..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={sending || uploading}
              style={{
                flex: 1, padding: '6px 10px', borderRadius: 6,
                border: '1px solid var(--border-color)', background: 'var(--bg-color)',
                color: 'var(--text-primary)', fontSize: 13,
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => void handleFileChange(e)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || sending}
              style={{ padding: '0 8px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'none', cursor: 'pointer', fontSize: 14 }}
            >
              {uploading ? '…' : '📎'}
            </button>
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              style={{ padding: '6px 12px', borderRadius: 6, background: 'var(--primary-color)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}
            >
              Gửi
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: 52, height: 52, borderRadius: '50%', border: 'none',
          background: 'var(--primary-color)', color: '#fff', fontSize: 22,
          cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          position: 'relative',
        }}
      >
        💬
        {!open && unread > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2, width: 18, height: 18,
            borderRadius: '50%', background: '#ef4444', fontSize: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800,
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    </div>
  );
}
