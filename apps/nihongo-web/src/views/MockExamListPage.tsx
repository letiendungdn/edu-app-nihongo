'use client';

import Link from 'next/link';
import { useExamTemplates } from '../hooks/queries';
import './MockExam.css';

export default function MockExamListPage() {
  const { data, isLoading, isError } = useExamTemplates();
  const templates = data ?? [];

  return (
    <div className="container mock-exam-page">
      <header className="mock-exam-header">
        <div className="mock-exam-header-row">
          <div>
            <h2 className="view-title">Thi thử JLPT</h2>
            <p className="mock-exam-subtitle">
              Làm bài theo format thi thật — có giới hạn thời gian, nộp bài một lần, sau đó xem đáp án chi tiết.
            </p>
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="empty-state glass-panel">
          <p>Đang tải đề thi...</p>
        </div>
      ) : isError ? (
        <div className="empty-state glass-panel">
          <p>Không tải được danh sách đề thi. Hãy kiểm tra backend.</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="empty-state glass-panel">
          <p>Chưa có đề thi nào.</p>
        </div>
      ) : (
        <div className="mock-exam-grid">
          {templates.map((tpl) => {
            const slug = tpl.slug ?? tpl.level;

            return (
              <article key={slug} className="mock-exam-card glass-panel">
                <span className={`mock-exam-level-badge level-${tpl.level}`}>{tpl.level.toUpperCase()}</span>
                <h3>{tpl.title}</h3>
                <p>{tpl.description}</p>
                <ul className="mock-exam-meta">
                  <li>⏱ {tpl.durationMinutes} phút</li>
                  <li>📝 {tpl.totalQuestions} câu</li>
                  <li>📖 {tpl.scope ?? `Minna Bài ${tpl.lessonRange}`}</li>
                </ul>

                <div className="mock-exam-card-actions">
                  <Link href={`/mock-exam/${slug}`} className="btn btn-primary mock-exam-start-btn">
                    Bắt đầu thi
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <section className="mock-exam-notes glass-panel">
        <h3>Lưu ý khi thi</h3>
        <ul>
          <li>Không hiện đáp án trong lúc làm bài — giống kỳ thi thật.</li>
          <li>
            Phần <strong>Nghe</strong>: phát file audio nếu có, không thì dùng TTS; nghe lại tối đa 2 lần/câu.
          </li>
          <li>Có thể chuyển qua lại giữa các câu trước khi nộp bài.</li>
          <li>Hết giờ hệ thống tự nộp bài với các câu đã chọn.</li>
          <li>
            Sau khi nộp, vào trang <strong>Đáp án &amp; giải thích</strong> để ôn lại.
          </li>
        </ul>
      </section>
    </div>
  );
}
