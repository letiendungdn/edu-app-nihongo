'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import KanjiStructurePanel from '@/components/KanjiStructurePanel';
import { isKanji } from '@/utils/kanji-structure';

interface KanjiStructureContextValue {
  /** Mở cửa sổ phân tích cho các chữ kanji trong `text` (chọn sẵn `char` nếu có). */
  openKanjiStructure: (text: string, char?: string) => void;
}

const KanjiStructureContext = createContext<KanjiStructureContextValue | null>(null);

export function kanjiCharsOf(text: string | null | undefined): string[] {
  return [...new Set([...(text ?? '')].filter(isKanji))];
}

interface OpenState {
  text: string;
  chars: string[];
  char: string;
}

function KanjiStructureModal({ state, onClose }: { state: OpenState; onClose: () => void }) {
  const [char, setChar] = useState(state.char);
  const [chars, setChars] = useState(state.chars);

  useEffect(() => {
    setChar(state.char);
    setChars(state.chars);
  }, [state]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Chặn phím tắt của trang phía sau (← → lật thẻ…) khi cửa sổ đang mở
      e.stopPropagation();
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('ks-modal-open');
    // Modal nét vẽ phía dưới dùng aria-modal → trình duyệt có thể khóa click
    // lên portal phân tích. Tạm inert để nhận tương tác bình thường.
    const underlays = Array.from(
      document.querySelectorAll<HTMLElement>(
        '.vocab-stroke-modal__backdrop, .tc-stroke-modal-backdrop',
      ),
    );
    for (const el of underlays) {
      el.setAttribute('inert', '');
      el.setAttribute('aria-hidden', 'true');
    }
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.classList.remove('ks-modal-open');
      for (const el of underlays) {
        el.removeAttribute('inert');
        el.removeAttribute('aria-hidden');
      }
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [onClose]);

  const pick = (c: string) => {
    setChars((prev) => (prev.includes(c) ? prev : [...prev, c]));
    setChar(c);
  };

  return createPortal(
    <div
      className="ks-modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ks-modal" role="dialog" aria-modal="true" aria-label={`Phân tích cấu tạo chữ ${char}`}>
        <button type="button" className="ks-modal-close" onClick={onClose} aria-label="Đóng">
          ×
        </button>
        <div className="ks-modal-head">
          <h3 className="ks-modal-title">Cấu tạo kanji</h3>
          {state.text !== char && <span className="ks-modal-word japanese-text">{state.text}</span>}
          {chars.length > 1 && (
            <div className="ks-tabs" role="tablist" aria-label="Chọn chữ">
              {chars.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="tab"
                  aria-selected={c === char}
                  className={`ks-tab japanese-text${c === char ? ' is-active' : ''}`}
                  onClick={() => setChar(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
        <KanjiStructurePanel char={char} onPickChar={pick} />
        <div className="ks-modal-foot">
          <Link
            href={`/kanji/structure?c=${encodeURIComponent(char)}`}
            className="ks-link-btn"
            onClick={onClose}
          >
            Mở trang phân tích đầy đủ →
          </Link>
          <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function KanjiStructureProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OpenState | null>(null);

  const openKanjiStructure = useCallback((text: string, char?: string) => {
    const chars = kanjiCharsOf(text);
    if (chars.length === 0) return;
    const first = char && chars.includes(char) ? char : chars[0]!;
    setState({ text, chars, char: first });
  }, []);

  const close = useCallback(() => setState(null), []);
  const value = useMemo(() => ({ openKanjiStructure }), [openKanjiStructure]);

  return (
    <KanjiStructureContext.Provider value={value}>
      {children}
      {state && <KanjiStructureModal state={state} onClose={close} />}
    </KanjiStructureContext.Provider>
  );
}

export function useKanjiStructure(): KanjiStructureContextValue {
  const ctx = useContext(KanjiStructureContext);
  if (!ctx) throw new Error('useKanjiStructure phải nằm trong KanjiStructureProvider');
  return ctx;
}
