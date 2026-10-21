'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Hls from 'hls.js';
import catalog from '@/data/mori-course.json';
import './MoriCourseView.css';

type Video = { id: string; title: string; file: string };
type Material = Video & { kind: 'pdf' | 'image' };
type Playable = Video & { kind: 'video' | 'pdf' | 'image' };
type Lesson = { title: string; videos: Video[]; materials: Material[] };
type Level = { id: string; label: string; lessons: Lesson[] };

const levels = catalog.levels as Level[];

function mediaUrl(file: string): string {
  return `/mori-media/${file.split('/').map(encodeURIComponent).join('/')}`;
}

function HlsVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    setError('');
    setReady(false);
    if (Hls.isSupported()) {
      const hls = new Hls({ startPosition: 0 });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) setError('Không phát được video.');
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      return () => hls.destroy();
    }
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      return;
    }
    setError('Trình duyệt không phát được HLS.');
  }, [src]);

  return (
    <>
      {error ? <p className="mori-empty">{error}</p> : null}
      {!error && !ready ? <p className="mori-empty">Đang chuẩn bị luồng HLS…</p> : null}
      <video
        ref={ref}
        controls
        autoPlay
        playsInline
        preload="metadata"
        controlsList="nodownload"
        onLoadedData={() => setReady(true)}
        onContextMenu={(event) => event.preventDefault()}
      />
    </>
  );
}

export default function MoriCourseView({ initialLevel }: { initialLevel?: string }) {
  const start = levels.find((level) => level.id === initialLevel?.toLowerCase())?.id ?? levels[0]?.id ?? 'n5';
  const [levelId, setLevelId] = useState(start);
  const [query, setQuery] = useState('');
  const [current, setCurrent] = useState<Playable | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [playError, setPlayError] = useState('');

  const level = levels.find((item) => item.id === levelId) ?? levels[0];
  const q = query.trim().toLowerCase();

  const lessons = useMemo(() => {
    if (!level) return [];
    if (!q) return level.lessons;
    return level.lessons
      .map((lesson) => {
        if (lesson.title.toLowerCase().includes(q)) return lesson;
        return {
          ...lesson,
          videos: lesson.videos.filter((video) => video.title.toLowerCase().includes(q)),
          materials: lesson.materials.filter((item) => item.title.toLowerCase().includes(q)),
        };
      })
      .filter((lesson) => lesson.videos.length > 0 || lesson.materials.length > 0);
  }, [level, q]);

  const videoCount = level?.lessons.reduce((sum, lesson) => sum + lesson.videos.length, 0) ?? 0;
  const materialCount = level?.lessons.reduce((sum, lesson) => sum + lesson.materials.length, 0) ?? 0;

  async function play(item: Playable) {
    setCurrent(item);
    setSrc(null);
    setPlayError('');
    try {
      const res = await fetch('/mori-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: item.file }),
      });
      if (!res.ok) throw new Error('ticket');
      const body = await res.json() as { token?: string };
      if (!body.token) throw new Error('ticket');
      const token = encodeURIComponent(body.token);
      setSrc(item.kind === 'video'
        ? `/mori-hls/${token}/index.m3u8`
        : `${mediaUrl(item.file)}?t=${token}`);
    } catch {
      setPlayError('Không mở được tệp.');
    }
  }

  return (
    <div className="container mori-view">
      <header className="mori-header">
        <h2 className="view-title">{catalog.title}</h2>
        <p className="mori-subtitle">
          {catalog.videoCount} video và {catalog.materialCount} tài liệu (PDF, ảnh) trên máy này. Bấm một mục để mở trong trang.
        </p>
      </header>

      <div className="tab-buttons mori-tabs">
        {levels.map((item) => {
          const count = item.lessons.reduce((sum, lesson) => sum + lesson.videos.length, 0);
          return (
            <button
              key={item.id}
              type="button"
              className={`btn tab-btn ${level?.id === item.id ? 'active' : ''}`}
              onClick={() => setLevelId(item.id)}
            >
              {item.label}
              <span className="mori-tab-count">{count}</span>
            </button>
          );
        })}
      </div>

      <label className="mori-search">
        <span className="sr-only">Tìm bài trong {level?.label}</span>
        <input
          type="search"
          value={query}
          placeholder={`Tìm trong ${level?.label ?? ''} (${videoCount} video, ${materialCount} tài liệu)`}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      {current && (
        <section className="mori-player glass-panel">
          <h3>{current.title}</h3>
          {playError ? <p className="mori-empty">{playError}</p> : null}
          {src && current.kind === 'video' ? <HlsVideo key={current.id} src={src} /> : null}
          {src && current.kind === 'image' ? (
            <img
              key={current.id}
              src={src}
              alt={current.title}
              onContextMenu={(event) => event.preventDefault()}
            />
          ) : null}
          {src && current.kind === 'pdf' ? (
            <iframe key={current.id} title={current.title} src={`${src}#toolbar=0&navpanes=0`} />
          ) : null}
        </section>
      )}

      {lessons.length === 0 ? (
        <p className="mori-empty">Không có bài nào khớp.</p>
      ) : (
        <div className="mori-lessons">
          {lessons.map((lesson) => (
            <details key={lesson.title} className="mori-lesson glass-panel" open={Boolean(q)}>
              <summary>
                {lesson.title}
                <span>
                  {lesson.videos.length > 0 ? `${lesson.videos.length} video` : ''}
                  {lesson.videos.length > 0 && lesson.materials.length > 0 ? ' · ' : ''}
                  {lesson.materials.length > 0 ? `${lesson.materials.length} tài liệu` : ''}
                </span>
              </summary>
              <ul>
                {lesson.videos.map((video) => (
                  <li key={video.id}>
                    <button
                      type="button"
                      className={current?.id === video.id ? 'is-current' : ''}
                      onClick={() => { void play({ ...video, kind: 'video' }); }}
                    >
                      {video.title}
                    </button>
                  </li>
                ))}
                {lesson.materials.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`mori-doc${current?.id === item.id ? ' is-current' : ''}`}
                      onClick={() => { void play(item); }}
                    >
                      <span className="mori-doc-kind">{item.kind === 'pdf' ? 'PDF' : 'Ảnh'}</span>
                      {item.title}
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
