'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CountryNameItem } from '../types/reference';
import PlayAllButton from '../components/PlayAllButton';
import { usePlayAll } from '../hooks/usePlayAll';
import { useJapaneseCountryNamesQuery } from '../hooks/queries';
import { playAudio } from '../utils/speech';
import { countryFlagEmoji } from '../utils/countryFlag';
import StrokeOrder from '../components/StrokeOrder';
import CountryPeopleTable from '../components/CountryPeopleTable';
import { COUNTRY_PEOPLE_LANGUAGES, matchesCountryPeople, personOf } from '../data/country-people-language';
import './CountriesView.css';

function CountryPopup({
  item,
  onClose,
  onStep,
}: {
  item: CountryNameItem;
  onClose: () => void;
  onStep: (direction: -1 | 1) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        playAudio(item.kana);
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onStep(-1);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        onStep(1);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [item.kana, onClose, onStep]);

  const heardKey = useRef<string | null>(null);
  useEffect(() => {
    const key = `${item.code}:${item.nameJa}:${item.kana}`;
    if (heardKey.current === key) return;
    heardKey.current = key;
    playAudio(item.kana);
  }, [item.code, item.nameJa, item.kana]);

  return (
    <div className="country-popup-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="country-popup" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="country-popup-close" onClick={onClose} aria-label="Đóng">✕</button>

        <div className="country-popup-header">
          <span className="country-popup-flag" aria-hidden>{countryFlagEmoji(item.code)}</span>
          <div className="country-popup-meta">
            <span className="country-popup-ja japanese-text">{item.nameJa}</span>
            <span className="country-popup-kana japanese-text">{item.kana}</span>
            <span className="country-popup-romaji">{item.romaji}</span>
          </div>
        </div>

        <div className="country-popup-stroke">
          <StrokeOrder text={item.nameJa} compact />
          <p className="country-popup-stroke-hint">Nhấn vào chữ để xem lại nét</p>
        </div>

        <p className="country-popup-vi">{item.meaning}</p>

        <button
          type="button"
          className="btn btn-outline country-popup-audio"
          onClick={() => playAudio(item.kana)}
        >
          🔊 Nghe đọc
        </button>
      </div>
    </div>
  );
}

