import { create } from 'zustand';

type AuthState = 'loggedIn' | 'loggedOut' | 'checking';

interface AuthStore {
  authState: AuthState;
  setAuthState: (state: AuthState) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  authState: 'checking',
  setAuthState: (state) => set({ authState: state }),
}));
