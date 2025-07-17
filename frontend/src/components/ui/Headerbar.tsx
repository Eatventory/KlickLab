import { useState, useEffect } from "react";
import { getToken, getExpiresAt, setToken, isUsingLocalStorage, getAutoLogin } from "../../utils/storage";
import { useAuthStore } from "../../store/useAuthStore";
import { clearTokenAndFullLogout } from "../../utils/auth";
import logo from '../../assets/klicklab.svg';

export default function HeaderBar() {
  const authState = useAuthStore((s) => s.authState);
  const setAuthState = useAuthStore((s) => s.setAuthState);
  const [timeLeft, setTimeLeft] = useState(0);

  const handleLogout = () => {
    fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    }).finally(() => {
      clearTokenAndFullLogout();
    });
  };

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const interval = setInterval(() => {
      const expiresAt = getExpiresAt();
      const remaining = Math.max(0, expiresAt - Date.now());
      setTimeLeft(remaining);

      if (remaining <= 0 && authState === 'loggedIn') {
        if (getAutoLogin()) {
          setAuthState('expired');
        } else {
          setAuthState('loggedOut');
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [authState, setAuthState]);

  if (authState !== "loggedIn" && authState !== "expired") return null;

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  const handleExtend = async () => {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json();

    if (data?.accessToken) {
      const isAuto = isUsingLocalStorage();
      setToken(data.accessToken, 15 * 60 * 1000, isAuto);
      setAuthState('loggedIn');
    } else {
      handleLogout();
    }
  };

  return (
    <div className="fixed top-0 left-0 w-full h-16 bg-white border-b flex items-center justify-between px-6 gap-4 z-40">
      {/* 타이틀 */}
      <div className="flex items-center gap-2">
        <div className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200">
          <img src={logo} className="w-6 h-6" />
        </div>
        <div>
          <span className="font-bold text-lg text-blue-600 hover:text-blue-700">Klick</span><span className="font-bold text-lg text-gray-900">Lab</span>
        </div>
      </div>

      {/* 로그인 관리 */}
      <div className="flex gap-4">
        <span className="text-gray-800 text-sm font-medium py-1 whitespace-nowrap">
          세션 만료까지 {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
        </span>
        <button
          onClick={handleExtend}
          className={`text-white text-sm px-3 py-1 rounded-md whitespace-nowrap
            ${timeLeft <= 60000 ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          시간 연장
        </button>
        <button
          onClick={handleLogout}
          className="text-gray-400 hover:text-gray-500 underline text-sm py-1 rounded-md whitespace-nowrap"
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}