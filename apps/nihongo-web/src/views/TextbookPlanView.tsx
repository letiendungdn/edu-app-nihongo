"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchReadingPassages } from "../api";
import {
  useBookAudioFilesQuery,
  useKanjiLessonsQuery,
  useLessons,
} from "../hooks/queries";
import {
  JLPT_MIND_LEVELS,
  type JlptMindLevel,
} from "../data/jlpt-mind-map-shared";
import {
  audioRegex,
  booksFor,
  planLevelFor,
  seriesInfo,
  type JlptTextbookSeries,
} from "../data/jlpt-textbooks";
import {
  buildStudyPlan,
  type PlanAudio,
  type PlanTaskKind,
} from "../data/textbook-study-plans";
import { useTextbookCatalog } from "../hooks/useTextbookCatalog";
import "./TextbookPlanView.css";

const TASK_ICON: Record<PlanTaskKind, string> = {
  GRAMMAR: "文",
  VOCAB: "単",
  KANJI: "漢",
  READING: "読",
  LISTENING: "聴",
  REVIEW: "復",
  EXAM: "試",
};

type Progress = { done: string[]; notes: Record<string, string> };

const EMPTY_PROGRESS: Progress = { done: [], notes: {} };

function storageKey(series: JlptTextbookSeries, level: JlptMindLevel) {
  return `textbook-plan:${series}:${level}`;
}

function loadProgress(key: string): Progress {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return EMPTY_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return {
      done: Array.isArray(parsed.done) ? parsed.done : [],
      notes: parsed.notes ?? {},
    };
  } catch {
    return EMPTY_PROGRESS;
  }
}

function saveProgress(key: string, progress: Progress) {
  try {
    window.localStorage.setItem(key, JSON.stringify(progress));
  } catch {
    // private mode / storage bị chặn — tiến độ chỉ giữ trong phiên
  }
}

