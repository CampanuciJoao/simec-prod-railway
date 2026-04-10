// Ficheiro: frontend-simec/src/components/layouts/AppLayout.jsx

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
  faCheck,
} from '@fortawesome/free-solid-svg-icons';

const formatarNotificacao = (titulo) => {
  const matchGeral = titulo?.match(
    /(.*?)\s+na unidade de\s+(.*?),\s+no equipamento\s+(.*)/i
  );

  if (matchGeral) {
    return (
      <span className="block" style={{ lineHeight: '1.5' }}>
        <span
          className="text-slate-400"
          style={{
            fontSize: '0.7rem',
            fontWeight: '800',
            textTransform: 'uppercase',
          }}
        >
          {matchGeral[1].trim()}
        </span>
        <br />
        <span className="text-slate-500">Unidade:</span>{' '}
        <strong className="text-blue-600">{matchGeral[2].trim()}</strong>
        <br />
        <span className="text-slate-500">Equip:</span>{' '}
        <strong className="text-slate-900">{matchGeral[3].trim()}</strong>
      </span>
    );
  }

  const matchConfirmacao = titulo?.match(
    /Confirmar conclusão:\s+(.*?)\s+na unidade de\s+(.*)/i
  );

  if (matchConfirmacao) {
    return (
      <span className="block" style={{ lineHeight: '1.5' }}>
        <strong className="text-amber-600" style={{ fontSize: '0.75rem' }}>
          ⚠️ AÇÃO REQUERIDA
        </strong>
        <br />
        <span className="text-slate-500">Concluir:</span>{' '}
        <strong className="text-slate-900">{matchConfirmacao[1].trim()}</strong>
        <br />
        <span className="text-slate-500">Local:</span>{' '}
        <strong className="text-blue-600">{matchConfirmacao[2].trim()}</strong>
      </span>
    );
  }

  return <span className="block font-medium text-slate-700">{titulo}</span>;
};

function AppLayout() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  const notificationRef = useRef(null);
  const { alertas = [], updateStatus } = useAlertas();
  const { user, logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    document.body.className = '';

    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
    }

    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    setSidebarMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleMarcarTodasComoVistas = (e) => {
    e.stopPropagation();

    const alertasPassiveisDeLimpeza = alertas.filter(
      (a) => a.status === 'NaoVisto' && !String(a.id).startsWith('manut-confirm')
    );

    alertasPassiveisDeLimpeza.forEach((notif) => updateStatus(notif.id, 'Visto'));
  };

  const alertasNaoVistos = alertas.filter((a) => a.status === 'NaoVisto');

  return (
    <div className={`app-container ${isSidebarMobileOpen ? 'sidebar-mobile-open' : ''}`}>
      <Sidebar notificacoesCount={alertasNaoVistos.length} />

      {isSidebarMobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarMobileOpen(false)}
        />
      )}

      <div className="main-content-wrapper">
        <header className="header-actions">
          <div className="mobile-menu-btn-wrapper">
            <button
              className="header-action-btn mobile-menu-btn"
              onClick={() => setSidebarMobileOpen(true)}
            >
              <FontAwesomeIcon icon={faBars} />
            </button>
          </div>

          <div className="header-right-actions">
            <span className="user-greeting">Olá, {user?.nome}</span>

            <button
              onClick={toggleTheme}
              className="header-action-btn"
              title="Alternar Tema"
            >
              <FontAwesomeIcon icon={theme === 'light' ? faMoon : faSun} />
            </button>

            <div className="notification-bell" ref={notificationRef}>
              <button
                className="header-action-btn"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <FontAwesomeIcon icon={faBell} />
                {alertasNaoVistos.length > 0 && (
                  <span className="notification-badge">
                    {alertasNaoVistos.length > 9 ? '9+' : alertasNaoVistos.length}
                  </span>
                )}
              </button>

              {isDropdownOpen && (
                <div className="notification-dropdown">
                  <div className="dropdown-header">
                    <span className="font-bold">Centro de Notificações</span>
                    <button
                      className="limpar-btn bg-transparent border-none text-blue-600 font-bold text-xs cursor-pointer hover:underline"
                      onClick={handleMarcarTodasComoVistas}
                    >
                      Limpar avisos
                    </button>
                  </div>

                  <ul className="notification-list">
                    {alertasNaoVistos.length > 0 ? (
                      alertasNaoVistos.slice(0, 8).map((notif) => {
                        const isObrigatorio = String(notif.id).startsWith('manut-confirm');
                        const numeroOS =
                          notif.subtitulo?.match(/OS\s*:?\s*([a-zA-Z0-9-]+)/i)?.[1] || '---';

                        return (
                          <li
                            key={notif.id}
                            className="notification-dropdown-item"
                            style={{ alignItems: 'flex-start' }}
                          >
                            <Link
                              to={notif.link || '/alertas'}
                              onClick={() => setIsDropdownOpen(false)}
                              className="notification-link"
                              style={{ alignItems: 'flex-start' }}
                            >
                              <FontAwesomeIcon
                                icon={faExclamationCircle}
                                className={`icon-prioridade-${notif.prioridade?.toLowerCase()}`}
                                style={{ marginTop: '4px' }}
                              />

                              <div className="notification-text">
                                <div className="notification-title">
                                  {formatarNotificacao(notif.titulo)}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-1">
                                  OS: {numeroOS}
                                </div>
                              </div>
                            </Link>

                            {!isObrigatorio && (
                              <button
                                className="btn-mark-seen-mini"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateStatus(notif.id, 'Visto');
                                }}
                                title="Marcar como visto"
                                style={{ marginTop: '2px' }}
                              >
                                <FontAwesomeIcon icon={faCheck} />
                              </button>
                            )}
                          </li>
                        );
                      })
                    ) : (
                      <li className="no-notifications p-4 text-center text-slate-400">
                        Tudo em dia por aqui!
                      </li>
                    )}
                  </ul>

                  <div className="dropdown-footer">
                    <Link
                      to="/alertas"
                      className="text-blue-600 font-black text-xs no-underline hover:underline"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      VER TODOS OS ALERTAS
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <button onClick={logout} className="header-action-btn" title="Sair">
              <FontAwesomeIcon icon={faSignOutAlt} />
            </button>
          </div>
        </header>

        <main className="main-content">
          <Outlet />
        </main>

        <ChatBot />
      </div>
    </div>
  );
}

export default AppLayout;