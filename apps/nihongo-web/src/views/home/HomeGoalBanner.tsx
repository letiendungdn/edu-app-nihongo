'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchTodayActivity, type TodayActivity } from '@/api';
import './HomeGoalBanner.css';

const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'] as const;
type JlptLevel = (typeof LEVELS)[number];

const STORAGE_GOAL = 'user-goal-v1';

interface GoalConfig {
  level: JlptLevel;
  startDate: string;
  endDate: string;
  label: string;
}

const DEFAULT_GOAL: GoalConfig = {
  level: 'N2',
  startDate: '2026-09-12',
  endDate: '2027-03-12',
  label: 'Đạt trong 6 tháng',
};

function loadGoal(): GoalConfig {
  try {
    const raw = localStorage.getItem(STORAGE_GOAL);
    if (!raw) return DEFAULT_GOAL;
    return { ...DEFAULT_GOAL, ...JSON.parse(raw) } as GoalConfig;
  } catch { return DEFAULT_GOAL; }
}

function saveGoal(g: GoalConfig) {
  try { localStorage.setItem(STORAGE_GOAL, JSON.stringify(g)); } catch { /* ignore */ }
}

const TASKS = [
  { id: 'srs',      label: 'Ôn SRS hàng ngày', icon: '憶', href: '/srs' },
  { id: 'vocab',    label: 'Học bài mới',        icon: '単', href: '/vocab' },
  { id: 'kanji',    label: 'Luyện kanji',         icon: '漢', href: '/kanji/list' },
  { id: 'exam',     label: 'Làm đề thi thử',     icon: '試', href: '/mock-exam' },
] as const;

type TaskId = (typeof TASKS)[number]['id'];

