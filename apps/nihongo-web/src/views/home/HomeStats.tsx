'use client';

import type { HomeStat } from './types';

type HomeStatsProps = {
  stats: HomeStat[];
};

/** Ô icon cạnh mỗi số liệu (theo nhãn lưu trong DB). */
const STAT_ICONS: Record<string, string> = {
  'Bài học': '課',
  'Từ vựng': '単',
  Kanji: '字',
  JLPT: '↗',
};

export default function HomeStats({ stats }: HomeStatsProps) {
  return (
    <div className="home-stats">
      {stats.map((stat) => (
        <div key={stat.label} className="home-stat">
          <span className="home-stat__icon japanese-text" aria-hidden="true">
            {STAT_ICONS[stat.label] ?? '・'}
          </span>
          <div className="home-stat__text">
            <div className="home-stat__value">
              {stat.value}
              <span className="home-stat__suffix">{stat.suffix}</span>
            </div>
            <div className="home-stat__label">{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
