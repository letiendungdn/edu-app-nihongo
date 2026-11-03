'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/api-client';
import './ExamPredictionView.css';

type Level = 'n5' | 'n4' | 'n3' | 'n2' | 'n1';
const LEVELS: Level[] = ['n5', 'n4', 'n3', 'n2', 'n1'];
const LEVEL_KEY = 'nihongo-prediction-level';

interface SectionPrediction {
  id: string;
  name: string;
  nameJa: string;
  max: number;
  minPass: number;
  questions: number;
  practiceQuestions: number;
  practiceSources: string[];
  accuracy: number | null;
  estimate: number;
  low: number;
  high: number;
  belowMinRisk: number;
}

interface ScorePrediction {
  level: Level;
  attempts: number;
  passMark: number;
  maxTotal: number;
  total: { estimate: number; low: number; high: number };
  passProbability: number;
  confidence: 'none' | 'low' | 'medium' | 'high';
  sections: SectionPrediction[];
  missingSections: string[];
  advice: string[];
}

interface LikelyItem {
  text: string;
  reading: string | null;
  meaning: string;
  lessonNumber: number | null;
  score: number;
  tier: 'Rất hay ra' | 'Hay ra' | 'Có thể ra';
  reasons: string[];
  alt?: string[];
}

interface LikelyContent {
  vocab: LikelyItem[];
  kanji: LikelyItem[];
  grammar: LikelyItem[];
  method: string[];
  attribution: string;
}

const CONFIDENCE_LABEL: Record<ScorePrediction['confidence'], string> = {
  none: 'Chưa có dữ liệu',
  low: 'Độ tin cậy thấp',
  medium: 'Độ tin cậy vừa',
  high: 'Độ tin cậy cao',
};

type Tab = 'vocab' | 'kanji' | 'grammar';
const TABS: { id: Tab; label: string }[] = [
  { id: 'vocab', label: 'Từ vựng' },
  { id: 'kanji', label: 'Kanji' },
  { id: 'grammar', label: 'Ngữ pháp' },
];

function pct(value: number, max: number) {
  return `${Math.max(0, Math.min(100, (value / max) * 100))}%`;
}

function itemHref(tab: Tab, item: LikelyItem): string | null {
  if (tab === 'kanji') return `/kanji/structure?c=${encodeURIComponent(item.text)}`;
  if (item.lessonNumber == null) return null;
  return `${tab === 'vocab' ? '/vocab' : '/grammar'}?lesson=${item.lessonNumber}`;
}

