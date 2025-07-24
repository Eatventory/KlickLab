import { useState, useEffect } from "react";
import { getToken, getExpiresAt, setToken, isUsingLocalStorage, getAutoLogin } from "../../utils/storage";
import { useAuthStore } from "../../store/useAuthStore";
import { clearTokenAndFullLogout } from "../../utils/auth";
import logo from '../../assets/klicklab.png';

export default function HeaderBar() {
  const authState = useAuthStore((s) => s.authState);
  const setAuthState = useAuthStore((s) => s.setAuthState);
  const [timeLeft, setTimeLeft] = useState(() => {
    const expiresAt = getExpiresAt();
    return Math.max(0, expiresAt - Date.now());
  });

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
    <div className="fixed top-0 left-0 w-full h-16 bg-white border-b flex flex-col sm:flex-row items-center justify-between px-6 gap-4 z-40 relative">
      {/* 클릭랩 로고 */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
        <img src={logo} className="h-6 sm:h-8 w-auto" />
      </div>

      {/* 로그인 관리 */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 sm:gap-4">
        <span className="text-gray-800 text-sm font-medium py-1 whitespace-nowrap">
          <span className="hidden sm:inline">세션 만료까지 </span>
          {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
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