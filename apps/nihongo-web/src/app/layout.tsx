import { headers } from 'next/headers';
import Providers from './providers';
import './globals.css';

export { metadata } from './metadata';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Nonce do middleware.ts sinh cho request này; thiếu nonce thì CSP chặn script inline bên dưới
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        {/* Set theme before first paint to prevent flash */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('nihongo-theme')||((window.matchMedia('(prefers-color-scheme:light)').matches)?'light':'dark');document.documentElement.setAttribute('data-theme',t);}catch(e){}`,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}