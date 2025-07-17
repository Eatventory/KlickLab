const TOKEN_KEY = "klicklab_token";
const EXPIRES_KEY = "klicklab_expiresAt";
const AUTO_LOGIN_KEY = "klicklab_autoLogin";
const CREDENTIALS_KEY = "klicklab_credentials";

// 자동 로그인 여부에 따라 저장소 결정
const getStorage = (isAutoLogin: boolean): Storage =>
  isAutoLogin ? localStorage : sessionStorage;

// 저장소에 accessToken과 만료 시각 저장
export const setToken = (
  token: string,
  expiresInMs: number,
  isAutoLogin: boolean
) => {
  const storage = getStorage(isAutoLogin);
  const expiresAt = Date.now() + expiresInMs;

  storage.setItem(TOKEN_KEY, token);
  storage.setItem(EXPIRES_KEY, String(expiresAt));
};

// 저장된 accessToken을 가져옴 (로컬 → 세션 순서)
export const getToken = (): string | null =>
  localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);

// 저장된 만료 시각을 가져옴 (로컬 → 세션 순서)
export const getExpiresAt = (): number =>
  Number(localStorage.getItem(EXPIRES_KEY)) ||
  Number(sessionStorage.getItem(EXPIRES_KEY)) ||
  0;

// 저장된 토큰과 만료 시각 삭제 (양쪽 다 삭제)
export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRES_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(EXPIRES_KEY);
};

// 현재 저장소가 local인지 session인지 확인
export const isUsingLocalStorage = (): boolean =>
  !!localStorage.getItem(TOKEN_KEY);

// 자동 로그인 설정 저장
export const setAutoLogin = (enabled: boolean, credentials?: { email: string; password: string }) => {
  localStorage.setItem(AUTO_LOGIN_KEY, String(enabled));
  if (enabled && credentials) {
    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
  } else if (!enabled) {
    localStorage.removeItem(CREDENTIALS_KEY);
  }
};

// 자동 로그인 설정 가져오기
export const getAutoLogin = (): boolean => {
  return localStorage.getItem(AUTO_LOGIN_KEY) === 'true';
};

// 저장된 자격 증명 가져오기
export const getSavedCredentials = (): { email: string; password: string } | null => {
  const saved = localStorage.getItem(CREDENTIALS_KEY);
  return saved ? JSON.parse(saved) : null;
};

// 자동 로그인 시도
export const attemptAutoLogin = async (): Promise<boolean> => {
  if (!getAutoLogin()) return false;
  
  const credentials = getSavedCredentials();
  if (!credentials) return false;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(credentials),
    });

    if (res.ok) {
      const { accessToken } = await res.json();
      setToken(accessToken, 150 * 60 * 1000, true); // 자동 로그인이므로 localStorage 사용
      return true;
    }
  } catch (error) {
    console.error('Auto login failed:', error);
  }

  return false;
};
