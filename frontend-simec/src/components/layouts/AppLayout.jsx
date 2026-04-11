// src/layouts/AppLayout.jsx (FINAL)

import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAlertas } from '@/contexts/AlertasContext';
import { useAuth } from '@/contexts/AuthContext';

import Sidebar from '@/components/ui/Sidebar';
import ChatBot from '@/components/charts/ChatBot';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMoon,
  faSun,
  faBell,
  faExclamationCircle,
  faSignOutAlt,
  faBars,
} from '@fortawesome/free-solid-svg-icons';

function AppLayout() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('theme') || 'light'
  );

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  const notificationRef = useRef(null);

  const { alertas = [], updateStatus } = useAlertas();
  const { user, logout } = useAuth();
  const location = useLocation();

  // ✅ APLICA DARK MODE DE VERDADE
  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    setSidebarMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const alertasNaoVistos = alertas.filter((a) => a.status === 'NaoVisto');

  const handleLimparNotificacoes = () => {
    alertasNaoVistos.forEach((n) => updateStatus(n.id, 'Visto'));
  };

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-900">
      {/* SIDEBAR */}
      <Sidebar
        notificacoesCount={alertasNaoVistos.length}
        isMobileOpen={isSidebarMobileOpen}
        onClose={() => setSidebarMobileOpen(false)}
      />

      {/* CONTEÚDO */}
      <div className="flex flex-1 flex-col">
        {/* HEADER */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 md:px-6">
          
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-700"
              onClick={() => setSidebarMobileOpen(true)}
            >
              <FontAwesomeIcon icon={faBars} />
            </button>

            <span className="hidden md:block text-sm text-slate-600 dark:text-slate-300">
              Olá, <strong>{user?.nome}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">

            {/* THEME */}
            <button
              onClick={toggleTheme}
              className="btn btn-ghost"
            >
              <FontAwesomeIcon icon={theme === 'light' ? faMoon : faSun} />
            </button>

            {/* NOTIFICAÇÕES */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="btn btn-ghost relative"
              >
                <FontAwesomeIcon icon={faBell} />

                {alertasNaoVistos.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                    {alertasNaoVistos.length > 9 ? '9+' : alertasNaoVistos.length}
                  </span>
                )}
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl">
                  
                  <div className="flex justify-between p-3 border-b dark:border-slate-700">
                    <span className="font-semibold">Notificações</span>
                    <button
                      onClick={handleLimparNotificacoes}
                      className="text-blue-600 text-xs"
                    >
                      Limpar
                    </button>
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {alertasNaoVistos.length > 0 ? (
                      alertasNaoVistos.slice(0, 8).map((notif) => (
                        <Link
                          key={notif.id}
                          to={notif.link || '/alertas'}
                          className="flex gap-3 p-3 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          <FontAwesomeIcon
                            icon={faExclamationCircle}
                            className="text-red-500 mt-1"
                          />
                          <span className="text-sm">{notif.titulo}</span>
                        </Link>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-slate-400">
                        Sem notificações
                      </div>
                    )}
                  </div>

                  <div className="p-3 text-center border-t dark:border-slate-700">
                    <Link to="/alertas" className="text-xs text-blue-600">
                      Ver todos
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* LOGOUT */}
            <button onClick={logout} className="btn btn-ghost text-red-500">
              <FontAwesomeIcon icon={faSignOutAlt} />
            </button>

          </div>
        </header>

        {/* CONTEÚDO */}
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>

        {/* CHAT */}
        <ChatBot />
      </div>
    </div>
  );
}

export default AppLayout;