'use client';

import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { fetchAnalytics } from '@/api';
import { useAuth } from '@/hooks/useAuth';

// recharts chỉ cần cho biểu đồ: tách thành chunk riêng, tải sau khi trang đã hiện số liệu.
// ssr: false vì biểu đồ đo kích thước khung bằng DOM (ResponsiveContainer), không vẽ được trên server.
const AnalyticsCharts = dynamic(() => import('@/components/AnalyticsCharts'), {
  ssr: false,
  loading: () => (
    <div className="card" style={{ marginBottom: '1.5rem', minHeight: 200, color: 'var(--text-secondary)' }}>
      Đang tải biểu đồ…
    </div>
  ),
});

function fmtSeconds(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}g ${m}p` : `${m} phút`;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

// GitHub-style heatmap (52 tuần × 7 ngày)
function Heatmap({ data }: { data: { date: string; seconds: number }[] }) {
  const map = new Map(data.map((d) => [d.date.slice(0, 10), d.seconds]));
  const today = new Date();
  const cells: { date: string; seconds: number }[] = [];
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    cells.push({ date: key, seconds: map.get(key) ?? 0 });
  }

  function color(s: number) {
    if (s === 0) return 'var(--border-color)';
    if (s < 300) return 'var(--heatmap-1, #166534)';
    if (s < 900) return 'var(--heatmap-2, #16a34a)';
    if (s < 1800) return 'var(--heatmap-3, #4ade80)';
    return 'var(--heatmap-4, #86efac)';
  }

  const weeks: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', gap: 3, minWidth: 600 }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {week.map((cell) => (
              <div
                key={cell.date}
                title={`${cell.date}: ${fmtSeconds(cell.seconds)}`}
                style={{ width: 12, height: 12, borderRadius: 2, background: color(cell.seconds), cursor: 'default' }}
              />
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 8, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
        Ít
        {[0, 300, 900, 1800, 3600].map((s) => (
          <div key={s} style={{ width: 12, height: 12, borderRadius: 2, background: color(s) }} />
        ))}
        Nhiều
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '1.25rem 1rem' }}>
      <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{sub}</div>}
    </div>
  );
}

export default function AnalyticsPage() {
  const { token } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => fetchAnalytics(token!),
    enabled: !!token,
  });

  if (!token) {
    return (
      <div className="container" style={{ padding: '3rem', textAlign: 'center' }}>
        <span style={{ fontSize: '2.5rem' }}>📊</span>
        <h2 style={{ marginTop: '0.75rem' }}>Tiến độ học</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
          Đăng nhập để xem biểu đồ thời gian học, lịch sử thi và thống kê SRS.
        </p>
        <a href="/login?redirect=/analytics" className="btn btn-primary">Đăng nhập</a>
      </div>
    );
  }

  if (isLoading) return <div className="container" style={{ padding: '2rem' }}>Đang tải...</div>;
  if (error || !data) return <div className="container" style={{ padding: '2rem' }}>Không thể tải dữ liệu.</div>;

  const { overview, studySessions, examHistory, listeningHistory } = data;

  // Chuẩn bị data cho charts — last 30 days
  const last30Study = studySessions.slice(-30).map((s) => ({
    date: fmtDate(s.date as unknown as string),
    'Phút học': Math.round(s.seconds / 60),
  }));

  const last30Listening = listeningHistory.slice(-30).map((s) => ({
    date: fmtDate(s.date as unknown as string),
    'Phút nghe': Math.round(s.seconds / 60),
  }));

  const examChartData = examHistory.map((e) => ({
    date: fmtDate(e.submittedAt),
    Điểm: Math.round(e.percent),
    level: e.level.toUpperCase(),
  }));

  return (
    <div className="container" style={{ padding: '1.5rem 1rem' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>Tiến độ học</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.75rem' }}>Thống kê toàn bộ quá trình học</p>

      {/* Overview cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
        <StatCard label="Tổng thời gian học" value={fmtSeconds(overview.totalStudySeconds)} />
        <StatCard label="Tổng thời gian nghe" value={fmtSeconds(overview.totalListeningSeconds)} />
        <StatCard label="Từ đã thuộc" value={String(overview.masteredVocab)} />
        <StatCard label="Bài thi đã làm" value={String(overview.totalExams)} sub={`${overview.passedExams} lần đạt`} />
      </div>

      {/* Heatmap thời gian học */}
      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Lịch học (365 ngày qua)</h2>
        <Heatmap data={studySessions.map((s) => ({ date: s.date as unknown as string, seconds: s.seconds }))} />
      </section>

      <AnalyticsCharts
        last30Study={last30Study}
        last30Listening={last30Listening}
        examChartData={examChartData}
      />

      {examChartData.length === 0 && last30Study.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
          Chưa có dữ liệu. Học và luyện tập để xem thống kê ở đây!
        </div>
      )}
    </div>
  );
}
