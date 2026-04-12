import React, { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMoon,
  faSun,
  faBell,
  faExclamationCircle,
  faSignOutAlt,
  faBars,
} from '@fortawesome/free-solid-svg-icons';

import { useAlertas } from '@/contexts/AlertasContext';
import { useAuth } from '@/contexts/AuthContext';

import Sidebar from '@/components/ui/Sidebar';
import ChatBot from '@/components/charts/ChatBot';

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
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950">
      <Sidebar
        notificacoesCount={alertasNaoVistos.length}
        isMobileOpen={isSidebarMobileOpen}
        onClose={() => setSidebarMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col lg:ml-0">
        <header className="sticky top-0 z-30 flex h-[88px] items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 lg:hidden"
              onClick={() => setSidebarMobileOpen(true)}
              aria-label="Abrir menu"
            >
              <FontAwesomeIcon icon={faBars} />
            </button>

            <div className="hidden md:block">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Olá,
              </p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {user?.nome || 'Usuário'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              title="Alternar tema"
            >
              <FontAwesomeIcon icon={theme === 'light' ? faMoon : faSun} />
            </button>

            <div className="relative" ref={notificationRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                title="Notificações"
              >
                <FontAwesomeIcon icon={faBell} />

                {alertasNaoVistos.length > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {alertasNaoVistos.length > 9 ? '9+' : alertasNaoVistos.length}
                  </span>
                )}
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-[340px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Notificações
                    </span>

                    <button
                      type="button"
                      onClick={handleLimparNotificacoes}
                      className="text-xs font-semibold text-blue-600 hover:underline"
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
                          className="flex items-start gap-3 border-b border-slate-100 px-4 py-3 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <FontAwesomeIcon
                            icon={faExclamationCircle}
                            className="mt-1 text-red-500"
                          />

                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-slate-700 dark:text-slate-200">
                              {notif.titulo}
                            </p>
                            {notif.subtitulo ? (
                              <p className="mt-1 text-xs text-slate-400">
                                {notif.subtitulo}
                              </p>
                            ) : null}
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="p-5 text-center text-sm text-slate-400">
                        Sem notificações
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-200 px-4 py-3 text-center dark:border-slate-800">
                    <Link
                      to="/alertas"
                      className="text-xs font-semibold text-blue-600 hover:underline"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      Ver todos
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={logout}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-red-600 transition hover:bg-red-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-red-950/40"
              title="Sair"
            >
              <FontAwesomeIcon icon={faSignOutAlt} />
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-6">
          <Outlet />
        </main>

        <ChatBot />
      </div>
    </div>
  );
}

export default AppLayout;