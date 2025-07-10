import { clearToken } from './storage';
import { useAuthStore } from '../store/useAuthStore';

export const clearTokenAndLogout = () => {
  clearToken();
  useAuthStore.getState().setAuthState('loggedOut');
  window.location.href = '/login';
};