function matchesCountry(item: CountryNameItem, query: string): boolean {
  const haystack = [item.nameJa, item.kana, item.romaji, item.meaning, item.code]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

/** Tab bảng 国・人・語 — dữ liệu soạn sẵn ở frontend, không lấy từ API. */
const PEOPLE_TAB = 'kuni-hito-go';

export default function CountriesView() {
  const { data, isLoading } = useJapaneseCountryNamesQuery();
  const regions = data?.regions ?? [];
  const [activeId, setActiveId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [popupItem, setPopupItem] = useState<CountryNameItem | null>(null);
  const { isPlayingAll, startPlayAll, stopPlayAll } = usePlayAll();

  const resolvedActiveId = activeId || regions[0]?.id || '';
  const isPeopleTab = resolvedActiveId === PEOPLE_TAB;
  const category = regions.find((c) => c.id === resolvedActiveId) ?? regions[0];

  const items = useMemo(() => {
    const source = category?.items ?? [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return source;
    return source.filter((item) => matchesCountry(item, q));
  }, [category, searchQuery]);

  const peopleRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return q ? COUNTRY_PEOPLE_LANGUAGES.filter((c) => matchesCountryPeople(c, q)) : COUNTRY_PEOPLE_LANGUAGES;
  }, [searchQuery]);

  const count = isPeopleTab ? peopleRows.length : items.length;

  const stepPopup = useCallback((direction: -1 | 1) => {
    setPopupItem((current) => {
      if (!current || items.length === 0) return current;
      const index = items.findIndex((entry) => entry.code === current.code && entry.nameJa === current.nameJa);
      if (index < 0) return items[0];
      return items[(index + direction + items.length) % items.length];
    });
  }, [items]);

  useEffect(() => {
    if (!popupItem) return;
    document
      .querySelector(`[data-country="${popupItem.code}-${popupItem.nameJa}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [popupItem]);

  const handlePlayAll = () => {
    if (isPeopleTab) {
      // Đọc theo hàng: nước → người → ngôn ngữ
      startPlayAll(peopleRows.flatMap((c) => [c.kana, personOf(c).kana, ...c.languages.map((l) => l.kana)]));
      return;
    }
    startPlayAll(items.map((item) => item.kana));
  };

  if (isLoading || !category) {
    return (
      <div className="container countries-view">
        <p className="countries-empty">Đang tải tên quốc gia...</p>
      </div>
    );
  }

  return (
    <div className="container countries-view">
      <div className="countries-header">
        <h2 className="view-title countries-view-title">Tên quốc gia</h2>
        <p className="countries-subtitle">
          Học tên quốc gia bằng tiếng Nhật — hầu hết viết bằng <strong>カタカナ</strong>,
          một số nước gần Nhật dùng <strong>漢字</strong> (日本・中国・韓国…). Bấm thẻ để nghe.
        </p>

        <div className="countries-tabs">
          {regions.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`tab-btn ${resolvedActiveId === cat.id ? 'active' : ''}`}
              onClick={() => {
                stopPlayAll();
                setActiveId(cat.id);
              }}
            >
              {cat.label}
            </button>
          ))}
          <button
            type="button"
            className={`tab-btn ${isPeopleTab ? 'active' : ''}`}
            onClick={() => {
              stopPlayAll();
              setActiveId(PEOPLE_TAB);
            }}
          >
            国・人・語
          </button>
        </div>

        <label className="countries-search">
          <span className="sr-only">Tìm quốc gia</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm: ベトナム, Vietnam, betonamu…"
            autoComplete="off"
          />
        </label>
      </div>

      <div className="countries-panel">
        <div className="countries-hint-box">
          {isPeopleTab ? (
            <ul className="countries-hint-list">
              <li>
                Người: tên nước + 「人（じん）」 — ベトナム人. Ngôn ngữ: tên nước + 「語（ご）」 — ベトナム語.
              </li>
              <li>
                <strong>In đậm</strong> = ngoại lệ: アメリカ・イギリス → <strong>英語</strong>, ブラジル → <strong>ポルトガル語</strong>, メキシコ → <strong>スペイン語</strong>.
              </li>
              <li>
                「人」 đọc <strong>じん</strong> khi chỉ quốc tịch, <strong>にん</strong> khi đếm (三人), <strong>ひと</strong> khi đứng một mình.
              </li>
              <li>
                お国はどちらですか。・何人（なにじん）ですか。・何語（なにご）が話せますか。
              </li>
            </ul>
          ) : (
          <ul className="countries-hint-list">
            <li>
              Người Nhật thường nói 「〜の人」 cho dân tộc (例: ベトナムの人 = người Việt).
            </li>
            <li>
              Ngôn ngữ: thêm 「語」 — 日本語・ベトナム語・英語…
            </li>
            <li>
              Quốc gia mình: 「私はベトナム人です」 / 「ベトナムから来ました」.
            </li>
          </ul>
          )}
        </div>

        <div className="countries-toolbar">
          <span className="countries-count">{count} mục</span>
          <PlayAllButton
            isPlaying={isPlayingAll}
            onPlay={handlePlayAll}
            onStop={stopPlayAll}
            label="Phát tất cả"
            disabled={count === 0}
          />
        </div>

        {isPeopleTab ? (
          peopleRows.length === 0 ? (
            <p className="countries-empty">Không tìm thấy quốc gia phù hợp.</p>
          ) : (
            <CountryPeopleTable rows={peopleRows} />
          )
        ) : items.length === 0 ? (
          <p className="countries-empty">Không tìm thấy quốc gia phù hợp.</p>
        ) : (
          <div className="countries-grid">
            {items.map((item) => (
              <div
                key={`${item.code}-${item.nameJa}`}
                data-country={`${item.code}-${item.nameJa}`}
                className={`country-card${popupItem?.code === item.code && popupItem.nameJa === item.nameJa ? ' selected' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => setPopupItem(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPopupItem(item); }
                }}
              >
                <button
                  type="button"
                  className="country-audio-btn"
                  title="Nghe phát âm"
                  aria-label="Nghe phát âm"
                  onClick={(e) => { e.stopPropagation(); playAudio(item.kana); }}
                >
                  🔊
                </button>
                <span className="country-flag" aria-hidden>
                  {countryFlagEmoji(item.code)}
                </span>
                <span className="country-ja japanese-text">{item.nameJa}</span>
                <span className="country-kana japanese-text">{item.kana}</span>
                <span className="country-romaji">{item.romaji}</span>
                <span className="country-vi">{item.meaning}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {popupItem && (
        <CountryPopup item={popupItem} onClose={() => setPopupItem(null)} onStep={stepPopup} />
      )}
    </div>
  );
}
