import type { CSSProperties } from 'react';
import { apiRequest } from '../lib/api-client';

export type BannerScope = 'global' | 'page';

export interface BannerStore {
  global: string | null;
  pages: Record<string, string>;
}

export function normalizeBannerPath(path: string): string {
  const base = path.split('?')[0].split('#')[0] || '/';
  if (base.length > 1 && base.endsWith('/')) return base.slice(0, -1);
  return base;
}

export function resolveBanner(store: BannerStore, path: string): string | null {
  const key = normalizeBannerPath(path);
  return store.pages[key] ?? store.global ?? null;
}

// ── API (lưu DB, chỉ admin được ghi) ────────────────────────────────────────

export function fetchBannerConfig(): Promise<BannerStore> {
  return apiRequest<BannerStore>('/banners');
}

export function upsertBannerApi(
  token: string,
  scope: BannerScope,
  path: string,
  image: string,
): Promise<BannerStore> {
  return apiRequest<BannerStore>('/banners', {
    method: 'PUT',
    token,
    body: JSON.stringify({
      scope,
      path: scope === 'page' ? normalizeBannerPath(path) : undefined,
      image,
    }),
  });
}

export function deleteBannerApi(
  token: string,
  scope: 'global' | 'page' | 'all',
  path?: string,
): Promise<BannerStore> {
  const params = new URLSearchParams({ scope });
  if (scope === 'page' && path) params.set('path', normalizeBannerPath(path));
  return apiRequest<BannerStore>(`/banners?${params.toString()}`, {
    method: 'DELETE',
    token,
  });
}

// ── Ảnh ─────────────────────────────────────────────────────────────────────

export async function readBannerImageFile(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Không đọc được file ảnh'));
    reader.readAsDataURL(file);
  });

  return resizeBannerDataUrl(dataUrl, 1920, 0.82);
}

function resizeBannerDataUrl(dataUrl: string, maxWidth: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Ảnh không hợp lệ'));
    img.src = dataUrl;
  });
}

export function bannerBackgroundStyle(
  imageUrl: string,
  theme: 'light' | 'dark',
): CSSProperties {
  const overlay =
    theme === 'light'
      ? 'linear-gradient(rgba(246,243,237,0.82), rgba(246,243,237,0.93))'
      : 'linear-gradient(rgba(19,18,16,0.8), rgba(19,18,16,0.93))';

  return {
    backgroundImage: `${overlay}, url("${imageUrl}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  };
}
