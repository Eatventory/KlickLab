import { useEffect, useState } from "react";
import {
  getToken,
  getExpiresAt,
  clearToken,
  setToken,
  isUsingLocalStorage,
} from "../../utils/storage";

const SessionTimer = () => {
  const [timeLeft, setTimeLeft] = useState(0);

  // 1초마다 갱신
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const interval = setInterval(() => {
      const expiresAt = getExpiresAt();
      const remaining = Math.max(0, expiresAt - Date.now());
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearToken();
        window.location.href = "/login";
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  const handleExtend = async () => {
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();

      if (data?.accessToken) {
        const isAutoLogin = isUsingLocalStorage();
        setToken(data.accessToken, 15 * 60 * 1000, isAutoLogin);
      } else {
        clearToken();
        window.location.href = "/login";
      }
    } catch (err) {
      console.error("세션 연장 실패:", err);
      clearToken();
      window.location.href = "/login";
    }
  };

  if (!getToken()) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        padding: "8px 12px",
        backgroundColor: "#111",
        color: "#fff",
        zIndex: 9999,
        borderBottomLeftRadius: "6px",
        fontSize: "14px",
      }}
    >
      세션 만료까지 {minutes}:{seconds.toString().padStart(2, "0")}
      <button
        onClick={handleExtend}
        style={{
          marginLeft: "8px",
          background: "#444",
          color: "white",
          border: "none",
          borderRadius: "4px",
          padding: "2px 8px",
          cursor: "pointer",
        }}
      >
        시간 연장
      </button>
    </div>
  );
};

export default SessionTimer;
