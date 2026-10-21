import axios from 'axios';
import {Platform} from 'react-native';
import {useAuthStore} from '../store/authStore';

// Gateway chạy ở cổng 3000 (bản cũ ghi 3001: không có gì lắng nghe). 10.0.2.2 là máy host, chỉ có
// trên emulator Android; simulator iOS dùng localhost.
export const API_BASE_URL = __DEV__
  ? Platform.OS === 'android'
    ? 'http://10.0.2.2:3000/api'
    : 'http://localhost:3000/api'
  : 'https://api.nihongo.app/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {'Content-Type': 'application/json'},
});

// Attach token to every request
api.interceptors.request.use(config => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401 — mutex pattern (no duplicate refresh)
let refreshPromise: Promise<void> | null = null;

api.interceptors.response.use(
  res => res,
  async error => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }
    original._retry = true;

    if (!refreshPromise) {
      refreshPromise = useAuthStore
        .getState()
        .refresh()
        .finally(() => {
          refreshPromise = null;
        });
    }

    try {
      await refreshPromise;
      return api(original);
    } catch {
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }
  },
);
