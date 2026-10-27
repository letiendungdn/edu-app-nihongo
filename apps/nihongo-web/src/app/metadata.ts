import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nihongo Learn - Master Japanese',
  description: 'App học tiếng Nhật — Minna, Kanji, JLPT mock exams',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/logo-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/logo-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};
