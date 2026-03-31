// frontend-simec/src/components/Sidebar.jsx
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
    faChartBar // <<< ADICIONADO: Ícone para o BI
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '@/contexts/AuthContext';
import logoSimec from '../assets/images/logo-simec.png';

function Sidebar({ notificacoesCount = 0 }) {
  const { user } = useAuth(); 

  return (
    <aside className="sidebar">
      <Link to="/dashboard" title="Ir para o Dashboard" className="logo-area">
        <img src={logoSimec} alt="SIMEC Logo" className="app-logo" />
      </Link>
      
      <nav>
        <ul>
          {/* 1. Dashboard */}
          <li>
            <NavLink to="/dashboard">
                <FontAwesomeIcon icon={faTachometerAlt} /> Dashboard
            </NavLink>
          </li>

          {/* 2. Cadastros Gerais (Antes de Equipamentos) */}
          <li>
            <NavLink to="/cadastros">
              <FontAwesomeIcon icon={faPlus} /> Cadastros Gerais
            </NavLink>
          </li>

          {/* 3. Equipamentos */}
          <li>
            <NavLink to="/equipamentos">
                <FontAwesomeIcon icon={faMicrochip} /> Equipamentos
            </NavLink>
          </li>
          
          {/* 4. Contratos */}
          <li>
            <NavLink to="/contratos">
                <FontAwesomeIcon icon={faFileContract} /> Contratos
            </NavLink>
          </li>

          {/* 5. Seguros */}
          <li>
            <NavLink to="/seguros">
                <FontAwesomeIcon icon={faShieldAlt} /> Seguros
            </NavLink>
          </li>

          {/* 6. Alertas */}
          <li>
            <NavLink to="/alertas">
              <FontAwesomeIcon icon={faExclamationTriangle} /> 
              Alertas
              {notificacoesCount > 0 && <span className="sidebar-badge">{notificacoesCount > 9 ? '9+' : notificacoesCount}</span>}
            </NavLink>
          </li>

          {/* 7. Manutenções */}
          <li>
            <NavLink to="/manutencoes">
                <FontAwesomeIcon icon={faWrench} /> Manutenções
            </NavLink>
          </li>

          {/* 8. Indicadores BI (Novo) */}
          <li>
            <NavLink to="/bi">
                <FontAwesomeIcon icon={faChartBar} /> Indicadores BI
            </NavLink>
          </li>

          {/* 9. Relatórios */}
          <li>
            <NavLink to="/relatorios">
                <FontAwesomeIcon icon={faChartLine} /> Relatórios
            </NavLink>
          </li>
          
          {/* 10. Gerenciamento (Apenas Admin) */}
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