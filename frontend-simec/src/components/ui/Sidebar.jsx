// frontend-simec/src/components/ui/Sidebar.jsx
// VERSÃO ATUALIZADA - COM ÍCONE BI DEFINIDO E ORDEM REORGANIZADA

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
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '@/contexts/AuthContext';
import logoSimec from '../../assets/images/logo-simec.png';

function Sidebar({ notificacoesCount = 0 }) {
  const { user } = useAuth();

  return (
    <aside className="sidebar">
      <Link to="/dashboard" title="Ir para o Dashboard" className="logo-area">
        <img src={logoSimec} alt="SIMEC Logo" className="app-logo" />
      </Link>

      <nav>
        <ul>
          <li>
            <NavLink to="/dashboard">
              <FontAwesomeIcon icon={faTachometerAlt} /> Dashboard
            </NavLink>
          </li>

          <li>
            <NavLink to="/cadastros">
              <FontAwesomeIcon icon={faPlus} /> Cadastros Gerais
            </NavLink>
          </li>

          <li>
            <NavLink to="/equipamentos">
              <FontAwesomeIcon icon={faMicrochip} /> Equipamentos
            </NavLink>
          </li>

          <li>
            <NavLink to="/contratos">
              <FontAwesomeIcon icon={faFileContract} /> Contratos
            </NavLink>
          </li>

          <li>
            <NavLink to="/seguros">
              <FontAwesomeIcon icon={faShieldAlt} /> Seguros
            </NavLink>
          </li>

          <li>
            <NavLink to="/alertas">
              <FontAwesomeIcon icon={faExclamationTriangle} />
              Alertas
              {notificacoesCount > 0 && (
                <span className="sidebar-badge">
                  {notificacoesCount > 9 ? '9+' : notificacoesCount}
                </span>
              )}
            </NavLink>
          </li>

          <li>
            <NavLink to="/manutencoes">
              <FontAwesomeIcon icon={faWrench} /> Manutenções
            </NavLink>
          </li>

          <li>
            <NavLink to="/bi">
              <FontAwesomeIcon icon={faChartBar} /> Indicadores BI
            </NavLink>
          </li>

          <li>
            <NavLink to="/relatorios">
              <FontAwesomeIcon icon={faChartLine} /> Relatórios
            </NavLink>
          </li>

          {user?.role === 'admin' && (
            <li className="admin-section">
              <NavLink to="/gerenciamento">
                <FontAwesomeIcon icon={faCogs} /> Gerenciamento
              </NavLink>
            </li>
          )}
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;