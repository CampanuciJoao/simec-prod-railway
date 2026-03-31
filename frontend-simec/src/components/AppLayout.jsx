// Ficheiro: frontend-simec/src/components/AppLayout.jsx
// VERSÃO FINAL MÓVEL - COM SIDEBAR E HEADER RESPONSIVOS

import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAlertas } from '@/contexts/AlertasContext';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faSun, faBell, faExclamationCircle, faSignOutAlt, faBars,faCheck } from '@fortawesome/free-solid-svg-icons';

function AppLayout() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // NOVO: Estado para controlar a visibilidade da sidebar no mobile.
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
  
  // Efeito para fechar a sidebar móvel quando a rota muda.
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

  const handleMarcarTodasComoVistas = () => {
    const alertasNaoVistos = alertas.filter(a => a.status === 'NaoVisto');
    alertasNaoVistos.forEach(notif => updateStatus(notif.id, 'Visto'));
    setIsDropdownOpen(false);
  };

  const alertasNaoVistos = alertas.filter(a => a.status === 'NaoVisto');

  return (
    // Adiciona a classe condicional ao container principal
    <div className={`app-container ${isSidebarMobileOpen ? 'sidebar-mobile-open' : ''}`}>
      <Sidebar notificacoesCount={alertasNaoVistos.length} />
      {/* O overlay para fechar a sidebar ao clicar fora */}
      {isSidebarMobileOpen && <div className="sidebar-overlay" onClick={() => setSidebarMobileOpen(false)}></div>}

      <div className="main-content-wrapper">
        <header className="header-actions">
          
          {/* Botão de Menu para Mobile */}
          <div className="mobile-menu-btn-wrapper">
            <button 
              className="header-action-btn mobile-menu-btn" 
              onClick={() => setSidebarMobileOpen(true)}
              title="Abrir Menu"
            >
              <FontAwesomeIcon icon={faBars} />
            </button>
          </div>

          <div className="header-right-actions">
            <span className="user-greeting">Olá, {user?.nome}</span>
            <button onClick={logout} className="header-action-btn" title="Sair">
              <FontAwesomeIcon icon={faSignOutAlt} />
            </button>
            <div className="notification-bell" ref={notificationRef}>
              <button className="header-action-btn" onClick={() => setIsDropdownOpen(prev => !prev)}>
                <FontAwesomeIcon icon={faBell} />
                {alertasNaoVistos.length > 0 && <span className="notification-badge">{alertasNaoVistos.length > 9 ? '9+' : alertasNaoVistos.length}</span>}
              </button>
              {isDropdownOpen && (
                <div className="notification-dropdown">
                    <div className="dropdown-header">
                      <span>Notificações</span>
                      {alertasNaoVistos.length > 0 && <button className="limpar-btn" onClick={handleMarcarTodasComoVistas}>Marcar todas como vistas</button>}
                    </div>
                    <ul>
                      {alertasNaoVistos.length > 0 ? (
                        alertasNaoVistos.slice(0, 5).map(notif => (
                          <li key={notif.id} className="notification-dropdown-item">
                            <Link to={notif.link || "/alertas"} onClick={() => setIsDropdownOpen(false)} className="notification-link">
                              <FontAwesomeIcon icon={faExclamationCircle} className={`icon-prioridade-${notif.prioridade?.toLowerCase()}`} />
                              <span>{notif.titulo}</span>
                            </Link>
                            {/* BOTÃO INDIVIDUAL ADICIONADO AQUI */}
                            <button 
                              className="btn-mark-seen-mini" 
                              onClick={() => updateStatus(notif.id, 'Visto')}
                              title="Marcar como visto"
                            >
                              <FontAwesomeIcon icon={faCheck} />
                            </button>
                          </li>
                        ))
                      ) : <li className="no-notifications">Nenhuma nova notificação.</li>}
                    </ul>
                    <div className="dropdown-footer"><Link to="/alertas" onClick={() => setIsDropdownOpen(false)}>Ver todos os alertas</Link></div>
                </div>
              )}
            </div>
            <button onClick={toggleTheme} className="header-action-btn" title="Mudar Tema">
              <FontAwesomeIcon icon={theme === 'light' ? faMoon : faSun} />
            </button>
          </div>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;