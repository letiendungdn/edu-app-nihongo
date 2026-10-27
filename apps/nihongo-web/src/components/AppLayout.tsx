'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import AuthHeader from '@/components/AuthHeader';
import TextbookNavItems from '@/components/TextbookNavItems';
import PageBannerControl from '@/components/PageBannerControl';
import { useTheme } from '@/lib/theme';
import { bannerBackgroundStyle } from '@/utils/pageBanner';
import { usePageBanner } from '@/hooks/usePageBanner';
import { NAV_GROUPS } from '@/config/nav';

/** Bỏ dấu để gõ "tu vung" vẫn ra "Từ vựng". */
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function isActivePath(pathname: string, href: string, exact?: boolean): boolean {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function SearchIcon() {
  return (
    <svg className="nav-search__icon" width="14" height="14" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" />
    </svg>
  );
}

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
  const isActive = isActivePath(pathname, href, exact);

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
    <button
      className="theme-toggle"
      onClick={toggle}
      aria-label="Chế độ tối"
      aria-pressed={isDark}
      title="Đổi chủ đề"
    >
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
      <span className="theme-toggle__label">Chế độ tối/sáng</span>
      <span className={`theme-toggle__switch${isDark ? ' is-on' : ''}`} aria-hidden="true" />
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
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
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
  useEffect(() => { close(); setQuery(''); }, [pathname, close]);

  // Phím "/" để tìm mục (trừ khi đang gõ trong ô nhập khác)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      e.preventDefault();
      setOpen(true);
      searchRef.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const q = fold(query.trim());
  const visibleGroups = useMemo(
    () =>
      NAV_GROUPS.map((group) => ({
        ...group,
        items: q ? group.items.filter((item) => fold(item.label).includes(q)) : group.items,
      })).filter((group) => !q || group.items.length > 0),
    [q],
  );

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
            <img className="app-sidebar__logo-icon app-sidebar__logo-img" src="/logo-128.png" alt="" aria-hidden width={36} height={36} />
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

        <div className="nav-search">
          <SearchIcon />
          <input
            ref={searchRef}
            type="search"
            className="nav-search__input"
            placeholder="Tìm mục…"
            aria-label="Tìm mục trong menu"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setQuery('');
                e.currentTarget.blur();
              }
            }}
          />
          {!query && <kbd className="nav-search__kbd">/</kbd>}
        </div>

        {/* Nav */}
        <nav className="app-sidebar__nav" aria-label="Main navigation">
          {/* Home */}
          {!q && <NavItem href="/" icon="家" label="Trang chủ" exact compact={collapsed} onClick={close} />}

          {q && visibleGroups.length === 0 && <p className="nav-empty">Không có mục nào khớp “{query}”.</p>}

          {visibleGroups.map((group) => {
            // Đang tìm hoặc nhóm chứa trang hiện tại thì luôn mở
            const hasActive = group.items.some((item) => isActivePath(pathname, item.href, item.href === '/vocab'));
            const groupClosed = !collapsed && !q && !hasActive && collapsedGroups.has(group.label);
            return (
              <div key={group.label} className={`nav-group${groupClosed ? ' is-collapsed' : ''}`}>
                <button
                  type="button"
                  className="nav-group__toggle"
                  onClick={() => toggleGroup(group.label)}
                  aria-expanded={!groupClosed}
                >
                  {group.label}
                  {groupClosed && <span className="nav-group__count">{group.items.length}</span>}
                  <span className="nav-group__chevron" aria-hidden>▾</span>
                </button>
                {!groupClosed && !q && group.label === 'Giáo trình' && (
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
