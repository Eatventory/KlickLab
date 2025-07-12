import { useState, useEffect } from "react";
import { getToken, getExpiresAt, setToken, isUsingLocalStorage } from "../../utils/storage";
import { useAuthStore } from "../../store/useAuthStore";
import { clearTokenAndLogout } from "../../utils/auth";

export default function SessionTimer() {
  const authState = useAuthStore((s) => s.authState);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isOpen, setIsOpen] = useState(true);

  const handleLogout = () => {
    fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    }).finally(() => {
      clearTokenAndLogout();
    });
  };

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const interval = setInterval(() => {
      const expiresAt = getExpiresAt();
      const remaining = Math.max(0, expiresAt - Date.now());
      setTimeLeft(remaining);

      if (remaining <= 0) handleLogout();
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (authState !== "loggedIn") return null;

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
    } else {
      handleLogout();
    }
  };

  return (
    <div
      className={`fixed top-4 right-0 z-50 flex items-center border rounded-l-xl shadow-lg overflow-hidden
        ${timeLeft <= 60000 ? 'bg-red-400' : 'bg-white'}`}
    >
      {/* 접기 버튼 */}
      {isOpen && (
        <button
          onClick={() => setIsOpen(false)}
          className="px-2 py-2 text-gray-500 hover:text-gray-700 text-sm"
        >
          ⬅
        </button>
      )}

      {/* 슬라이딩 콘텐츠 */}
      <div
        className={`transition-all duration-300 flex items-center gap-2 justify-between ${
          isOpen
            ? "w-[340px] opacity-100 px-4 py-2"
            : "w-0 opacity-0 px-0 py-0 overflow-hidden"
        }`}
      >
        <span className="text-gray-800 text-sm font-medium whitespace-nowrap w-[100px] text-right">
          세션 만료까지 {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
        </span>
        <div className="flex gap-2">
          <button
            onClick={handleExtend}
            className={`text-white text-sm px-3 py-1 rounded-md whitespace-nowrap
              ${timeLeft <= 60000 ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            시간 연장
          </button>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-gray-500 underline text-sm px-3 py-1 rounded-md whitespace-nowrap"
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* 펼치기 버튼 */}
      {!isOpen && (
        <>
          <button
            onClick={() => setIsOpen(true)}
            className="px-2 py-2 text-gray-500 hover:text-gray-700 text-sm"
          >
            ➡
          </button>
          <span className="text-gray-800 text-sm font-medium whitespace-nowrap w-[50px] text-center">
            {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
          </span>
        </>
      )}
    </div>
  );
}
