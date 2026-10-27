'use client';

import Link from 'next/link';

export default function HomeHero() {
  return (
    <section className="home-hero">
      <div className="home-hero__text">
        <p className="home-hero__eyebrow">Học tiếng Nhật hiệu quả</p>
        <h1 className="home-title">
          Chinh phục <em>JLPT</em> từng bước một
        </h1>
        <p className="home-subtitle">
          Kana, từ vựng, ngữ pháp, kanji — bài học tương tác theo giáo trình Minna no Nihongo với
          audio chuẩn và flashcard thông minh.
        </p>
        <div className="home-cta-row">
          <Link href="/kana" className="btn btn-primary">
            Bắt đầu học
          </Link>
          <Link href="/jlpt" className="btn btn-outline">
            Lộ trình JLPT →
          </Link>
        </div>
      </div>
    </section>
  );
}
