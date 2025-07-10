import { useState } from 'react';

export default function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || '회원가입에 실패했습니다.');
    }
    setSuccess(true);
  } catch (err: any) {
    setError(err.message);
  }
  };

  if (success) {
  return (
    <div className="max-w-md mx-auto mt-16 bg-white rounded-2xl shadow-lg p-8 text-center">
    <h2 className="text-2xl font-semibold mb-4">회원가입 완료!</h2>
    <p className="mb-6">이메일을 확인 후 로그인해 주세요.</p>
    <a href="/login" className="text-blue-600 hover:underline">로그인하러 가기</a>
    </div>
  );
  }

  return (
  <div className="max-w-md mx-auto mt-16 bg-white rounded-2xl shadow-lg p-8">
    <h2 className="text-2xl font-semibold text-center mb-2">회원가입</h2>
    {error && <p className="text-red-500 mb-4">{error}</p>}
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex justify-between items-center">
        <label className="block text-gray-700 mb-1">이메일</label>
      </div>
      <input
      type="email"
      value={email}
      onChange={e => setEmail(e.target.value)}
      required
      className="w-full px-4 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
      placeholder="yourname@example.com"
      />
      <div className="flex justify-between items-center">
        <label className="block text-gray-700 mb-1">비밀번호</label>
      </div>
      <input
      type="password"
      value={password}
      onChange={e => setPassword(e.target.value)}
      required
      minLength={6}
      className="w-full px-4 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
      placeholder="••••••••"
      />
    <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">
      가입하기
    </button>
    </form>
    <p className="text-center text-gray-500 mt-6">
    이미 계정이 있으신가요?{' '}
    <a href="/login" className="text-blue-600 hover:underline">로그인</a>
    </p>
  </div>
  );
}