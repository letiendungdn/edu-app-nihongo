'use client';

/**
 * Các biểu đồ của trang /analytics. Tách ra file riêng để trang tải `recharts` (~400 KB chưa nén)
 * bằng next/dynamic: thẻ số liệu và lịch học hiện ngay, biểu đồ tải sau. Xem docs/learn-webpack.md.
 */
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts';

export interface AnalyticsChartsProps {
  last30Study: { date: string; 'Phút học': number }[];
  last30Listening: { date: string; 'Phút nghe': number }[];
  examChartData: { date: string; Điểm: number; level: string }[];
}

export default function AnalyticsCharts({ last30Study, last30Listening, examChartData }: AnalyticsChartsProps) {
  return (
    <>
      {/* Chart thời gian học 30 ngày */}
      {last30Study.length > 0 && (
        <section className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Thời gian học (30 ngày)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={last30Study}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="p" />
              <Tooltip formatter={(v) => [`${v} phút`, 'Học']} />
              <Bar dataKey="Phút học" fill="#60a5fa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* Chart nghe */}
      {last30Listening.length > 0 && (
        <section className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Thời gian nghe (30 ngày)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={last30Listening}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="p" />
              <Tooltip formatter={(v) => [`${v} phút`, 'Nghe']} />
              <Bar dataKey="Phút nghe" fill="#4ade80" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* Lịch sử thi */}
      {examChartData.length > 0 && (
        <section className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Lịch sử thi mock exam</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={examChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(v) => [`${v}%`, 'Điểm']} />
              <Legend />
              <Line type="monotone" dataKey="Điểm" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
          {/* Pass line */}
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Ngưỡng đạt: N5 ≥ 60% · N4–N1 ≥ 65%
          </p>
        </section>
      )}

    </>
  );
}
