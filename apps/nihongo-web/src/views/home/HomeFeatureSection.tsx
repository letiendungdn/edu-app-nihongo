'use client';

import Link from 'next/link';
import { navIconFor } from '@/config/nav';
import type { HomeFeatureSection as HomeFeatureSectionData } from './types';

type HomeFeatureSectionProps = {
  section: HomeFeatureSectionData;
};

export default function HomeFeatureSection({ section }: HomeFeatureSectionProps) {
  return (
    <section className="home-section">
      <div className="home-section__header">
        <h2 className="home-section__title">{section.title}</h2>
        <span className="home-section__count">{section.items.length} mục</span>
      </div>
      <div className="feature-grid">
        {section.items.map((item) => (
          <Link key={item.href} href={item.href} className="feature-card">
            <div className="feature-card__icon japanese-text">{navIconFor(item.href) ?? item.icon}</div>
            <div className="feature-card__body">
              <div className="feature-card__title">{item.title}</div>
              <div className="feature-card__desc">{item.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
