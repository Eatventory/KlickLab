import { useState } from 'react';
import { motion } from 'framer-motion';
import './AuthForm.css';

export default function AuthForm() {
  const [isFlipped, setIsFlipped] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error((await res.json()).message || '로그인 실패');
      const { accessToken } = await res.json();
      (remember ? localStorage : sessionStorage).setItem('klicklab_token', accessToken);
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error((await res.json()).message || '회원가입 실패');
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="perspective w-[400px] h-[400px]">
        <motion.div
          className="relative w-full h-full duration-700 preserve-3d"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.4, ease: "linear" }}
        >
          {/* 로그인 */}
          <div className="auth-card front">
            <h2 className="text-2xl font-semibold text-center mb-2">로그인</h2>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 bg-gray-100 rounded-lg"
                placeholder="이메일"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 bg-gray-100 rounded-lg"
                placeholder="비밀번호"
              />
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={() => setRemember(!remember)}
                  className="mr-2"
                />
                <label>자동 로그인</label>
              </div>
              <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-lg">
                로그인
              </button>
            </form>
            <p className="text-center text-gray-500 mt-6">
              계정이 없으신가요?{' '}
              <button
                className="text-blue-600 hover:underline"
                onClick={() => {
                  setIsFlipped(true);
                  setError(null);
                }}
              >
                회원가입
              </button>
            </p>
          </div>

          {/* 회원가입 */}
          <div className="auth-card back">
            {success ? (
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-4">회원가입 완료!</h2>
                <p className="mb-6">이메일을 확인 후 로그인해 주세요.</p>
                <button
                  onClick={() => {
                    setSuccess(false);
                    setIsFlipped(false);
                    setEmail('');
                    setPassword('');
                  }}
                  className="text-blue-600 hover:underline"
                >
                  로그인하러 가기
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-semibold text-center mb-2">회원가입</h2>
                {error && <p className="text-red-500 mb-4">{error}</p>}
                <form onSubmit={handleRegister} className="space-y-4">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-gray-100 rounded-lg"
                    placeholder="이메일"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-gray-100 rounded-lg"
                    placeholder="비밀번호"
                  />
                  <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-lg">
                    가입하기
                  </button>
                </form>
                <p className="text-center text-gray-500 mt-6">
                  이미 계정이 있으신가요?{' '}
                  <button
                    className="text-blue-600 hover:underline"
                    onClick={() => {
                      setIsFlipped(false);
                      setError(null);
                    }}
                  >
                    로그인
                  </button>
                </p>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
