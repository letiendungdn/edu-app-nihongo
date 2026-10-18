'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import LessonSelector from '../components/LessonSelector';
import FuriganaText from '../components/FuriganaText';
import { useGrammar } from '../hooks/queries';
import { buildParticleQuestions } from '../utils/particles';
import './DrillView.css';

export default function ParticlesView() {
  const [lesson, setLesson] = useState(1);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState({ ok: 0, n: 0 });
  const [showFuri, setShowFuri] = useState(true);
  const { data: grammars = [], isLoading } = useGrammar(lesson);

  const questions = useMemo(() => {
    const examples = grammars.flatMap((g) =>
      (g.examples ?? []).map((ex) => ({ id: ex.id, jp: ex.jp, vi: ex.vi ?? ex.en })),
    );
    return buildParticleQuestions(examples);
  }, [grammars]);

  const current = questions[index];

  function grade(opt: string) {
    if (!current || picked) return;
    setPicked(opt);
    setScore((s) => ({ ok: s.ok + (opt === current.answer ? 1 : 0), n: s.n + 1 }));
  }

  function next() {
    setPicked(null);
    setIndex((i) => (i + 1) % Math.max(questions.length, 1));
  }

  return (
    <div className="container drill-view">
      <header className="drill-header">
        <h2 className="view-title">助詞 — Luyện trợ từ</h2>
        <p className="drill-subtitle">
          Che は/が/を/に/で trong ví dụ ngữ pháp Minna.{' '}
          <Link href="/practice">Tất cả bài luyện</Link>
        </p>
      </header>
      <LessonSelector id="particle-lesson" value={lesson} onChange={(n) => { setLesson(n); setIndex(0); setPicked(null); }} countKind="grammar" />
      <label className="furigana-toggle">
        <input type="checkbox" checked={showFuri} onChange={() => setShowFuri((v) => !v)} />
        Hiện furigana
      </label>
      {isLoading && <p>Đang tải...</p>}
      {!isLoading && !current && <p>Bài này chưa có ví dụ có trợ từ. Thử bài khác.</p>}
      {current && (
        <>
          <p className="drill-score">{index + 1}/{questions.length} · đúng {score.ok}/{score.n || 0}</p>
          <div className="drill-card">
            <p className="drill-prompt japanese-text">
              {current.prompt.map((part, i) =>
                part.blank ? (
                  <span key={i} style={{ color: 'var(--primary-color)' }}> {part.text} </span>
                ) : (
                  <FuriganaText key={i} text={part.text} show={showFuri} />
                ),
              )}
            </p>
            {current.vi && <p className="drill-meta">{current.vi}</p>}
            <div className="drill-options">
              {current.options.map((opt) => {
                const cls =
                  picked == null ? '' : opt === current.answer ? ' is-correct' : opt === picked ? ' is-wrong' : '';
                return (
                  <button
                    key={opt}
                    type="button"
                    className={`drill-option japanese-text${cls}`}
                    disabled={picked != null}
                    onClick={() => grade(opt)}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
          <button type="button" className="btn btn-nav" onClick={next}>Câu tiếp</button>
        </>
      )}
    </div>
  );
}
