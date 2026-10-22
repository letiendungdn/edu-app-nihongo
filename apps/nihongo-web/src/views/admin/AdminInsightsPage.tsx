'use client';

import { useState } from 'react';
import { useAdminInsightsQuery } from '@/hooks/queries';
import type { AdminAtRiskLearner } from '@/api';
import './AdminPages.css';

const REENGAGE_LABEL: Record<NonNullable<AdminAtRiskLearner['reengagement']>, string> = {
  sent: 'Đã gửi email',
  pending: 'Đang gửi',
  skipped: 'Bỏ qua (tắt nhận email)',
};

function minutes(seconds: number): string {
  return `${Math.round(seconds / 60)} phút`;
}

/** Kết quả pipeline Airflow `learner_insights` (chạy 2:00 sáng mỗi ngày). */
export default function AdminInsightsPage() {
  const [day, setDay] = useState<string | undefined>(undefined);
  const { data, isLoading, isError, refetch } = useAdminInsightsQuery(day);

  return (
    <div className="admin-dashboard admin-dashboard--wide">
      <header className="admin-topbar glass-panel">
        <div>
          <h1>Học viên sắp bỏ học</h1>
          <p>Pipeline Airflow tính mỗi đêm: đang học đều rồi nghỉ 3–14 ngày, kèm số thẻ ôn đang dồn.</p>
        </div>
        <div className="admin-topbar-actions">
          <button type="button" className="btn btn-outline" onClick={() => void refetch()}>
            Làm mới
          </button>
        </div>
      </header>

      {isLoading && <p className="admin-meta">Đang tải…</p>}
      {isError && <p className="admin-error">Không tải được số liệu.</p>}
      {data && !data.ready && (
        <p className="admin-meta">
          Chưa có dữ liệu: chạy Flyway V2 và bật DAG <code>learner_insights</code> trên Airflow.
        </p>
      )}

      {data?.ready && (
        <>
          <section className="glass-panel admin-recent">
            <h2>14 ngày gần nhất</h2>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Học viên hoạt động</th>
                    <th>Đăng ký mới</th>
                    <th>Sắp bỏ học</th>
                    <th>Tổng thời gian học</th>
                    <th>Thẻ đã ôn</th>
                    <th>Bài thi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.kpi.map((k) => (
                    <tr
                      key={k.day}
                      onClick={() => setDay(k.day)}
                      style={{ cursor: 'pointer', fontWeight: k.day === data.day ? 700 : undefined }}
                    >
                      <td>{k.day}</td>
                      <td>{k.activeLearners}</td>
                      <td>{k.newLearners}</td>
                      <td>{k.atRisk}</td>
                      <td>{minutes(k.totalSeconds)}</td>
                      <td>{k.cardsReviewed}</td>
                      <td>{k.examsTaken}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="glass-panel admin-recent">
            <h2>Có nguy cơ ngày {data.day ?? '—'}</h2>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Học viên</th>
                    <th>Điểm rủi ro</th>
                    <th>Lý do</th>
                    <th>Học lần cuối</th>
                    <th>Email kéo lại</th>
                  </tr>
                </thead>
                <tbody>
                  {data.atRisk.length === 0 && (
                    <tr>
                      <td colSpan={5} className="admin-table-empty">
                        Không có học viên nào có nguy cơ.
                      </td>
                    </tr>
                  )}
                  {data.atRisk.map((r) => (
                    <tr key={r.userId}>
                      <td>
                        {r.name ?? '—'}
                        <div className="admin-meta">{r.email}</div>
                      </td>
                      <td>
                        <strong>{r.riskScore}</strong>/100
                      </td>
                      <td>{r.reasons.join(' · ')}</td>
                      <td>{r.lastActiveDay}</td>
                      <td>{r.reengagement ? REENGAGE_LABEL[r.reengagement] : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
