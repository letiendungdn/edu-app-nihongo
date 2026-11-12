'use client';

import type { MouseEvent } from 'react';
import type { Vocabulary } from '@/types/api';
import { playAudio } from '@/utils/speech';
import SpeakerIcon from './SpeakerIcon';
import './VocabReading.css';

/**
 * Chữ đưa cho giọng đọc: bỏ ghi chú trong ngoặc ("(in textbook)"), dấu ~ của mẫu câu,
 * đổi ";" thành "," để giọng đọc ngắt nghỉ tự nhiên.
 */
export function englishForSpeech(text: string): string {
  return text
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[~～]/g, ' ')
    .replace(/\s*;\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .trim();
}

/** Nghĩa tiếng Anh dạng nút: bấm để nghe (giọng en-US). Không lan click ra thẻ/hàng chứa nó. */
export function SpeakEnglishButton({ text, className }: { text: string; className?: string }) {
  const onClick = (e: MouseEvent) => {
    e.stopPropagation();
    playAudio(englishForSpeech(text) || text, 'en-US');
  };
  return (
    <button
      type="button"
      lang="en"
      className={`speak-en${className ? ` ${className}` : ''}`}
      title="Bấm để nghe tiếng Anh"
      aria-label={`Nghe tiếng Anh: ${text}`}
      onClick={onClick}
    >
      <span className="speak-en__text">{text}</span>
      <SpeakerIcon className="speak-en__icon" size={13} />
    </button>
  );
}

/**
 * Bản dịch tiếng Anh của câu ví dụ (dịch máy, xem scripts/vocab-enrich/example-translations.tsv):
 * nút bấm để nghe giọng en-US. Không có bản dịch thì không vẽ gì.
 */
export function ExampleEnglish({ text, className }: { text?: string | null; className?: string }) {
  const en = text?.trim();
  if (!en) return null;
  return (
    <span className={`example-en${className ? ` ${className}` : ''}`} title="Bản dịch máy">
      <span className="example-en__label">EN</span>
      <SpeakEnglishButton text={en} />
    </span>
  );
}

/** Cột Vocabulary.furigana: JSON [[chữ, cách đọc], …]. Hỏng hoặc trống → null. */
export function parseFurigana(raw: string | null | undefined): [string, string][] | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    if (
      Array.isArray(v) &&
      v.every((s) => Array.isArray(s) && s.length === 2 && typeof s[0] === 'string' && typeof s[1] === 'string')
    ) {
      return v as [string, string][];
    }
  } catch {
    /* dữ liệu cũ / sai định dạng: bỏ qua, hiện kanji trơn */
  }
  return null;
}

/** Kanji kèm furigana (ruby) phía trên; không có furigana thì hiện kanji (hoặc kana) như cũ. */
export function FuriganaWord({ vocab, className }: { vocab: Pick<Vocabulary, 'kanji' | 'kana' | 'furigana'>; className?: string }) {
  const seg = parseFurigana(vocab.furigana);
  if (!seg) return <span className={className}>{vocab.kanji || vocab.kana}</span>;
  return (
    <span className={className}>
      {seg.map(([text, ruby], i) =>
        ruby ? (
          <ruby key={i}>
            {text}
            <rt>{ruby}</rt>
          </ruby>
        ) : (
          <span key={i}>{text}</span>
        ),
      )}
    </span>
  );
}

/** Dòng Hán Việt + nghĩa tiếng Anh dưới nghĩa tiếng Việt. Không có gì thì không vẽ. */
export function VocabExtraMeanings({ vocab }: { vocab: Pick<Vocabulary, 'hanViet' | 'meaningEn' | 'meaningEnSource'> }) {
  if (!vocab.hanViet && !vocab.meaningEn) return null;
  return (
    <p className="vocab-extra">
      {vocab.hanViet ? (
        <span className="vocab-extra__hanviet" title="Âm Hán Việt">
          {vocab.hanViet}
        </span>
      ) : null}
      {vocab.meaningEn ? (
        <span className="vocab-extra__en" lang="en">
          <span className="vocab-extra__tag">EN</span>
          <SpeakEnglishButton text={vocab.meaningEn} />
          {vocab.meaningEnSource === 'ai' ? (
            <span className="vocab-extra__ai" title="Nghĩa tiếng Anh do máy dịch, có thể chưa chính xác">
              dịch máy
            </span>
          ) : null}
        </span>
      ) : null}
    </p>
  );
}

/** Ghi nguồn KANJIDIC2 (nghĩa tiếng Anh của kanji): cùng giấy phép CC BY-SA 4.0 của EDRDG như JMdict. */
export function KanjidicAttribution() {
  return (
    <p className="vocab-attribution">
      Nghĩa tiếng Anh của kanji lấy từ{' '}
      <a href="https://www.edrdg.org/wiki/index.php/KANJIDIC_Project" target="_blank" rel="noreferrer">
        KANJIDIC2
      </a>{' '}
      © EDRDG,{' '}
      <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">
        CC BY-SA 4.0
      </a>
      .
    </p>
  );
}

/** Ghi nguồn JMdict: giấy phép CC BY-SA 4.0 bắt buộc nêu tên EDRDG ở nơi hiển thị dữ liệu. */
export function JmdictAttribution() {
  return (
    <p className="vocab-attribution">
      Nghĩa tiếng Anh lấy từ{' '}
      <a href="https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project" target="_blank" rel="noreferrer">
        JMdict
      </a>{' '}
      © EDRDG,{' '}
      <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">
        CC BY-SA 4.0
      </a>
      .
    </p>
  );
}
