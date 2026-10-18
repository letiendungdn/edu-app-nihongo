'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/api-client';

type Broadcast = {
  id: string;
  type: string;
  templateName?: string;
  subject: string;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  status: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
};

const STATUS_COLOR: Record<string, string> = {
  pending:   '#9ca3af',
  running:   '#f59e0b',
  completed: '#4ade80',
  failed:    '#f87171',
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

export default function EmailBroadcastsView() {
  const { token } = useAuth();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(''); // bản cũ không xóa: tải lại thành công vẫn hiện lỗi cũ
    try {
      const data = await apiRequest<{ items: Broadcast[]; total: number }>('/admin/email/broadcasts', { token });
      setBroadcasts(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      // String(e) ra "ApiError: …" — chỉ hiện thông điệp
      setError(e instanceof Error ? e.message : 'Không tải được danh sách');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>Lịch sử Email</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
            Broadcast và compose đã gửi{total > 0 ? ` · ${total} bản ghi` : ''}
          </p>
        </div>
        <button onClick={load} style={{
          padding: '7px 14px', borderRadius: 6, border: '1px solid var(--border-color)',
          background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13,
        }}>
          ↻ Làm mới
        </button>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(248,113,113,0.1)', color: '#f87171', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Đang tải...</p>
      ) : broadcasts.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <p style={{ margin: 0, fontSize: 14 }}>Chưa có lịch sử gửi email nào.</p>
        </div>
      ) : (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  {['Chủ đề', 'Loại', 'Trạng thái', 'Tiến độ', 'Thời gian', ''].map((h) => (
                    <th key={h} style={{
                      padding: '10px 14px', textAlign: 'left',
                      fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                      textTransform: 'uppercase', color: 'var(--text-secondary)',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {broadcasts.map((b) => {
                  const pct = b.totalCount > 0 ? Math.round(((b.sentCount + b.failedCount) / b.totalCount) * 100) : 0;
                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 14px', color: 'var(--text-primary)', maxWidth: 280 }}>
                        <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {b.subject}
                        </div>
                        {b.templateName && (
                          <code style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{b.templateName}</code>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 20,
                          background: b.type === 'template' ? 'rgba(99,102,241,0.12)' : 'rgba(245,158,11,0.12)',
                          color: b.type === 'template' ? 'var(--primary-color)' : '#f59e0b',
                          fontWeight: 600,
                        }}>
                          {b.type === 'template' ? 'Template' : 'Compose'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          fontSize: 12, fontWeight: 600, color: STATUS_COLOR[b.status] ?? '#9ca3af',
                        }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_COLOR[b.status] ?? '#9ca3af', display: 'inline-block' }} />
                          {b.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', minWidth: 160 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                          {b.sentCount} gửi · {b.failedCount} lỗi / {b.totalCount} tổng
                        </div>
                        <div style={{ height: 5, background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 3,
                            background: b.failedCount > 0 && b.sentCount === 0 ? '#f87171' : '#4ade80',
                            width: `${pct}%`, transition: 'width 0.3s',
                          }} />
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        <div>{fmt(b.createdAt)}</div>
                        {b.completedAt && (
                          <div style={{ color: '#4ade80' }}>✓ {fmt(b.completedAt)}</div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <code style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{b.id.slice(0, 8)}</code>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