function todayKey() {
  const d = new Date();
  return `goal-check-${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function loadChecked(): Set<TaskId> {
  try {
    const raw = localStorage.getItem(todayKey());
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as TaskId[]);
  } catch { return new Set(); }
}

function saveChecked(s: Set<TaskId>) {
  try { localStorage.setItem(todayKey(), JSON.stringify([...s])); } catch { /* ignore */ }
}

export default function HomeGoalBanner() {
  const { isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [goal, setGoal] = useState<GoalConfig>(DEFAULT_GOAL);
  const [checked, setChecked] = useState<Set<TaskId>>(new Set());
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<GoalConfig>(DEFAULT_GOAL);

  const { data: todayActivity } = useQuery<TodayActivity>({
    queryKey: ['today-activity'],
    queryFn: fetchTodayActivity,
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  useEffect(() => {
    const g = loadGoal();
    setGoal(g);
    setDraft(g);
    setChecked(loadChecked());
    setMounted(true);
  }, []);

  const startDate = new Date(goal.startDate);
  const endDate   = new Date(goal.endDate);
  const today     = new Date();
  const totalDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000));
  const elapsed   = Math.max(0, Math.floor((today.getTime() - startDate.getTime()) / 86_400_000));
  const daysLeft  = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / 86_400_000));
  const progress  = Math.min(100, Math.round((elapsed / totalDays) * 100));
  const finished  = daysLeft === 0;

  function isDone(id: TaskId): boolean {
    if (isAuthenticated && todayActivity) {
      return todayActivity[id as keyof TodayActivity] ?? false;
    }
    return mounted && checked.has(id);
  }

  function toggle(id: TaskId) {
    // auto-managed when authenticated
    if (isAuthenticated && todayActivity) return;
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveChecked(next);
      return next;
    });
  }

  const doneCount = TASKS.filter((t) => isDone(t.id)).length;

  function openEdit() { setDraft(goal); setEditing(true); }
  function cancelEdit() { setEditing(false); }
  function saveEdit() {
    if (!draft.endDate) return;
    const updated: GoalConfig = {
      ...draft,
      startDate: draft.startDate || new Date().toISOString().slice(0, 10),
    };
    setGoal(updated);
    saveGoal(updated);
    setEditing(false);
  }

  return (
    <div className="goal-banner">
      {/* Edit modal */}
      {editing && mounted && (
        <div className="goal-edit-overlay" onClick={cancelEdit}>
          <div className="goal-edit-panel" onClick={(e) => e.stopPropagation()}>
            <h3 className="goal-edit-title">Chỉnh mục tiêu</h3>

            <label className="goal-edit-label">
              Cấp độ JLPT
              <div className="goal-edit-levels">
                {LEVELS.map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    className={`goal-edit-lv-btn${draft.level === lv ? ' goal-edit-lv-btn--active' : ''}`}
                    onClick={() => setDraft((d) => ({ ...d, level: lv }))}
                  >
                    {lv}
                  </button>
                ))}
              </div>
            </label>

            <label className="goal-edit-label">
              Mô tả (tự do)
              <input
                className="goal-edit-input"
                type="text"
                value={draft.label}
                maxLength={40}
                placeholder="Kỳ thi 7/2027…"
                onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
              />
            </label>

            <label className="goal-edit-label">
              Ngày bắt đầu
              <input
                className="goal-edit-input"
                type="date"
                value={draft.startDate}
                onChange={(e) => setDraft((d) => ({ ...d, startDate: e.target.value }))}
              />
            </label>

            <label className="goal-edit-label">
              Ngày mục tiêu (deadline)
              <input
                className="goal-edit-input"
                type="date"
                value={draft.endDate}
                required
                onChange={(e) => setDraft((d) => ({ ...d, endDate: e.target.value }))}
              />
            </label>

            <div className="goal-edit-actions">
              <button type="button" className="btn btn-outline btn-sm" onClick={cancelEdit}>Hủy</button>
              <button type="button" className="btn btn-primary btn-sm" onClick={saveEdit}>Lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* Left: goal info */}
      <div className="goal-banner__left">
        <div className="goal-banner__header-row">
          <div className="goal-banner__badge">Mục tiêu</div>
          {mounted && (
            <button
              type="button"
              className="goal-banner__edit-btn"
              onClick={openEdit}
              title="Chỉnh mục tiêu"
            >
              ✎
            </button>
          )}
        </div>

        <div className="goal-banner__title">
          <span className="goal-banner__level">{goal.level}</span>
          <span className="goal-banner__subtitle">{goal.label}</span>
        </div>

        {finished ? (
          <p className="goal-banner__finished">🎉 Đã đến ngày mục tiêu!</p>
        ) : (
          <div className="goal-banner__countdown">
            <span className="goal-banner__days">{daysLeft}</span>
            <span className="goal-banner__days-label">ngày còn lại</span>
          </div>
        )}

        <div className="goal-banner__progress-wrap">
          <div className="goal-banner__progress-bar">
            <div className="goal-banner__progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="goal-banner__progress-label">{progress}% thời gian đã qua</span>
        </div>

        <p className="goal-banner__dates">
          {startDate.toLocaleDateString('vi-VN')} → {endDate.toLocaleDateString('vi-VN')}
        </p>

      </div>

      {/* Right: daily checklist */}
      <div className="goal-banner__right">
        <p className="goal-banner__check-title">
          Hôm nay {mounted ? `· ${doneCount}/${TASKS.length} xong` : ''}
        </p>
        <ul className="goal-banner__checklist">
          {TASKS.map((task) => {
            const done = isDone(task.id);
            const isAuto = isAuthenticated && !!todayActivity;
            return (
              <li key={task.id} className={`goal-banner__task${done ? ' goal-banner__task--done' : ''}`}>
                <button
                  type="button"
                  className={`goal-banner__check-btn${isAuto ? ' goal-banner__check-btn--auto' : ''}`}
                  onClick={() => toggle(task.id)}
                  aria-label={done ? `Bỏ chọn: ${task.label}` : `Đánh dấu xong: ${task.label}`}
                  title={isAuto ? 'Tự động nhận biết' : undefined}
                >
                  {done ? '✓' : ''}
                </button>
                <span className="goal-banner__task-icon">{task.icon}</span>
                <Link href={task.href} className="goal-banner__task-label">{task.label}</Link>
              </li>
            );
          })}
        </ul>
        {!isAuthenticated && mounted && (
          <p className="goal-banner__login-hint">
            <Link href="/login" className="goal-banner__login-link">Đăng nhập</Link>
            {' '}để tự động nhận biết tiến độ
          </p>
        )}
      </div>
    </div>
  );
}
