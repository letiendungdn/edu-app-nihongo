'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import AuthHeader from '@/components/AuthHeader';
import TextbookNavItems from '@/components/TextbookNavItems';
import PageBannerControl from '@/components/PageBannerControl';
import { useTheme } from '@/lib/theme';
import { bannerBackgroundStyle } from '@/utils/pageBanner';
import { usePageBanner } from '@/hooks/usePageBanner';

// ── Nav structure ──────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: 'Học',
    items: [
      { href: '/kana',      icon: 'あ',  label: 'Kana' },
      { href: '/vocab',     icon: '単',  label: 'Từ vựng' },
      { href: '/vocab/list', icon: '表', label: 'Danh sách từ' },
      { href: '/vocab/mindmap', icon: '🗺', label: 'Sơ đồ từ vựng' },
      { href: '/vocab/picture', icon: '🖼️', label: 'Từ điển tranh' },
      { href: '/grammar',   icon: '文',  label: 'Ngữ pháp' },
      { href: '/grammar/mindmap', icon: '🗺', label: 'Sơ đồ ngữ pháp' },
      { href: '/kanji',     icon: '漢',  label: 'Kanji' },
      { href: '/kanji/mindmap', icon: '🗺', label: 'Sơ đồ kanji' },
      { href: '/kanji/list', icon: '表', label: 'Bảng Kanji JLPT' },
      { href: '/kanji/structure', icon: '構', label: 'Cấu tạo Kanji' },
      { href: '/strokes',   icon: '筆',  label: 'Tra nét viết' },
      { href: '/counters',  icon: '①',  label: 'Đếm số' },
      { href: '/suffixes',     icon: '語',  label: 'Hậu tố' },
      { href: '/word-classes', icon: '品',  label: 'Loại từ' },
      { href: '/countries',    icon: '🌐', label: 'Quốc gia' },
    ],
  },
  {
    // Mục sách render riêng (TextbookNavItems) — ở đây chỉ còn link chung của nhóm.
    label: 'Giáo trình',
    items: [
      { href: '/book-audio', icon: '🎧', label: 'File nghe sách' },
    ],
  },
  {
    label: 'Phát âm',
    items: [
      { href: '/pronunciation',       icon: '🎤', label: 'Luyện phát âm' },
      { href: '/pronunciation-rules', icon: '📖', label: 'Quy tắc phát âm' },
      { href: '/tts',                 icon: '🔊', label: 'Đọc văn bản' },
      { href: '/stt',                 icon: '🎙️', label: 'Ghi âm → chữ' },
      { href: '/english-katakana',    icon: 'EN', label: 'EN ↔ カナ' },
    ],
  },
  {
    label: 'Nội dung',
    items: [
      { href: '/daily-listening', icon: '🎧', label: 'Nghe mỗi ngày' },
      { href: '/conversation',    icon: '話', label: 'Giao tiếp · 自己紹介' },
      { href: '/listening-types', icon: '耳', label: 'Dạng nghe JLPT' },
      { href: '/roleplay',        icon: '🗣', label: 'Đóng vai' },
      { href: '/reading',         icon: '📰', label: 'Đọc hiểu' },
      { href: '/dictation',       icon: '✍️', label: 'Nghe chép' },
      { href: '/notes',           icon: '📝', label: 'Ghi chú ngày' },
    ],
  },
  {
    label: 'Luyện tập',
    items: [
      { href: '/practice',          icon: '⚔',  label: 'Hub luyện tập' },
      { href: '/conjugation',       icon: '変',  label: 'Chia động từ' },
      { href: '/particles',         icon: '助',  label: 'Điền trợ từ' },
      { href: '/kanji-readings',    icon: '読',  label: 'Kanji trong từ' },
      { href: '/grammar-srs',       icon: '文',  label: 'SRS ngữ pháp' },
      { href: '/srs',               icon: '🧠', label: 'SRS — Thẻ ghi nhớ' },
      { href: '/sentence-practice', icon: '✍️', label: 'Luyện câu AI' },
      { href: '/vocab/quiz',        icon: '㊒', label: 'TN từ vựng' },
      { href: '/kana/quiz',         icon: 'あ', label: 'TN Kana' },
      { href: '/kanji/quiz',        icon: '漢', label: 'TN Kanji' },
      { href: '/vocab-review',      icon: '🔄', label: 'Từ sai' },
      { href: '/quiz',              icon: '✏️', label: 'Quiz' },
      { href: '/mock-exam',         icon: '📋', label: 'Thi thử JLPT' },
      { href: '/jlpt',              icon: '🎯', label: 'Lộ trình JLPT' },
      { href: '/analytics',         icon: '📊', label: 'Tiến độ' },
    ],
  },
  {
    label: 'Công cụ',
    items: [
      { href: '/tools',          icon: '🎨', label: 'Canvas Tools' },
      { href: '/kanji-practice', icon: '✏️', label: 'Luyện viết Kanji' },
      { href: '/whiteboard',     icon: '🖊',  label: 'Bảng trắng' },
      { href: '/worksheet',      icon: '📄', label: 'Tạo bài tập' },
      { href: '/japan-map',      icon: '🗾', label: 'Bản đồ Nhật Bản' },
    ],
  },
  {
    label: 'Khác',
    items: [
      { href: '/community', icon: '👥', label: 'Cộng đồng' },
      { href: '/support',   icon: '💬', label: 'Hỗ trợ' },
      { href: '/pricing',   icon: '⚡', label: 'Nâng cấp' },
    ],
  },
] as const;

// ── Nav item ───────────────────────────────────────────────────────────────

const SIDEBAR_COLLAPSED_KEY = 'nihongo-sidebar-collapsed';
const NAV_GROUPS_COLLAPSED_KEY = 'nihongo-nav-groups-collapsed';

