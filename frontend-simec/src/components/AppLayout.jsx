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

// ==========================================================================
// FUNÇÃO DE FORMATAÇÃO PREMIUM PARA AS NOTIFICAÇÕES
// ==========================================================================
const formatarNotificacao = (titulo) => {
    // 1. Padrão: "Manutenção na [Equipamento] de [Unidade], inicia em [Tempo]"
    const matchProximidade = titulo.match(/Manutenção na (.*?) de (.*?), inicia em (.*)/i);
    if (matchProximidade) {
        return (
            <span className="block" style={{ lineHeight: '1.4', fontSize: '0.85rem' }}>
                <span className="text-slate-600">Manutenção na </span>
                <strong className="text-slate-900">{matchProximidade[1].trim()}</strong><br/>
                <span className="text-slate-600">da unidade </span>
                <strong className="text-blue-600">{matchProximidade[2].trim()}</strong><br/>
                <span className="text-slate-400 text-xs uppercase font-bold tracking-widest">
                    inicia em {matchProximidade[3].trim()}
                </span>
            </span>
        );
    }

    // 2. Padrão: "Manutenção iniciada na [Equipamento] de [Unidade]"
    const matchIniciada = titulo.match(/Manutenção iniciada na (.*?) de (.*)/i);
    if (matchIniciada) {
        return (
            <span className="block" style={{ lineHeight: '1.4', fontSize: '0.85rem' }}>
                <span className="text-green-600 font-bold uppercase text-[10px] tracking-widest">✓ Iniciada na</span><br/>
                <strong className="text-slate-900">{matchIniciada[1].trim()}</strong><br/>
                <span className="text-slate-600">da unidade </span>
                <strong className="text-blue-600">{matchIniciada[2].trim()}</strong>
            </span>
        );
    }

    // 3. Padrão: "Confirmar manutenção da [Equipamento] em [Unidade]"
    const matchConfirmacao = titulo.match(/Confirmar manutenção da (.*?) em (.*)/i);
    if (matchConfirmacao) {
        return (
            <span className="block" style={{ lineHeight: '1.4', fontSize: '0.85rem' }}>
                <strong className="text-amber-600 text-[10px] uppercase tracking-widest">⚠️ Confirmar conclusão</strong><br/>
                <span className="text-slate-600">da máquina </span>
                <strong className="text-slate-900">{matchConfirmacao[1].trim()}</strong><br/>
                <span className="text-slate-600">na unidade </span>
                <strong className="text-blue-600">{matchConfirmacao[2].trim()}</strong>
            </span>
        );
    }

    // Se a frase não bater, exibe normal
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
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

  const handleMarcarTodasComoVistas = (e) => {
    e.stopPropagation(); 
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

            <button onClick={toggleTheme} className="header-action-btn" title="Alternar Tema">
              <FontAwesomeIcon icon={theme === 'light' ? faMoon : faSun} />
            </button>

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
                      <span className="font-bold">Centro de Notificações</span>
                      <button className="limpar-btn bg-transparent border-none text-blue-600 font-bold text-xs cursor-pointer hover:underline" onClick={handleMarcarTodasComoVistas}>Limpar avisos</button>
                    </div>
                    <ul className="notification-list">
                      {alertasNaoVistos.length > 0 ? (
                        alertasNaoVistos.slice(0, 8).map(notif => {
                          const isObrigatorio = notif.id.startsWith('manut-confirm');
                          
                          // Captura segura do número da OS no subtítulo
                          const numeroOS = notif.subtitulo?.match(/OS\s*:?\s*([a-zA-Z0-9-]+)/i)?.[1] || '---';

                          return (
                            <li key={notif.id} className="notification-dropdown-item" style={{ alignItems: 'flex-start' }}>
                              <Link to={notif.link || "/alertas"} onClick={() => setIsDropdownOpen(false)} className="notification-link" style={{ alignItems: 'flex-start' }}>
                                <FontAwesomeIcon icon={faExclamationCircle} className={`icon-prioridade-${notif.prioridade?.toLowerCase()}`} style={{ marginTop: '4px' }} />
                                <div className="notification-text">
                                    <div className="notification-title">
                                        {/* CHAMADA PARA A FORMATAÇÃO EM NEGRITO/CORES */}
                                        {formatarNotificacao(notif.titulo)}
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-1 font-bold">OS: {numeroOS}</div>
                                </div>
                              </Link>
                              
                              {!isObrigatorio && (
                                <button 
                                  className="btn-mark-seen-mini" 
                                  onClick={(e) => { e.stopPropagation(); updateStatus(notif.id, 'Visto'); }}
                                  title="Marcar como visto"
                                  style={{ marginTop: '2px' }}
                                >
                                  <FontAwesomeIcon icon={faCheck} />
                                </button>
                              )}
                            </li>
                          );
                        })
                      ) : <li className="no-notifications p-4 text-center text-slate-400">Tudo em dia por aqui!</li>}
                    </ul>
                    <div className="dropdown-footer">
                        <Link to="/alertas" className="text-blue-600 font-black text-xs no-underline hover:underline" onClick={() => setIsDropdownOpen(false)}>VER TODOS OS ALERTAS</Link>
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