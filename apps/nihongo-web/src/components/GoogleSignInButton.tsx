'use client';

import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/types/api';

type GoogleSignInButtonProps = {
  mode?: 'login' | 'register';
  onError?: (message: string) => void;
  onSuccess?: (role: string) => void;
};

export default function GoogleSignInButton({
  mode = 'login',
  onError,
  onSuccess,
}: GoogleSignInButtonProps) {
  const { loginWithGoogle } = useAuth();
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!clientId) {
    if (process.env.NODE_ENV !== 'development') return null;
    return (
      <p className="auth-google-hint">
        <strong>Đăng ký bằng Gmail</strong> chưa bật. Thêm <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> vào{' '}
        <code>apps/nihongo-web/.env</code> (dev) hoặc rebuild Docker với{' '}
        <code>docker compose build --no-cache nihongo-web</code>.
      </p>
    );
  }

  const googleText = mode === 'register' ? 'signup_with' : 'continue_with';

  return (
    <div className="auth-google-wrap">
      <GoogleLogin
        onSuccess={async (res) => {
          if (!res.credential) {
            onError?.('Không nhận được token từ Google');
            return;
          }
          try {
            const authUser = await loginWithGoogle(res.credential);
            onSuccess?.(authUser.role);
          } catch (err) {
            onError?.(
              err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Google đăng nhập thất bại',
            );
          }
        }}
        onError={() => onError?.('Google đăng nhập bị hủy hoặc lỗi')}
        text={googleText}
        shape="rectangular"
        theme="outline"
        size="large"
        width="360"
      />
    </div>
  );
}