function NavItem({
  href,
  icon,
  label,
  exact,
  compact,
  onClick,
}: {
  href: string;
  icon: string;
  label: string;
  exact?: boolean;
  compact?: boolean;
  onClick?: () => void;
}) {
  const pathname = usePathname() ?? '';
  const isActive = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={`nav-item${isActive ? ' active' : ''}`}
      onClick={onClick}
      title={compact ? label : undefined}
    >
      <span className="nav-item__icon">{icon}</span>
      <span className="nav-item__label">{label}</span>
    </Link>
  );
}

// ── Theme toggle ───────────────────────────────────────────────────────────

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button className="theme-toggle" onClick={toggle} aria-label="Đổi chủ đề" title="Đổi chủ đề">
      {isDark ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <line x1="12" y1="2" x2="12" y2="4" />
          <line x1="12" y1="20" x2="12" y2="22" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="2" y1="12" x2="4" y2="12" />
          <line x1="20" y1="12" x2="22" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
      <span className="theme-toggle__label">{isDark ? 'Chế độ sáng' : 'Chế độ tối'}</span>
    </button>
  );
}

// ── Hamburger icon ─────────────────────────────────────────────────────────

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      {open ? (
        <>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </>
      ) : (
        <>
          <line x1="3" y1="7"  x2="21" y2="7" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="17" x2="21" y2="17" />
        </>
      )}
    </svg>
  );
}

// ── Layout ─────────────────────────────────────────────────────────────────

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
         aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18" />
      {collapsed
        ? <polyline points="14 8 18 12 14 16" />
        : <polyline points="16 8 12 12 16 16" />}
    </svg>
  );
}

export default function MainLayout({ children }: { children: ReactNode }) {
  const pathname  = usePathname() ?? '';
  const isAuth    = pathname === '/login' || pathname === '/profile';
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());
  const sidebarRef = useRef<HTMLElement>(null);
  const { theme } = useTheme();
  const { bannerUrl } = usePageBanner();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1');
    try {
      const raw = localStorage.getItem(NAV_GROUPS_COLLAPSED_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
        setCollapsedGroups(new Set(parsed));
      }
    } catch {
      /* ignore invalid storage */
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      return next;
    });
  }, []);

  const toggleGroup = useCallback((label: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      localStorage.setItem(NAV_GROUPS_COLLAPSED_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  // Close on route change
  useEffect(() => { close(); }, [pathname, close]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [close]);

  if (isAuth) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <main style={{ flex: 1 }}>{children}</main>
      </div>
    );
  }

  return (
    <div className={`app-container${collapsed ? ' sidebar-collapsed' : ''}`}>
      {/* Mobile hamburger */}
      <button
        className="sidebar-toggle"
        onClick={() => setOpen((p) => !p)}
        aria-label={open ? 'Đóng menu' : 'Mở menu'}
        aria-expanded={open}
      >
        <HamburgerIcon open={open} />
      </button>

      {/* Overlay */}
      <div
        className={`sidebar-overlay${open ? ' open' : ''}`}
        onClick={close}
        aria-hidden
      />

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={`app-sidebar${open ? ' open' : ''}${collapsed ? ' collapsed' : ''}`}
      >
        <div className="app-sidebar__header">
          <Link href="/" className="app-sidebar__logo" title={collapsed ? 'Nihongo' : undefined}>
            <div className="app-sidebar__logo-icon">🇯🇵</div>
            <div className="app-sidebar__brand">
              <div className="app-sidebar__logo-text">Nihongo</div>
              <div className="app-sidebar__logo-sub">Learn Japanese</div>
            </div>
          </Link>
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
            aria-pressed={collapsed}
            title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          >
            <CollapseIcon collapsed={collapsed} />
          </button>
        </div>

        {/* Nav */}
        <nav className="app-sidebar__nav" aria-label="Main navigation">
          {/* Home */}
          <NavItem href="/" icon="🏠" label="Trang chủ" exact compact={collapsed} onClick={close} />

          {NAV_GROUPS.map((group) => {
            const groupClosed = !collapsed && collapsedGroups.has(group.label);
            return (
              <div key={group.label} className={`nav-group${groupClosed ? ' is-collapsed' : ''}`}>
                <button
                  type="button"
                  className="nav-group__toggle"
                  onClick={() => toggleGroup(group.label)}
                  aria-expanded={!groupClosed}
                >
                  {group.label}
                  <span className="nav-group__chevron" aria-hidden>▾</span>
                </button>
                {!groupClosed && group.label === 'Giáo trình' && (
                  <TextbookNavItems compact={collapsed} onClick={close} />
                )}
                {!groupClosed && group.items.map((item) => (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    exact={item.href === '/vocab'}
                    compact={collapsed}
                    onClick={close}
                  />
                ))}
              </div>
            );
          })}
        </nav>

        {/* Bottom: theme toggle + auth */}
        <div className="app-sidebar__bottom">
          <ThemeToggle />
          <AuthHeader />
        </div>
      </aside>

      {/* Main content */}
      <div
        className={`app-content${bannerUrl ? ' app-content--custom-banner' : ''}`}
        style={bannerUrl ? bannerBackgroundStyle(bannerUrl, theme) : undefined}
      >
        <main className="app-main">{children}</main>
        <footer className="app-footer">
          <div className="container">
            <p>
              © {new Date().getFullYear()} Nihongo Learn ·{' '}
              <Link href="/admin/login">Admin</Link> ·{' '}
              <a href="/api/docs" target="_blank" rel="noreferrer">API</a>
            </p>
          </div>
        </footer>
        <PageBannerControl />
      </div>
    </div>
  );
}
