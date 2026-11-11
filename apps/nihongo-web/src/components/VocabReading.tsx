'use client';

import type { Vocabulary } from '@/types/api';

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
          {vocab.meaningEn}
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
