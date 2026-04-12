import React, { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBell,
  faMoon,
  faSun,
  faRightFromBracket,
} from '@fortawesome/free-solid-svg-icons';

import Sidebar from '../ui/Sidebar';
import ChatBot from '../ui/ChatBot';
import { useAuth } from '../../contexts/AuthContext';

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth?.();
  const user = auth?.user || null;
  const logout = auth?.logout || auth?.signOut || null;

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('simec-theme') === 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;

    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('simec-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('simec-theme', 'light');
    }
  }, [isDarkMode]);

  const handleToggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  const handleLogout = async () => {
    try {
      if (typeof logout === 'function') {
        await logout();
      }
    } catch (error) {
      console.error('[APP_LAYOUT_LOGOUT_ERROR]', error);
    } finally {
      navigate('/login');
    }
  };

  const breadcrumbItems = useMemo(() => {
    const path = location.pathname;

    if (path === '/dashboard') {
      return [{ label: 'Dashboard', to: '/dashboard' }];
    }

    if (path === '/cadastros') {
      return [{ label: 'Cadastros Gerais', to: '/cadastros' }];
    }

    if (path.startsWith('/cadastros/unidades/adicionar')) {
      return [
        { label: 'Cadastros Gerais', to: '/cadastros' },
        { label: 'Unidades', to: '/cadastros/unidades' },
        { label: 'Nova Unidade' },
      ];
    }

    if (path.startsWith('/cadastros/unidades/editar')) {
      return [
        { label: 'Cadastros Gerais', to: '/cadastros' },
        { label: 'Unidades', to: '/cadastros/unidades' },
        { label: 'Editar Unidade' },
      ];
    }

    if (path.startsWith('/cadastros/unidades')) {
      return [
        { label: 'Cadastros Gerais', to: '/cadastros' },
        { label: 'Unidades' },
      ];
    }

    if (path.startsWith('/cadastros/equipamentos/adicionar')) {
      return [
        { label: 'Cadastros Gerais', to: '/cadastros' },
        { label: 'Equipamentos', to: '/equipamentos' },
        { label: 'Novo Equipamento' },
      ];
    }

    if (path.startsWith('/cadastros/equipamentos/editar')) {
      return [
        { label: 'Cadastros Gerais', to: '/cadastros' },
        { label: 'Equipamentos', to: '/equipamentos' },
        { label: 'Editar Equipamento' },
      ];
    }

    if (path.startsWith('/cadastros/emails')) {
      return [
        { label: 'Cadastros Gerais', to: '/cadastros' },
        { label: 'E-mails de Notificação' },
      ];
    }

    if (path.startsWith('/gerenciamento/usuarios')) {
      return [
        { label: 'Cadastros Gerais', to: '/cadastros' },
        { label: 'Usuários' },
      ];
    }

    if (path === '/equipamentos') {
      return [{ label: 'Equipamentos' }];
    }

    if (path.startsWith('/equipamentos/detalhes/')) {
      return [
        { label: 'Equipamentos', to: '/equipamentos' },
        { label: 'Detalhes do Equipamento' },
      ];
    }

    if (path.startsWith('/equipamentos/ficha-tecnica/')) {
      return [
        { label: 'Equipamentos', to: '/equipamentos' },
        { label: 'Ficha Técnica' },
      ];
    }

    if (path === '/manutencoes') {
      return [{ label: 'Manutenções' }];
    }

    if (path.startsWith('/manutencoes/agendar')) {
      return [
        { label: 'Manutenções', to: '/manutencoes' },
        { label: 'Nova Manutenção' },
      ];
    }

    if (path.startsWith('/manutencoes/editar/')) {
      return [
        { label: 'Manutenções', to: '/manutencoes' },
        { label: 'Editar Manutenção' },
      ];
    }

    if (path.startsWith('/manutencoes/detalhes/')) {
      return [
        { label: 'Manutenções', to: '/manutencoes' },
        { label: 'Detalhes da OS' },
      ];
    }

    if (path === '/contratos') {
      return [{ label: 'Contratos' }];
    }

    if (path.startsWith('/contratos/adicionar')) {
      return [
        { label: 'Contratos', to: '/contratos' },
        { label: 'Novo Contrato' },
      ];
    }

    if (path.startsWith('/contratos/editar/')) {
      return [
        { label: 'Contratos', to: '/contratos' },
        { label: 'Editar Contrato' },
      ];
    }

    if (path.startsWith('/contratos/detalhes/')) {
      return [
        { label: 'Contratos', to: '/contratos' },
        { label: 'Detalhes do Contrato' },
      ];
    }

    if (path === '/seguros') {
      return [{ label: 'Seguros' }];
    }

    if (path.startsWith('/seguros/adicionar')) {
      return [
        { label: 'Seguros', to: '/seguros' },
        { label: 'Novo Seguro' },
      ];
    }

    if (path.startsWith('/seguros/editar/')) {
      return [
        { label: 'Seguros', to: '/seguros' },
        { label: 'Editar Seguro' },
      ];
    }

    if (path.startsWith('/seguros/detalhes/')) {
      return [
        { label: 'Seguros', to: '/seguros' },
        { label: 'Detalhes do Seguro' },
      ];
    }

    if (path === '/alertas') {
      return [{ label: 'Alertas' }];
    }

    if (path === '/bi') {
      return [{ label: 'Business Intelligence' }];
    }

    if (path === '/relatorios') {
      return [{ label: 'Relatórios' }];
    }

    if (path === '/gerenciamento') {
      return [{ label: 'Gerenciamento' }];
    }

    if (path.startsWith('/gerenciamento/auditoria')) {
      return [
        { label: 'Gerenciamento', to: '/gerenciamento' },
        { label: 'Auditoria' },
      ];
    }

    return [];
  }, [location.pathname]);

  const nomeUsuario =
    user?.nome || user?.name || user?.username || 'Administrador do Sistema';

  return (
    <>
      <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950">
        <Sidebar />

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="border-b border-slate-800 bg-slate-900 px-6 py-4 text-white">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-300">Olá,</p>
                <h2 className="font-semibold text-white">{nomeUsuario}</h2>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <Link
                  to="/alertas"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-200 transition hover:bg-slate-700 hover:text-white"
                  title="Notificações"
                  aria-label="Notificações"
                >
                  <FontAwesomeIcon icon={faBell} />
                </Link>

                <button
                  type="button"
                  onClick={handleToggleDarkMode}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-200 transition hover:bg-slate-700 hover:text-white"
                  title={isDarkMode ? 'Modo claro' : 'Modo escuro'}
                  aria-label={isDarkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
                >
                  <FontAwesomeIcon icon={isDarkMode ? faSun : faMoon} />
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 text-slate-200 transition hover:bg-red-600 hover:text-white"
                  title="Sair"
                >
                  <FontAwesomeIcon icon={faRightFromBracket} />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </div>
            </div>
          </header>

          <div className="border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
            <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              {breadcrumbItems.length > 0 ? (
                breadcrumbItems.map((item, index) => (
                  <React.Fragment key={`${item.label}-${index}`}>
                    {index > 0 && <span className="text-slate-300 dark:text-slate-600">/</span>}

                    {item.to ? (
                      <Link
                        to={item.to}
                        className="font-medium text-slate-600 transition hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {item.label}
                      </span>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <span className="font-medium text-slate-500 dark:text-slate-400">SIMEC</span>
              )}
            </nav>
          </div>

          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>

      <ChatBot />
    </>
  );
}

export default AppLayout;