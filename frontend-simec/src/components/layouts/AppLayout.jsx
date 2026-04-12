import React, { useMemo } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../ui/Sidebar';
import ChatBot from '../charts/ChatBot';

function AppLayout() {
  const location = useLocation();

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

  return (
    <>
      <div className="flex min-h-screen bg-slate-100">
        <Sidebar />

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="border-b border-slate-800 bg-slate-900 px-6 py-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">Olá,</p>
                <h2 className="font-semibold text-white">
                  Administrador do Sistema
                </h2>
              </div>
            </div>
          </header>

          <div className="border-b border-slate-200 bg-white px-6 py-3">
            <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              {breadcrumbItems.length > 0 ? (
                breadcrumbItems.map((item, index) => (
                  <React.Fragment key={`${item.label}-${index}`}>
                    {index > 0 && <span className="text-slate-300">/</span>}

                    {item.to ? (
                      <Link
                        to={item.to}
                        className="font-medium text-slate-600 transition hover:text-blue-600"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span className="font-semibold text-slate-900">
                        {item.label}
                      </span>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <span className="font-medium text-slate-500">SIMEC</span>
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