export default function ExamPredictionView() {
  const { isAuthenticated, authReady } = useAuth();
  const [level, setLevel] = useState<Level>('n3');
  const [tab, setTab] = useState<Tab>('vocab');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LEVEL_KEY) as Level | null;
      if (saved && LEVELS.includes(saved)) setLevel(saved);
    } catch {
      /* bỏ qua */
    }
  }, []);

  const chooseLevel = (next: Level) => {
    setLevel(next);
    try {
      localStorage.setItem(LEVEL_KEY, next);
    } catch {
      /* bỏ qua */
    }
  };

  const score = useQuery({
    queryKey: ['jlpt-prediction', 'score', level],
    queryFn: () => apiRequest<ScorePrediction>(`/jlpt-prediction/score?level=${level}`),
    enabled: authReady && isAuthenticated,
  });

  const likely = useQuery({
    queryKey: ['jlpt-prediction', 'likely', level],
    queryFn: () => apiRequest<LikelyContent>(`/jlpt-prediction/likely?level=${level}&limit=40`),
    staleTime: 10 * 60 * 1000,
  });

  return (
    <div className="container pred-page">
      <header className="pred-header">
        <div>
          <p className="page-hero__eyebrow">Dự đoán đề thi</p>
          <h2 className="view-title">Bạn đang ở đâu so với mốc đỗ?</h2>
          <p className="pred-subtitle">
            Ước lượng điểm JLPT từ các đề thi thử bạn đã làm, và những nội dung nên ưu tiên ôn vì dễ xuất hiện trong đề.
          </p>
        </div>
        <div className="pred-levels" role="tablist" aria-label="Cấp độ">
          {LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              role="tab"
              aria-selected={level === l}
              className={`pred-level${level === l ? ' is-active' : ''}`}
              onClick={() => chooseLevel(l)}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <section className="pred-card glass-panel" aria-labelledby="pred-score-title">
        <h3 id="pred-score-title" className="pred-card__title">Dự đoán điểm {level.toUpperCase()}</h3>
        {!authReady ? (
          <p className="pred-muted">Đang tải…</p>
        ) : !isAuthenticated ? (
          <div className="pred-empty">
            <p>Đăng nhập để xem điểm dự đoán dựa trên các bài thi thử của bạn.</p>
          </div>
        ) : score.isLoading ? (
          <p className="pred-muted">Đang tính…</p>
        ) : score.isError || !score.data ? (
          <p className="pred-muted">Không tải được dự đoán. Hãy thử lại sau.</p>
        ) : score.data.confidence === 'none' ? (
          <div className="pred-empty">
            <p>Bạn chưa làm đề thi thử {level.toUpperCase()} nào.</p>
            <Link href="/mock-exam" className="btn btn-primary">
              Làm đề thi thử
            </Link>
          </div>
        ) : (
          <ScoreBlock data={score.data} />
        )}
      </section>

      <section className="pred-card glass-panel" aria-labelledby="pred-likely-title">
        <div className="pred-card__head">
          <h3 id="pred-likely-title" className="pred-card__title">Nội dung dễ ra ở {level.toUpperCase()}</h3>
          <div className="pred-tabs" role="tablist" aria-label="Loại nội dung">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={`pred-tab${tab === t.id ? ' is-active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {likely.isLoading ? (
          <p className="pred-muted">Đang xếp hạng…</p>
        ) : likely.isError || !likely.data ? (
          <p className="pred-muted">Không tải được danh sách.</p>
        ) : (
          <>
            <ol className="pred-likely">
              {likely.data[tab].map((item, i) => {
                const href = itemHref(tab, item);
                return (
                  <li key={`${item.text}-${i}`} className="pred-item">
                    <span className="pred-item__rank">{i + 1}</span>
                    <div className="pred-item__main">
                      <div className="pred-item__line">
                        <span className="pred-item__text japanese-text">{item.text}</span>
                        {item.reading && <span className="pred-item__reading japanese-text">{item.reading}</span>}
                        <span className={`pred-tier pred-tier--${item.tier === 'Rất hay ra' ? 'high' : item.tier === 'Hay ra' ? 'mid' : 'low'}`}>
                          {item.tier}
                        </span>
                      </div>
                      <p className="pred-item__meaning">{item.meaning}</p>
                      {item.alt && item.alt.length > 0 && (
                        <p className="pred-item__reasons japanese-text">Cách viết khác: {item.alt.join('、')}</p>
                      )}
                      {item.reasons.length > 0 && <p className="pred-item__reasons">{item.reasons.join(' · ')}</p>}
                    </div>
                    {href && (
                      <Link href={href} className="btn btn-nav btn-sm">
                        {tab === 'kanji' ? 'Cấu tạo' : `Bài ${item.lessonNumber}`}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
            <details className="pred-method">
              <summary>Cách xếp hạng</summary>
              <ul>
                {likely.data.method.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
              <p className="pred-muted">{likely.data.attribution}</p>
            </details>
          </>
        )}
      </section>
    </div>
  );
}

function sectionFoot(s: SectionPrediction): string {
  if (!s.questions && !s.practiceQuestions) return 'Làm đề có phần này để dự đoán';
  const parts: string[] = [];
  if (s.questions) parts.push(`${s.questions} câu thi thử`);
  if (s.practiceQuestions) parts.push(`${s.practiceQuestions} lượt ${s.practiceSources.join(', ').toLowerCase()} (tính phụ)`);
  return `${parts.join(' + ')} · đúng ~${Math.round((s.accuracy ?? 0) * 100)}%`;
}

function ScoreBlock({ data }: { data: ScorePrediction }) {
  const passPct = Math.round(data.passProbability * 100);
  const passClass = passPct >= 70 ? 'good' : passPct >= 40 ? 'mid' : 'bad';
  return (
    <div className="pred-score">
      <div className="pred-score__top">
        <div className="pred-score__total">
          <span className="pred-score__big">{data.total.estimate}</span>
          <span className="pred-score__max">/ {data.maxTotal}</span>
          <p className="pred-muted">
            Khoảng {data.total.low}–{data.total.high} · mốc đỗ {data.passMark}
          </p>
        </div>
        <div className={`pred-pass pred-pass--${passClass}`}>
          <span className="pred-pass__value">{passPct}%</span>
          <span className="pred-pass__label">khả năng đỗ</span>
        </div>
      </div>

      <div className="pred-bar" aria-hidden="true">
        <div className="pred-bar__range" style={{ left: pct(data.total.low, data.maxTotal), width: pct(data.total.high - data.total.low, data.maxTotal) }} />
        <div className="pred-bar__dot" style={{ left: pct(data.total.estimate, data.maxTotal) }} />
        <div className="pred-bar__mark" style={{ left: pct(data.passMark, data.maxTotal) }}>
          <span>đỗ {data.passMark}</span>
        </div>
      </div>

      <p className="pred-meta">
        <span className={`pred-confidence pred-confidence--${data.confidence}`}>{CONFIDENCE_LABEL[data.confidence]}</span>
        {data.attempts
          ? `Dựa trên ${data.attempts} bài thi thử gần nhất (bài mới tính nặng hơn)`
          : 'Chưa có bài thi thử — tạm dựa trên kết quả luyện tập'}
        {data.sections.some((s) => s.practiceQuestions > 0) ? ', có tính thêm kết quả luyện tập.' : '.'}
      </p>

      <div className="pred-sections">
        {data.sections.map((s) => {
          const hasData = s.questions > 0 || s.practiceQuestions > 0;
          return (
          <div key={s.id} className="pred-section">
            <div className="pred-section__head">
              <span className="pred-section__name">
                {s.name} <span className="japanese-text pred-muted">{s.nameJa}</span>
              </span>
              <span className="pred-section__score">
                {hasData ? (
                  <>
                    <strong>{s.estimate}</strong>/{s.max}
                    <span className="pred-muted"> ({s.low}–{s.high})</span>
                  </>
                ) : (
                  <span className="pred-muted">chưa có dữ liệu</span>
                )}
              </span>
            </div>
            <div className="pred-bar pred-bar--small" aria-hidden="true">
              {hasData && (
                <>
                  <div className="pred-bar__range" style={{ left: pct(s.low, s.max), width: pct(s.high - s.low, s.max) }} />
                  <div className="pred-bar__dot" style={{ left: pct(s.estimate, s.max) }} />
                </>
              )}
              <div className="pred-bar__mark pred-bar__mark--min" style={{ left: pct(s.minPass, s.max) }}>
                <span>sàn {s.minPass}</span>
              </div>
            </div>
            <p className="pred-muted pred-section__foot">
              {sectionFoot(s)}
              {hasData && s.belowMinRisk >= 0.2 ? ` · ${Math.round(s.belowMinRisk * 100)}% nguy cơ dưới điểm sàn` : ''}
            </p>
          </div>
          );
        })}
      </div>

      {data.advice.length > 0 && (
        <ul className="pred-advice">
          {data.advice.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}
      <p className="pred-muted pred-note">
        JLPT chấm theo điểm quy đổi, không cộng thẳng số câu đúng — con số ở đây là ước lượng để biết nên ôn phần nào.
      </p>
    </div>
  );
}
