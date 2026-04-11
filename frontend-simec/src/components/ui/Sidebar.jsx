import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTachometerAlt,
  faFileContract,
  faExclamationTriangle,
  faWrench,
  faChartLine,
  faShieldAlt,
  faCogs,
  faPlus,
  faMicrochip,
  faChartBar,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '@/contexts/AuthContext';
import logoSimec from '@/assets/images/logo-simec.png';

function navLinkClass({ isActive }) {
  return [
    'group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all',
    isActive
      ? 'bg-blue-600 text-white shadow-sm'
      : 'text-slate-300 hover:bg-slate-800 hover:text-white',
  ].join(' ');
}

function Sidebar({
  notificacoesCount = 0,
  isMobileOpen = false,
  onClose = () => {},
}) {
  const { user } = useAuth();

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[1px] lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800 bg-slate-900 text-slate-200 transition-transform duration-300',
          'lg:static lg:z-auto lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-center justify-between px-4 pt-4 lg:justify-center">
          <Link
            to="/dashboard"
            title="Ir para o Dashboard"
            className="flex w-full items-center justify-center rounded-2xl bg-slate-950 px-3 py-3"
            onClick={onClose}
          >
            <img
              src={logoSimec}
              alt="SIMEC Logo"
              className="h-auto max-h-16 w-auto max-w-[190px] object-contain"
            />
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="ml-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 lg:hidden"
            aria-label="Fechar menu"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <nav className="mt-6 flex-1 overflow-y-auto px-3 pb-6">
          <ul className="space-y-1">
            <li>
              <NavLink to="/dashboard" className={navLinkClass} onClick={onClose}>
                <FontAwesomeIcon icon={faTachometerAlt} className="w-4" />
                <span>Dashboard</span>
              </NavLink>
            </li>

            <li>
              <NavLink to="/cadastros" className={navLinkClass} onClick={onClose}>
                <FontAwesomeIcon icon={faPlus} className="w-4" />
                <span>Cadastros Gerais</span>
              </NavLink>
            </li>

            <li>
              <NavLink to="/equipamentos" className={navLinkClass} onClick={onClose}>
                <FontAwesomeIcon icon={faMicrochip} className="w-4" />
                <span>Equipamentos</span>
              </NavLink>
            </li>

            <li>
              <NavLink to="/contratos" className={navLinkClass} onClick={onClose}>
                <FontAwesomeIcon icon={faFileContract} className="w-4" />
                <span>Contratos</span>
              </NavLink>
            </li>

            <li>
              <NavLink to="/seguros" className={navLinkClass} onClick={onClose}>
                <FontAwesomeIcon icon={faShieldAlt} className="w-4" />
                <span>Seguros</span>
              </NavLink>
            </li>

            <li>
              <NavLink to="/alertas" className={navLinkClass} onClick={onClose}>
                <FontAwesomeIcon icon={faExclamationTriangle} className="w-4" />
                <span className="flex-1">Alertas</span>

                {notificacoesCount > 0 && (
                  <span className="inline-flex min-w-[22px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[11px] font-bold text-white">
                    {notificacoesCount > 9 ? '9+' : notificacoesCount}
                  </span>
                )}
              </NavLink>
            </li>

            <li>
              <NavLink to="/manutencoes" className={navLinkClass} onClick={onClose}>
                <FontAwesomeIcon icon={faWrench} className="w-4" />
                <span>Manutenções</span>
              </NavLink>
            </li>

            <li>
              <NavLink to="/bi" className={navLinkClass} onClick={onClose}>
                <FontAwesomeIcon icon={faChartBar} className="w-4" />
                <span>Indicadores BI</span>
              </NavLink>
            </li>

            <li>
              <NavLink to="/relatorios" className={navLinkClass} onClick={onClose}>
                <FontAwesomeIcon icon={faChartLine} className="w-4" />
                <span>Relatórios</span>
              </NavLink>
            </li>

            {user?.role === 'admin' && (
              <>
                <li className="my-4 border-t border-slate-800" />
                <li>
                  <NavLink to="/gerenciamento" className={navLinkClass} onClick={onClose}>
                    <FontAwesomeIcon icon={faCogs} className="w-4" />
                    <span>Gerenciamento</span>
                  </NavLink>
                </li>
              </>
            )}
          </ul>
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;