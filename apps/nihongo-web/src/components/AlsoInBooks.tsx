'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import type { AlsoInTextbook } from '../types/api';

const BOOK_LABEL: Record<string, string> = {
  MINNA: 'Minna',
  KLL: 'Look and Learn',
  JLPT: 'Kho JLPT',
  SOUMATOME: 'Sou Matome',
  SHINKANZEN: 'Shinkanzen',
  TRY: 'TRY!',
};

const LESSON_HREF = {
  vocab: (lessonNumber: number) => `/vocab?lesson=${lessonNumber}`,
  grammar: (lessonNumber: number) => `/grammar?lesson=${lessonNumber}`,
  kanji: (lessonNumber: number) => `/kanji?lesson=${lessonNumber}`,
};

function bookName(code: string): string {
  return BOOK_LABEL[code] ?? code;
}

function normalize(books?: AlsoInTextbook[] | null): AlsoInTextbook[] {
  return (books ?? []).filter(
    (item) => item && typeof item.book === 'string' && Number.isFinite(item.lessonNumber),
  );
}

export function alsoInSummary(books?: AlsoInTextbook[] | null): string {
  const places = normalize(books);
  if (!places.length) return '';
  const names = [...new Set(places.map((place) => bookName(place.book)))];
  return `Trùng với ${names.join(', ')}`;
}

/** Ký hiệu mục này còn xuất hiện ở sách khác. Bấm để xem bài và mở sang. */
export default function AlsoInBooks({
  books,
  kind = 'vocab',
}: {
  books?: AlsoInTextbook[] | null;
  kind?: keyof typeof LESSON_HREF;
}) {
  const places = normalize(books);
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<{ left: number; top: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    setOpen(false);
  }, [books]);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!places.length) return null;
  const label = alsoInSummary(places);

  const toggle = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 280;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    const estimated = Math.min(248, 44 + places.length * 52);
    const below = rect.bottom + 6;
    const top = below + estimated > window.innerHeight ? Math.max(8, rect.top - estimated - 6) : below;
    setBox({ left, top });
    setOpen((value) => !value);
  };

  return (
    <>
      <button
        type="button"
        ref={buttonRef}
        className="also-in-books"
        title={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          event.preventDefault();
          toggle();
        }}
      >
        <span className="also-in-books__mark" aria-hidden="true">
          ⧉
        </span>
        <span>{label}</span>
      </button>
      {open && box && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={panelRef}
              className="also-in-books-pop"
              role="dialog"
              aria-labelledby={titleId}
              style={{ left: box.left, top: box.top }}
            >
              <p id={titleId} className="also-in-books-pop__title">
                Cũng có ở
              </p>
              <ul className="also-in-books-pop__list">
                {places.map((place) => (
                  <li key={`${place.book}-${place.lessonNumber}`}>
                    <Link
                      href={LESSON_HREF[kind](place.lessonNumber)}
                      className="also-in-books-pop__link"
                      onClick={() => setOpen(false)}
                    >
                      <span className="also-in-books-pop__book">{bookName(place.book)}</span>
                      <span className="also-in-books-pop__lesson">
                        {place.title?.trim() || `Bài ${place.lessonNumber}`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
