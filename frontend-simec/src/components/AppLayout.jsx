// Ficheiro: frontend-simec/src/components/AppLayout.jsx

import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAlertas } from '@/contexts/AlertasContext';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import ChatBot from './ChatBot';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faMoon, faSun, faBell, faExclamationCircle, 
    faSignOutAlt, faBars, faCheck 
} from '@fortawesome/free-solid-svg-icons';

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
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

  const handleMarcarTodasComoVistas = (e) => {
    e.stopPropagation(); // Impede o fechamento precoce
    const alertasPassíveisDeLimpeza = alertas.filter(a => 
        a.status === 'NaoVisto' && !a.id.startsWith('manut-confirm')
    );
    alertasPassíveisDeLimpeza.forEach(notif => updateStatus(notif.id, 'Visto'));
  };

  const alertasNaoVistos = alertas.filter(a => a.status === 'NaoVisto');

  return (
    <div className={`app-container ${isSidebarMobileOpen ? 'sidebar-mobile-open' : ''}`}>
      <Sidebar notificacoesCount={alertasNaoVistos.length} />
      {isSidebarMobileOpen && <div className="sidebar-overlay" onClick={() => setSidebarMobileOpen(false)}></div>}

      <div className="main-content-wrapper">
        <header className="header-actions">
          <div className="mobile-menu-btn-wrapper">
            <button className="header-action-btn mobile-menu-btn" onClick={() => setSidebarMobileOpen(true)}>
              <FontAwesomeIcon icon={faBars} />
            </button>
          </div>

          <div className="header-right-actions">
            <span className="user-greeting">Olá, {user?.nome}</span>

            {/* BOTÃO DE TEMA */}
            <button onClick={toggleTheme} className="header-action-btn" title="Alternar Tema">
              <FontAwesomeIcon icon={theme === 'light' ? faMoon : faSun} />
            </button>

            {/* SINO DE NOTIFICAÇÕES (ESTRUTURA CORRIGIDA) */}
            <div className="notification-bell" ref={notificationRef}>
              <button className="header-action-btn" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
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
                      <span className="font-bold">Notificações</span>
                      <button className="limpar-btn" onClick={handleMarcarTodasComoVistas}>Limpar avisos</button>
                    </div>
                    <ul className="notification-list">
                      {alertasNaoVistos.length > 0 ? (
                        alertasNaoVistos.slice(0, 8).map(notif => {
                          const isObrigatorio = notif.id.startsWith('manut-confirm');

                          return (
                            <li key={notif.id} className="notification-dropdown-item">
                              <Link to={notif.link || "/alertas"} onClick={() => setIsDropdownOpen(false)} className="notification-link">
                                <FontAwesomeIcon icon={faExclamationCircle} className={`icon-prioridade-${notif.prioridade?.toLowerCase()}`} />
                                <div className="notification-text">
                                    <span className="notification-title">{notif.titulo}</span>
                                </div>
                              </Link>
                              
                              {!isObrigatorio && (
                                <button 
                                  className="btn-mark-seen-mini" 
                                  onClick={(e) => { e.stopPropagation(); updateStatus(notif.id, 'Visto'); }}
                                  title="Marcar como visto"
                                >
                                  <FontAwesomeIcon icon={faCheck} />
                                </button>
                              )}
                            </li>
                          );
                        })
                      ) : <li className="no-notifications">Tudo em dia!</li>}
                    </ul>
                    <div className="dropdown-footer">
                        <Link to="/alertas" onClick={() => setIsDropdownOpen(false)}>Ver todos os alertas</Link>
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