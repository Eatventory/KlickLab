import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './components/dashboard/Dashboard';
import { useAuthStore } from './store/useAuthStore';
import { setToken } from './utils/storage';
import SessionTimer from './components/ui/SessionTimer';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import ErrorPage from "./Error";
import './App.css';

function App() {
  const setAuthState = useAuthStore((s) => s.setAuthState);
  useEffect(() => {
    const refreshAccessToken = async () => {
      try {
        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });
        const data = await res.json();

        if (data?.accessToken) {
          const isAuto = !!localStorage.getItem("klicklab_expiresAt");
          setToken(data.accessToken, 15 * 60 * 1000, isAuto);
          setAuthState("loggedIn");
        } else {
          throw new Error("토큰 없음");
        }
      } catch {
        setAuthState("loggedOut");
      }
    };

    refreshAccessToken();
  }, [setAuthState]);
  
  const authState = useAuthStore((s) => s.authState);
  if (authState === 'checking') {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="App">
      <SessionTimer />
      <Router>
        <Routes>
          <Route
            path="/login"
            element={ authState !== 'loggedIn' ? <LoginForm /> : <Navigate to="/" /> }
          />
          <Route
            path="/register"
            element={ authState !== 'loggedIn' ? <RegisterForm /> : <Navigate to="/" /> }
          />
          <Route
            path="/"
            element={ authState === 'loggedIn' ? <Dashboard /> : <Navigate to="/login" /> }
          />
          <Route path="*" element={<ErrorPage />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
