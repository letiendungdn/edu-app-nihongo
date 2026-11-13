'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import PersonalWordForm from '../components/PersonalWordForm';
import { useAuth } from '../hooks/useAuth';
import { useCreatePersonalWord, useDeletePersonalWord, usePersonalWords } from '../hooks/usePersonalWords';
import './PersonalWordsView.css';

const LESSONS = [1, 2, 3, 4, 5, 6] as const;

/** Sổ từ vựng cá nhân. Bài học: docs/learn-react-build-app.md */
export default function PersonalWordsView() {
  const { isAuthenticated, authReady } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const lessonParam = Number(params.get('lesson'));
  const lesson = Number.isInteger(lessonParam) && lessonParam > 0 ? lessonParam : undefined;

  const { data, isPending, isError, error, refetch } = usePersonalWords(lesson, isAuthenticated);
  const create = useCreatePersonalWord();
  const remove = useDeletePersonalWord();

  // Bộ lọc nằm trên URL (?lesson=6): tải lại trang, gửi link, bấm Back đều giữ đúng bộ lọc.
  const setLesson = (value: string) => router.replace(value ? `${pathname}?lesson=${value}` : pathname);

  if (!authReady) return null; // đang đọc token đã lưu: chưa biết đã đăng nhập chưa
  if (!isAuthenticated) {
    return (
      <section className="pw-page">
        <h1>Sổ từ của tôi</h1>
        <p>
          <Link href="/login?redirect=/my-words">Đăng nhập</Link> để lưu từ vựng của riêng bạn.
        </p>
      </section>
    );
  }

  return (
    <section className="pw-page">
      <header className="pw-head">
        <h1>Sổ từ của tôi</h1>
        <Link href="/my-words/quiz" className="pw-quiz-link">
          Ôn tập
        </Link>
      </header>

      <PersonalWordForm serverError={create.error?.message} onSubmit={(d) => create.mutateAsync(d)} />

      <label className="pw-filter">
        Lọc theo bài{' '}
        <select aria-label="Lọc theo bài" value={lesson ?? ''} onChange={(e) => setLesson(e.target.value)}>
          <option value="">Mọi bài</option>
          {LESSONS.map((l) => (
            <option key={l} value={l}>
              Bài {l}
            </option>
          ))}
        </select>
      </label>

      {/* Bốn trạng thái bắt buộc: đang tải, lỗi, rỗng, có dữ liệu */}
      {isPending ? (
        <p>Đang tải…</p>
      ) : isError ? (
        <div role="alert" className="pw-error">
          {error.message} <button onClick={() => refetch()}>Thử lại</button>
        </div>
      ) : data.data.length === 0 ? (
        <p className="pw-empty">Chưa có từ nào{lesson ? ` trong bài ${lesson}` : ''}.</p>
      ) : (
        <>
          <p className="pw-total">{data.total} từ</p>
          <ul className="pw-list">
            {data.data.map((w) => (
              <li key={w.id}>
                <span className="pw-kana" lang="ja">
                  {w.kana}
                </span>
                <span className="pw-meaning">
                  {w.meaning} · Bài {w.lesson}
                </span>
                <button
                  aria-label={`Xóa ${w.kana}`}
                  onClick={() => {
                    if (window.confirm(`Xóa "${w.kana}" khỏi sổ?`)) remove.mutate(w.id);
                  }}
                >
                  Xóa
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
