// src/pages/GerenciamentoPage.jsx
// CÓDIGO ATUALIZADO E MAIS SIMPLES

import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsersCog, faScroll } from '@fortawesome/free-solid-svg-icons';

function GerenciamentoPage() {
  return (
    <div className="page-content-wrapper">
      {/* O título principal foi removido daqui para evitar duplicatas */}
      <div className="page-title-card">
        <h1 className="page-title-internal">Gerenciamento</h1>
      </div>
      
      <div className="tabs-navigation">
        <NavLink 
          to="/gerenciamento/usuarios" 
          className={({ isActive }) => `tab-button ${isActive ? 'active' : ''}`}
        >
          <FontAwesomeIcon icon={faUsersCog} /> Usuários
        </NavLink>
        <NavLink 
          to="/gerenciamento/auditoria" 
          className={({ isActive }) => `tab-button ${isActive ? 'active' : ''}`}
        >
          <FontAwesomeIcon icon={faScroll} /> Log de Auditoria
        </NavLink>
      </div>

      {/* O Outlet renderiza o conteúdo da aba, que agora terá seu próprio layout interno */}
      <div className="tab-content-container">
        <Outlet /> 
      </div>
    </div>
  );
}

export default GerenciamentoPage;