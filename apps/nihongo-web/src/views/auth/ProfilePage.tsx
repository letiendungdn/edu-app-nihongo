'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import PaymentMethodsSection from '@/components/PaymentMethodsSection';
import { ApiError } from '@/types/api';
import './AuthPages.css';

const JLPT_LEVELS = ['', 'N5', 'N4', 'N3', 'N2', 'N1'] as const;

export default function ProfilePage() {
  const { user, token, updateProfile, logout } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [nativeLanguage, setNativeLanguage] = useState('vi');
  const [targetJlptLevel, setTargetJlptLevel] = useState('');
  const [studyGoalMinutes, setStudyGoalMinutes] = useState(30);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useRequireAuth();

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? '');
    setAvatarUrl(user.avatarUrl ?? '');
    setNativeLanguage(user.nativeLanguage ?? 'vi');
    setTargetJlptLevel(user.targetJlptLevel ?? '');
    setStudyGoalMinutes(user.studyGoalMinutes ?? 30);
  }, [user]);

  if (!user) {
    return (
      <div className="profile-page">
        <div className="empty-state glass-panel">Đang tải hồ sơ...</div>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await updateProfile({
        name: name.trim() || undefined,
        avatarUrl: avatarUrl.trim() || null,
        nativeLanguage,
        targetJlptLevel: targetJlptLevel || null,
        studyGoalMinutes,
      });
      setSuccess('Đã cập nhật thông tin');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Cập nhật thất bại');
    } finally {
      setLoading(false);
    }
  };

  const initials = (user.name ?? user.email).slice(0, 1).toUpperCase();

  return (
    <div className="profile-page">
      <div className="profile-card glass-panel">
        <h1>Hồ sơ của bạn</h1>
        <p className="profile-meta">{user.email}</p>

        <div className="profile-badges">
          {user.isGoogleLinked && <span className="profile-badge">Google đã liên kết</span>}
          {user.hasPassword && <span className="profile-badge">Email + mật khẩu</span>}
          {user.role === 'ADMIN' && <span className="profile-badge">Admin</span>}
        </div>

        <div className="auth-user-chip" style={{ maxWidth: 'none' }}>
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt="" className="auth-avatar" />
          ) : (
            <span className="auth-avatar">{initials}</span>
          )}
          <span className="auth-user-name">{user.name ?? user.email}</span>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <p className="auth-error">{error}</p>}
          {success && <p className="auth-success">{success}</p>}

          <div className="auth-field">
            <label>
              Tên hiển thị
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
            </label>
          </div>

          <div className="auth-field">
            <label>
              Ảnh đại diện (URL)
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
              />
            </label>
          </div>

          <div className="auth-field">
            <label>
              Ngôn ngữ mẹ đẻ
              <select value={nativeLanguage} onChange={(e) => setNativeLanguage(e.target.value)}>
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
                <option value="ja">日本語</option>
              </select>
            </label>
          </div>

          <div className="auth-field">
            <label>
              Mục tiêu JLPT
              <select
                value={targetJlptLevel}
                onChange={(e) => setTargetJlptLevel(e.target.value)}
              >
                {JLPT_LEVELS.map((lv) => (
                  <option key={lv || 'none'} value={lv}>
                    {lv || 'Chưa chọn'}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="auth-field">
            <label>
              Mục tiêu học mỗi ngày (phút)
              <input
                type="number"
                min={5}
                max={480}
                value={studyGoalMinutes}
                onChange={(e) => setStudyGoalMinutes(Number(e.target.value))}
              />
            </label>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </form>

        <div className="profile-actions">
          <Link href="/payments" className="btn btn-outline">
            Lịch sử thanh toán
          </Link>
          <Link href="/" className="btn btn-outline">
            Về trang chủ
          </Link>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              void logout().then(() => router.push('/'));
            }}
          >
            Đăng xuất
          </button>
        </div>
      </div>

      {token && <PaymentMethodsSection token={token} />}
    </div>
  );
}
