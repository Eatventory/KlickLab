import { useState, useEffect } from "react";
import { setToken, setAutoLogin, getAutoLogin, getSavedCredentials } from '../../utils/storage';
import { useAuthStore } from '../../store/useAuthStore';

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const setAuthState = useAuthStore((s) => s.setAuthState);

  // 컴포넌트 마운트 시 저장된 자동 로그인 정보 복원
  useEffect(() => {
    const savedAutoLogin = getAutoLogin();
    if (savedAutoLogin) {
      setRemember(true);
      const savedCredentials = getSavedCredentials();
      if (savedCredentials) {
        setEmail(savedCredentials.email);
        setPassword(savedCredentials.password);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // refreshToken 쿠키 받기
        body: JSON.stringify({ email, password }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || '로그인에 실패했습니다.');
      }
      
      const { accessToken } = await res.json();
      setToken(accessToken, 15 * 60 * 1000, remember); // 토큰 + 만료시각 저장 (15분 후)
      
      // 자동 로그인 설정 저장
      if (remember) {
        setAutoLogin(true, { email, password });
      } else {
        setAutoLogin(false);
      }
      
      setAuthState("loggedIn");
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 bg-white rounded-2xl shadow-lg p-8">
      <h2 className="text-2xl font-semibold text-center mb-2">
        로그인
      </h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="block text-gray-700 mb-1">이메일</label>
        </div>
        <div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="yourname@example.com"
          />
        </div>
        <div className="flex justify-between items-center">
          <label className="block text-gray-700 mb-1">비밀번호</label>
        </div>
        <div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="••••••••"
          />
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="remember"
            checked={remember}
            onChange={() => setRemember(!remember)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="remember" className="ml-2 text-gray-700">
            자동 로그인
          </label>
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:bg-blue-400 disabled:cursor-not-allowed"
        >
          {isLoading ? '로그인 중...' : '로그인'}
        </button>
      </form>
      <p className="text-center text-gray-500 mt-6">
        아직 계정이 없으신가요?{" "}
        <a href="/register" className="text-blue-600 hover:underline">
          회원가입하기
        </a>
      </p>
    </div>
  );
}
