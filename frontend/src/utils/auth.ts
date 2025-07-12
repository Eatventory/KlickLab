import { clearToken, setAutoLogin, getAutoLogin } from './storage';
import { useAuthStore } from '../store/useAuthStore';

// 세션 만료(자동 로그아웃): 자동 로그인 정보는 남김
export const clearTokenAndSessionLogout = () => {
  clearToken();
  if (getAutoLogin()) {
    useAuthStore.getState().setAuthState('expired');
    // 자동 로그인 ON: expired 상태로만 전환, 페이지 이동 없음
  } else {
    useAuthStore.getState().setAuthState('loggedOut');
    window.location.href = '/login';
  }
};

// 수동 로그아웃: 자동 로그인 정보까지 삭제
export const clearTokenAndFullLogout = () => {
  clearToken();
  setAutoLogin(false);
  useAuthStore.getState().setAuthState('loggedOut');
  window.location.href = '/login';
};