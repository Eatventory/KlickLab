const TOKEN_KEY = "klicklab_token";
const EXPIRES_KEY = "klicklab_expiresAt";

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
