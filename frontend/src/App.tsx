import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Dashboard } from './components/dashboard/Dashboard';
import { useAuthStore } from './store/useAuthStore';
import { setToken, attemptAutoLogin, isUsingLocalStorage } from './utils/storage';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import ErrorPage from "./Error";
import './App.css';
import { ConversionEventProvider } from './context/ConversionEventContext';
import { SegmentFilterProvider } from './context/SegmentFilterContext';

function AppRoutesWithProviders({ authState }: { authState: string }) {
  return (
    <div className="App relative">
      <div
        style={{
          filter: authState === 'expired' ? 'blur(4px)' : 'none',
          pointerEvents: authState === 'expired' ? 'none' : 'auto',
          minHeight: '100vh',
        }}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard/*" element={<Dashboard />} />
          <Route path="/login" element={<Navigate to="/dashboard" />} />
          <Route path="/register" element={<Navigate to="/dashboard" />} />
          <Route path="*" element={<ErrorPage />} />
        </Routes>
      </div>
      {authState === 'expired' && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl p-8 flex flex-col items-center gap-4 border border-gray-200">
            <div className="text-lg font-semibold text-red-600 mb-2">세션이 만료되었습니다</div>
            <div className="text-gray-700 mb-2">보안을 위해 화면이 잠겼습니다.</div>
            <div className="text-gray-500">행동이 감지되면 세션을 연장합니다.</div>
          </div>
        </div>
      )}
    </div>
  );
}

function AppRoutesWithoutProviders() {
  return (
    <div className="App">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  const setAuthState = useAuthStore((s) => s.setAuthState);
  const authState = useAuthStore((s) => s.authState);

  // 세션 만료 후 아무 액션 시 세션 연장 시도
  useEffect(() => {
    if (authState !== 'expired') return;

    let extended = false;
    const handleExtend = async () => {
      if (extended) return;
      extended = true;
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
        setAuthState('loggedOut');
      }
    };

    const onUserAction = () => {
      handleExtend();
    };
    window.addEventListener('click', onUserAction);
    window.addEventListener('keydown', onUserAction);
    window.addEventListener('mousemove', onUserAction);
    return () => {
      window.removeEventListener('click', onUserAction);
      window.removeEventListener('keydown', onUserAction);
      window.removeEventListener('mousemove', onUserAction);
    };
  }, [authState, setAuthState]);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // 1. 먼저 refresh token으로 로그인 시도
        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });
        const data = await res.json();

        if (data?.accessToken) {
          const isAuto = !!localStorage.getItem("klicklab_expiresAt");
          setToken(data.accessToken, 15 * 60 * 1000, isAuto);
          setAuthState("loggedIn");
          return;
        }

        // 2. refresh token이 없으면 자동 로그인 시도
        const autoLoginSuccess = await attemptAutoLogin();
        if (autoLoginSuccess) {
          setAuthState("loggedIn");
          return;
        }

        // 3. 둘 다 실패하면 로그아웃 상태
        setAuthState("loggedOut");
      } catch (error) {
        console.error('Auth initialization failed:', error);
        setAuthState("loggedOut");
      }
    };

    initializeAuth();
  }, [setAuthState]);
  
  if (authState === 'checking') {
    return;
  }

  return (
    <BrowserRouter>
      {authState === 'loggedIn' || authState === 'expired' ? (
        <ConversionEventProvider>
          <SegmentFilterProvider>
            <AppRoutesWithProviders authState={authState} />
          </SegmentFilterProvider>
        </ConversionEventProvider>
      ) : (
        <AppRoutesWithoutProviders authState={authState} />
      )}
    </BrowserRouter>
  );
}

export default App;