export default function TextbookPlanView({
  initialSeries = "SOUMATOME",
  initialLevel = "N3",
}: {
  initialSeries?: JlptTextbookSeries;
  initialLevel?: JlptMindLevel;
}) {
  const router = useRouter();
  const {
    data: catalog,
    isLoading: catalogLoading,
    isError: catalogError,
  } = useTextbookCatalog();
  const [series, setSeries] = useState<JlptTextbookSeries>(initialSeries);
  const [level, setLevel] = useState<JlptMindLevel>(initialLevel);
  const meta = seriesInfo(catalog, series);
  const planLevels = meta?.planLevels ?? [];

  // Đổi sách/cấp từ menu chỉ đổi URL (cùng trang) → đồng bộ lại state từ props;
  // khi danh mục về thì đưa cấp về cấp bộ sách có lộ trình.
  useEffect(() => {
    setSeries(initialSeries);
    setLevel(planLevelFor(seriesInfo(catalog, initialSeries), initialLevel));
  }, [initialSeries, initialLevel, catalog]);

  const {
    data: lessons = [],
    isLoading: lessonsLoading,
    isError: lessonsError,
  } = useLessons();
  const { data: kanjiLessons = [], isLoading: kanjiLoading } =
    useKanjiLessonsQuery();
  const { data: readings = [] } = useQuery({
    queryKey: ["reading-passages"],
    queryFn: () => fetchReadingPassages(),
  });

  const { data: bookAudio } = useBookAudioFilesQuery();
  const audio = useMemo<PlanAudio[]>(() => {
    const match = audioRegex(meta);
    if (!match) return [];
    const section = bookAudio?.sections.find((s) => s.level === level);
    return (section?.items ?? [])
      .filter((item) => match.test(item.title))
      .map((item) => ({
        id: item.id,
        title: item.title,
        href: `/book-audio?level=${level}&item=${encodeURIComponent(item.id)}`,
      }));
  }, [bookAudio, meta, level]);

  const plan = useMemo(
    () =>
      buildStudyPlan(
        series,
        level,
        {
          lessons: lessons.map((l) => ({
            lessonNumber: l.lessonNumber,
            title: l.title,
            jlptLevel: l.jlptLevel,
            textbook: l.textbook,
            description: l.description,
            grammarCount: l._count?.grammars,
            vocabCount: l._count?.vocabularies,
          })),
          kanjiLessons,
          readings,
          audio,
        },
        planLevels,
      ),
    [series, level, lessons, kanjiLessons, readings, audio, planLevels],
  );

  const key = storageKey(series, level);
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);
  useEffect(() => setProgress(loadProgress(key)), [key]);

  const update = (next: Progress) => {
    setProgress(next);
    saveProgress(key, next);
  };
  const toggleDone = (unitId: string) => {
    const done = progress.done.includes(unitId)
      ? progress.done.filter((id) => id !== unitId)
      : [...progress.done, unitId];
    update({ ...progress, done });
  };
  const setNote = (unitId: string, value: string) =>
    update({ ...progress, notes: { ...progress.notes, [unitId]: value } });

  const select = (nextSeries: JlptTextbookSeries, nextLevel: JlptMindLevel) => {
    const lv = planLevelFor(seriesInfo(catalog, nextSeries), nextLevel);
    setSeries(nextSeries);
    setLevel(lv);
    router.replace(
      `/textbooks?series=${nextSeries.toLowerCase()}&level=${lv.toLowerCase()}`,
      { scroll: false },
    );
  };

  const books = booksFor(meta, level);
  const doneCount = plan
    ? plan.sections
        .flatMap((s) => s.units)
        .filter((u) => progress.done.includes(u.id)).length
    : 0;
  const pct =
    plan && plan.unitCount ? Math.round((doneCount / plan.unitCount) * 100) : 0;
  const loading = lessonsLoading || kanjiLoading || catalogLoading;
  const emptyPlan =
    plan &&
    plan.sections.every((s) =>
      s.units.every((u) =>
        u.tasks.every(
          (t) =>
            t.kind === "REVIEW" || t.kind === "EXAM" || t.kind === "LISTENING",
        ),
      ),
    );

  return (
    <div className="container tbp-view">
      <header className="tbp-header">
        <div>
          <h1 className="view-title">Học theo giáo trình</h1>
          <p className="tbp-subtitle">
            Bài học trong app được xếp theo khung của từng bộ sách. Dùng sách
            song song, ghi số trang vào từng buổi.
          </p>
        </div>
        <Link href="/grammar/mindmap" className="btn btn-outline">
          Sơ đồ ngữ pháp
        </Link>
      </header>

      {catalogError ? (
        <p className="tbp-empty">
          Không tải được danh mục giáo trình — kiểm tra API rồi thử lại.
        </p>
      ) : null}

      <div className="tbp-series" role="tablist" aria-label="Bộ giáo trình">
        {(catalog?.series ?? []).map((m) => (
          <button
            key={m.code}
            type="button"
            role="tab"
            aria-selected={m.code === series}
            className={`tbp-series__tab${m.code === series ? " is-active" : ""}`}
            onClick={() => select(m.code, level)}
          >
            <strong>{m.name}</strong>
            <span className="japanese-text">{m.nameJa}</span>
          </button>
        ))}
      </div>

      <div className="tbp-levels" role="tablist" aria-label="Cấp JLPT">
        {JLPT_MIND_LEVELS.map((lv) => {
          const available = planLevels.includes(lv);
          return (
            <button
              key={lv}
              type="button"
              role="tab"
              aria-selected={lv === level}
              disabled={!available}
              title={
                available
                  ? undefined
                  : `${meta?.name ?? ""} không có sách ${lv}`
              }
              className={`tbp-level${lv === level ? " is-active" : ""}`}
              onClick={() => select(series, lv)}
            >
              {lv}
            </button>
          );
        })}
      </div>

      {meta ? (
        <section className="tbp-intro glass-panel">
          <p>
            <a href={meta.url} target="_blank" rel="noopener noreferrer">
              {meta.name} {level}
            </a>{" "}
            · {meta.publisher} — {meta.blurb}
          </p>
          {books.length ? (
            <p className="tbp-books">
              Sách tương ứng:{" "}
              {books.map((b, i) => (
                <span key={b.title}>
                  {i ? " · " : ""}
                  {b.url ? (
                    <a
                      href={b.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="japanese-text"
                    >
                      {b.title}
                    </a>
                  ) : (
                    <span className="japanese-text" title={b.note}>
                      {b.title}
                    </span>
                  )}
                </span>
              ))}
            </p>
          ) : null}
          <p className="tbp-books">
            File nghe:{" "}
            {audio.length ? (
              audio.map((a, i) => (
                <span key={a.id}>
                  {i ? " · " : ""}
                  <Link href={a.href}>🎧 {a.title}</Link>
                </span>
              ))
            ) : (
              <span className="tbp-muted">
                chưa có trong <Link href="/book-audio">File nghe sách</Link> cho{" "}
                {meta.name} {level}
                {series === "KLL" ? " (sách kanji, không kèm audio)" : ""}.
              </span>
            )}
          </p>
          {plan ? (
            <div className="tbp-progress" aria-label={`Hoàn thành ${pct}%`}>
              <div className="tbp-progress__bar">
                <span style={{ width: `${pct}%` }} />
              </div>
              <span>
                {doneCount}/{plan.unitCount} buổi · {pct}%
              </span>
            </div>
          ) : null}
        </section>
      ) : null}

      {loading ? <p className="tbp-empty">Đang tải bài học…</p> : null}
      {!loading && lessonsError ? (
        <p className="tbp-empty">
          Không tải được danh sách bài học — kiểm tra API rồi thử lại.
        </p>
      ) : null}
      {!loading && !lessonsError && emptyPlan ? (
        <p className="tbp-empty">
          Chưa có bài học {level} trong app để xếp vào lộ trình này.
        </p>
      ) : null}

      {plan && !loading
        ? plan.sections.map((section) => (
            <section key={section.id} className="tbp-section">
              <h2>
                {section.title}
                {section.titleJa ? (
                  <span className="japanese-text"> {section.titleJa}</span>
                ) : null}
              </h2>
              <ol className="tbp-units">
                {section.units.map((unit) => {
                  const done = progress.done.includes(unit.id);
                  return (
                    <li
                      key={unit.id}
                      className={`tbp-unit glass-panel${done ? " is-done" : ""}`}
                    >
                      <label className="tbp-unit__head">
                        <input
                          type="checkbox"
                          checked={done}
                          onChange={() => toggleDone(unit.id)}
                        />
                        <span className="tbp-unit__title">{unit.title}</span>
                        {unit.subtitle ? (
                          <span className="tbp-unit__sub">{unit.subtitle}</span>
                        ) : null}
                      </label>
                      <ul className="tbp-tasks">
                        {unit.tasks.map((task) => (
                          <li key={`${task.kind}-${task.href}`}>
                            <Link href={task.href}>
                              <span
                                className="tbp-task__icon japanese-text"
                                aria-hidden
                              >
                                {TASK_ICON[task.kind]}
                              </span>
                              {task.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                      <input
                        className="tbp-note"
                        type="text"
                        placeholder="Trang sách / ghi chú (vd: tr. 12–15)"
                        value={progress.notes[unit.id] ?? ""}
                        onChange={(e) => setNote(unit.id, e.target.value)}
                        aria-label={`Ghi chú ${section.title} ${unit.title}`}
                      />
                    </li>
                  );
                })}
              </ol>
            </section>
          ))
        : null}

      <p className="tbp-footnote">
        App không chứa nội dung sách (bản quyền NXB). Tiến độ và ghi chú lưu
        trên trình duyệt này.
      </p>
    </div>
  );
}
