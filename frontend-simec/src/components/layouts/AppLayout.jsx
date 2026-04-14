import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBell,
  faMoon,
  faSun,
  faRightFromBracket,
  faCheck,
  faEye,
  faBellSlash,
  faClock,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

import Sidebar from '../ui/Sidebar';
import ChatBot from '../ui/chat/ChatBot';
import { useAuth } from '../../contexts/AuthContext';
import { useAlertas } from '../../contexts/AlertasContext';

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth?.();
  const user = auth?.user || null;
  const logout = auth?.logout || auth?.signOut || null;

  const {
    alertas = [],
    loading: alertasLoading,
    updateStatus,
    dismissAlerta,
  } = useAlertas();

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('simec-theme') === 'dark';
  });

  const [alertsOpen, setAlertsOpen] = useState(false);
  const alertsRef = useRef(null);

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

  useEffect(() => {
    function handleClickOutside(event) {
      if (alertsRef.current && !alertsRef.current.contains(event.target)) {
        setAlertsOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setAlertsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

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

  const alertasNaoVistos = useMemo(
    () => alertas.filter((alerta) => alerta.status === 'NaoVisto'),
    [alertas]
  );

  const alertasRecentes = useMemo(() => alertas.slice(0, 8), [alertas]);

  const contadorNaoVistos = alertasNaoVistos.length;

  const formatarDataCurta = (data) => {
    if (!data) return '-';

    try {
      return new Date(data).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  const handleToggleAlerts = () => {
    setAlertsOpen((prev) => !prev);
  };

  const handleOpenAlertDetails = async (alerta) => {
    try {
      if (alerta.status === 'NaoVisto') {
        await updateStatus(alerta.id, 'Visto');
      }
    } catch (error) {
      console.error('[APP_LAYOUT_ALERT_STATUS_ERROR]', error);
    } finally {
      setAlertsOpen(false);
      navigate(alerta.link || '/alertas');
    }
  };

  const handleMarkAsRead = async (alertaId) => {
    try {
      await updateStatus(alertaId, 'Visto');
    } catch (error) {
      console.error('[APP_LAYOUT_MARK_READ_ERROR]', error);
    }
  };

  const handleDismiss = async (alertaId) => {
    try {
      await dismissAlerta(alertaId);
    } catch (error) {
      console.error('[APP_LAYOUT_DISMISS_ERROR]', error);
    }
  };

  return (
    <>
      <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950">
        <Sidebar notificacoesCount={contadorNaoVistos} />

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="border-b border-slate-800 bg-slate-900 px-6 py-4 text-white">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-300">Olá,</p>
                <h2 className="font-semibold text-white">{nomeUsuario}</h2>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <div className="relative" ref={alertsRef}>
                  <button
                    type="button"
                    onClick={handleToggleAlerts}
                    className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-200 transition hover:bg-slate-700 hover:text-white"
                    title="Notificações"
                    aria-label="Notificações"
                  >
                    <FontAwesomeIcon icon={faBell} />

                    {contadorNaoVistos > 0 && (
                      <span className="absolute -right-1 -top-1 inline-flex min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {contadorNaoVistos > 9 ? '9+' : contadorNaoVistos}
                      </span>
                    )}
                  </button>

                  {alertsOpen && (
                    <div className="absolute right-0 z-50 mt-3 w-[420px] max-w-[calc(100vw-32px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">
                            Notificações
                          </h3>
                          <p className="text-xs text-slate-500">
                            {contadorNaoVistos} não visto(s)
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Link
                            to="/alertas"
                            onClick={() => setAlertsOpen(false)}
                            className="text-xs font-semibold text-blue-600 transition hover:underline"
                          >
                            Ver todos
                          </Link>

                          <button
                            type="button"
                            onClick={() => setAlertsOpen(false)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                            aria-label="Fechar notificações"
                          >
                            <FontAwesomeIcon icon={faXmark} />
                          </button>
                        </div>
                      </div>

                      <div className="max-h-[420px] overflow-y-auto">
                        {alertasLoading ? (
                          <div className="px-4 py-6 text-sm text-slate-500">
                            Carregando alertas...
                          </div>
                        ) : alertasRecentes.length === 0 ? (
                          <div className="px-4 py-6 text-sm text-slate-500">
                            Nenhuma notificação disponível.
                          </div>
                        ) : (
                          alertasRecentes.map((alerta) => (
                            <div
                              key={alerta.id}
                              className={[
                                'border-b border-slate-100 px-4 py-3 transition',
                                alerta.status === 'NaoVisto'
                                  ? 'bg-blue-50/40'
                                  : 'bg-white',
                              ].join(' ')}
                            >
                              <div className="flex items-start gap-3">
                                <button
                                  type="button"
                                  onClick={() => handleOpenAlertDetails(alerta)}
                                  className="min-w-0 flex-1 text-left"
                                >
                                  <div className="flex items-center gap-2">
                                    <p className="truncate text-sm font-semibold text-slate-900">
                                      {alerta.titulo}
                                    </p>

                                    {alerta.status === 'NaoVisto' && (
                                      <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                                    )}
                                  </div>

                                  {alerta.subtitulo ? (
                                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                                      {alerta.subtitulo}
                                    </p>
                                  ) : null}

                                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                                    <span className="inline-flex items-center gap-1">
                                      <FontAwesomeIcon icon={faClock} />
                                      {formatarDataCurta(alerta.data)}
                                    </span>

                                    {alerta.tipo ? (
                                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                                        {alerta.tipo}
                                      </span>
                                    ) : null}

                                    {alerta.prioridade ? (
                                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                                        {alerta.prioridade}
                                      </span>
                                    ) : null}
                                  </div>
                                </button>

                                <div className="flex shrink-0 items-center gap-1">
                                  {alerta.status === 'NaoVisto' ? (
                                    <button
                                      type="button"
                                      onClick={() => handleMarkAsRead(alerta.id)}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-green-600 transition hover:bg-green-50"
                                      title="Marcar como visto"
                                    >
                                      <FontAwesomeIcon icon={faCheck} />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenAlertDetails(alerta)}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 transition hover:bg-blue-50"
                                      title="Abrir alerta"
                                    >
                                      <FontAwesomeIcon icon={faEye} />
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleDismiss(alerta.id)}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                                    title="Dispensar alerta"
                                  >
                                    <FontAwesomeIcon icon={faBellSlash} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

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
                    {index > 0 && (
                      <span className="text-slate-300 dark:text-slate-600">/</span>
                    )}

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
                <span className="font-medium text-slate-500 dark:text-slate-400">
                  SIMEC
                </span>
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