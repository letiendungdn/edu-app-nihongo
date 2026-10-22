'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ADMIN_CONTENT_RESOURCES } from '@/config/adminResources';
import { AdminToastProvider } from '@/components/admin/AdminToast';

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const NAV: NavSection[] = [
  {
    title: 'Tổng quan',
    items: [
      { href: '/admin', label: 'Dashboard', icon: '▦' },
    ],
  },
  {
    title: 'Nội dung',
    items: ADMIN_CONTENT_RESOURCES.map((r) => ({ href: r.href, label: r.title, icon: r.icon })),
  },
  {
    title: 'Quản lý',
    items: [
      { href: '/admin/payments', label: 'Thanh toán', icon: '💳' },
      { href: '/admin/insights', label: 'Học viên sắp bỏ học', icon: '📉' },
      { href: '/admin/messages', label: 'Tin nhắn hỗ trợ', icon: '💬' },
      { href: '/admin/import', label: 'Import từ vựng', icon: '📥' },
    ],
  },
  {
    title: 'Email',
    items: [
      { href: '/admin/email-templates', label: 'Email Templates', icon: '✉️' },
      { href: '/admin/email-broadcasts', label: 'Lịch sử gửi', icon: '📊' },
    ],
  },
  {
    title: 'Canvas Tools',
    items: [
      { href: '/admin/flashcard-editor', label: 'Flashcard Editor', icon: '🃏' },
      { href: '/admin/worksheet', label: 'Worksheet Generator', icon: '📄' },
      { href: '/admin/certificate', label: 'Certificate Generator', icon: '🏆' },
    ],
  },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.replace('/admin/login');
  }

  function isActive(href: string) {
    if (!pathname) return false;
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  }

  return (
    <AdminToastProvider>
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-color)' }}>
      {/* Sidebar */}
      <aside style={{
        width: 230,
        flexShrink: 0,
        background: 'var(--surface-color)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            Nihongo EDU
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Admin Panel</div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {NAV.map((section) => (
            <div key={section.title}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                color: 'var(--text-secondary)', textTransform: 'uppercase',
                padding: '0 8px', marginBottom: 4,
              }}>
                {section.title}
              </div>
              {section.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link key={item.href} href={item.href} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 10px', borderRadius: 8, marginBottom: 1,
                    textDecoration: 'none', fontSize: 13, fontWeight: active ? 600 : 400,
                    color: active ? 'var(--primary-color)' : 'var(--text-primary)',
                    background: active ? 'rgba(var(--primary-rgb, 99,102,241), 0.12)' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                    onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                    onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <span style={{ fontSize: 15, width: 20, textAlign: 'center' }}>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.name ?? user?.email ?? 'Admin'}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Link href="/" style={{
              flex: 1, textAlign: 'center', padding: '5px 8px', borderRadius: 6,
              border: '1px solid var(--border-color)', fontSize: 12,
              color: 'var(--text-secondary)', textDecoration: 'none',
            }}>
              ← App
            </Link>
            <button onClick={handleLogout} style={{
              flex: 1, padding: '5px 8px', borderRadius: 6,
              border: '1px solid var(--border-color)', fontSize: 12,
              color: 'var(--text-secondary)', background: 'transparent', cursor: 'pointer',
            }}>
              Đăng xuất
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
        {children}
      </main>
    </div>
    </AdminToastProvider>
  );
}
