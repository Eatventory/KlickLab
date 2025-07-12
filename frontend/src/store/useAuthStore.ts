import { create } from 'zustand';

type AuthState = 'loggedIn' | 'loggedOut' | 'checking' | 'expired';

interface AuthStore {
  authState: AuthState;
  setAuthState: (state: AuthState) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  authState: 'checking',
  setAuthState: (state) => set({ authState: state }),
}));
