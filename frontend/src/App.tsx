import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './components/dashboard/Dashboard';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm'
import './App.css';

function App() {
  const [authState, setAuthState] = useState<'checking' | 'loggedIn' | 'loggedOut'>('checking');

  useEffect(() => {
    const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
    if (token) {
      setAuthState('loggedIn');
    } else {
      fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      })
        .then(res => res.json())
        .then(data => {
          if (data?.accessToken) {
            localStorage.setItem('klicklab_token', data.accessToken);
            setAuthState('loggedIn');
          } else {
            setAuthState('loggedOut');
          }
        })
        .catch(() => setAuthState('loggedOut'));
    }
  }, []);

  
  if (authState === 'checking') {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegisterForm />} />
          <Route
            path="/"
            element={ authState === 'loggedIn' ? <Dashboard /> : <Navigate to="/login" /> }
          />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
