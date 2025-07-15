import { useState, useEffect } from "react";
import { getToken, getExpiresAt, setToken, isUsingLocalStorage, getAutoLogin } from "../../utils/storage";
import { useAuthStore } from "../../store/useAuthStore";
import { clearTokenAndSessionLogout, clearTokenAndFullLogout } from "../../utils/auth";

export default function SessionTimer() {
  const authState = useAuthStore((s) => s.authState);
  const setAuthState = useAuthStore((s) => s.setAuthState);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isOpen, setIsOpen] = useState(true);

  // 수동 로그아웃 버튼
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
        // 자동로그인 토글 여부에 따라 분기
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

  // expired 상태에서만 안내 메시지와 연장 버튼만 보여줌
  if (authState === 'expired') {
    return (
      <div className="fixed top-4 right-0 z-50 flex items-center bg-white border rounded-l-xl shadow-lg overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2">
          <span className="text-red-600 text-sm font-medium whitespace-nowrap">
            세션이 만료되었습니다. 아무거나 클릭하면 세션을 연장합니다.
          </span>
          <button
            onClick={handleExtend}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded-md whitespace-nowrap"
          >
            세션 연장
          </button>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-gray-500 underline text-sm px-3 py-1 rounded-md whitespace-nowrap"
          >
            로그아웃
          </button>
        </div>
      </div>
    );
  }

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
