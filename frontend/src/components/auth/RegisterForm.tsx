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
        body: JSON.stringify({ email, password })
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
      <div className="w-full max-w-md p-8 rounded-2xl border border-black/10 bg-white/50 backdrop-blur-md shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] text-gray-800 text-center animate-fade-in">
        <h2 className="text-2xl font-semibold mb-4">회원가입 신청이 완료되었습니다.</h2>
        <p className="mb-6">관리자 승인 후 계정이 생성됩니다.</p>
        <a href="/" className="text-blue-600 hover:underline">확인</a>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md p-8 rounded-2xl border border-black/10 bg-white/50 backdrop-blur-md shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] text-gray-800 animate-fade-in">
      <h2 className="text-3xl font-bold text-center mb-4 tracking-tight">회원가입</h2>
      {error && <p className="text-red-600 mb-4 text-sm">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm mb-1">이메일</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 rounded-lg bg-white/80 placeholder-gray-500 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="이메일을 입력하세요"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-2 rounded-lg bg-white/80 placeholder-gray-500 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="비밀번호를 입력하세요"
          />
        </div>
        <button
          type="submit"
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold tracking-wide transition"
        >
          가입하기
        </button>
      </form>
      <p className="text-center text-gray-600 mt-6 text-sm">
        이미 계정이 있으신가요?{' '}
        <a href="/login" className="text-blue-600 hover:underline">로그인</a>
      </p>
    </div>
  );
}