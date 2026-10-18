'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  login as apiLogin,
  loginWithGoogle as apiGoogleLogin,
  loginWithOidc as apiOidcLogin,
  logoutAuth,
  register as apiRegister,
  updateProfile as apiUpdateProfile,
} from '../api';
import {
  getStoredToken,
  setStoredToken,
  subscribeAuthToken,
} from '../lib/api-client';
import { signoutKeycloak } from '../lib/keycloak';
import { queryKeys, useAuthMeQuery } from '../hooks/queries';
import { adoptGuestMistakes, pullFromServer } from '../utils/mistakeVocab';
import type { AuthUser, LoginResponse, UpdateProfileInput } from '../types/api';
import { AuthContext } from './auth-context';

function applySession(
  res: LoginResponse,
  setToken: (t: string) => void,
  setUser: (u: AuthUser) => void,
  queryClient: ReturnType<typeof useQueryClient>,
) {
  // Cache chứa dữ liệu riêng của người trước (phòng chat, hỗ trợ, admin…): bỏ hết
  queryClient.clear();
  setStoredToken(res.access_token);
  setToken(res.access_token);
  setUser(res.user);
  queryClient.setQueryData(queryKeys.authMe, res.user);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const { data: me } = useAuthMeQuery(!!token);

  useEffect(() => {
    setToken(getStoredToken());
    setAuthReady(true);
  }, []);

  useEffect(() => {
    return subscribeAuthToken((next) => {
      setToken(next);
      if (!next) {
        // Đăng xuất hoặc phiên hết hạn (refresh bị từ chối): không để dữ liệu riêng lại trong cache
        setUser(null);
        queryClient.clear();
      }
    });
  }, [queryClient]);

  // Có người dùng mới: gộp từ sai lúc còn là khách, rồi kéo kho ôn tập từ server (máy khác đã ôn)
  const userId = user?.id ?? null;
  useEffect(() => {
    if (userId == null) return;
    adoptGuestMistakes();
    void pullFromServer().then(() =>
      queryClient.invalidateQueries({ queryKey: queryKeys.vocab.review() }),
    );
  }, [userId, queryClient]);

  useEffect(() => {
    if (me) setUser(me);
    if (!token) setUser(null);
  }, [me, token]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiLogin(email, password);
      applySession(res, setToken, setUser, queryClient);
      return res.user;
    },
    [queryClient],
  );

  const loginAdmin = useCallback(
    async (email: string, password: string) => {
      const res = await apiLogin(email, password);
      if (res.user.role !== 'ADMIN') {
        throw new Error('Tài khoản không có quyền admin');
      }
      applySession(res, setToken, setUser, queryClient);
      return res.user;
    },
    [queryClient],
  );

  const loginWithGoogle = useCallback(
    async (credential: string) => {
      const res = await apiGoogleLogin(credential);
      applySession(res, setToken, setUser, queryClient);
      return res.user;
    },
    [queryClient],
  );

  const loginWithOidc = useCallback(
    async (accessToken: string, idToken?: string) => {
      const res = await apiOidcLogin(accessToken, idToken);
      applySession(res, setToken, setUser, queryClient);
      return res.user;
    },
    [queryClient],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      const res = await apiRegister(email, password);
      applySession(res, setToken, setUser, queryClient);
      return res.user;
    },
    [queryClient],
  );

  const updateProfile = useCallback(
    async (data: UpdateProfileInput) => {
      const current = getStoredToken();
      if (!current) throw new Error('Chưa đăng nhập');
      const updated = await apiUpdateProfile(current, data);
      setUser(updated);
      queryClient.setQueryData(queryKeys.authMe, updated);
      return updated;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    const current = getStoredToken();
    if (current) {
      try {
        await logoutAuth(current);
      } catch {
        // vẫn xóa session local nếu API lỗi
      }
    }
    setStoredToken(null);
    setToken(null);
    setUser(null);
    // Bản cũ chỉ xóa authMe + adminStats: người đăng nhập sau thấy phòng chat, hỗ trợ… của người trước
    queryClient.clear();

    // End Keycloak SSO session (front-channel) if OIDC user still in sessionStorage
    const redirected = await signoutKeycloak();
    if (redirected) return;
  }, [queryClient]);

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: !!token,
      authReady,
      isAdmin: user?.role === 'ADMIN',
      isTeacher: user?.role === 'TEACHER' || user?.role === 'ADMIN',
      login,
      loginAdmin,
      loginWithGoogle,
      loginWithOidc,
      register,
      updateProfile,
      logout,
    }),
    [
      token,
      user,
      authReady,
      login,
      loginAdmin,
      loginWithGoogle,
      loginWithOidc,
      register,
      updateProfile,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
