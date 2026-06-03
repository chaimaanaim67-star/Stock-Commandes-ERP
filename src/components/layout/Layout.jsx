import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';
import api from '../../api/axiosConfig';

const Layout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return undefined;

    const logout = () => {
      localStorage.clear();
      navigate('/login');
    };

    const ping = async () => {
      try {
        await api.post('/api/admin/heartbeat');
      } catch (err) {
        if (err.response?.status === 401) {
          logout();
        }
      }
    };

    const resetInactivityTimer = () => {
      if (window.__adminInactivityTimer) {
        clearTimeout(window.__adminInactivityTimer);
      }
      window.__adminInactivityTimer = setTimeout(() => {
        logout();
      }, 20 * 60 * 1000); // 20 minutes
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((event) => window.addEventListener(event, resetInactivityTimer));

    ping();
    resetInactivityTimer();
    const heartbeatId = setInterval(ping, 60_000);

    return () => {
      clearInterval(heartbeatId);
      if (window.__adminInactivityTimer) {
        clearTimeout(window.__adminInactivityTimer);
      }
      events.forEach((event) => window.removeEventListener(event, resetInactivityTimer));
    };
  }, [navigate]);

  return (
    <div className="flex h-screen bg-[#FDFCFB] dark:bg-gray-900 transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
