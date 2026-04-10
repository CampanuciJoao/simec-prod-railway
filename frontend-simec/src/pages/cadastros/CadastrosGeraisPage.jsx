// Ficheiro: src/pages/CadastrosGeraisPage.jsx
// VERSÃO ATUALIZADA - COM ABA DEDICADA A "ADICIONAR EQUIPAMENTO"

import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBuilding, faEnvelope, faPlus, faMicrochip } from '@fortawesome/free-solid-svg-icons'; // Adicionado faPlus e faMicrochip

/**
 * Componente de layout para a seção de "Cadastros Gerais".
 * Renderiza um título padrão e a navegação por abas, e usa o <Outlet>
 * do React Router para renderizar o conteúdo da rota aninhada ativa
 * (seja uma lista ou um formulário).
 */
function CadastrosGeraisPage() {
  const location = useLocation();

  // A lógica para determinar se as abas de navegação devem ser exibidas.
  // Elas são ocultadas quando o usuário está em uma rota de formulário de EDIÇÃO
  // para dar mais foco à tarefa. A aba "Adicionar Equipamento" sempre será visível.
  const mostrarAbas = !/editar/.test(location.pathname); // Modificado para ocultar abas APENAS na edição.

  return (
    <div className="page-content-wrapper">
      <div className="page-title-card">
        <h1 className="page-title-internal">Cadastros Gerais</h1>
      </div>
      
      {/* A navegação por abas é renderizada, exceto quando em modo de edição. */}
      {mostrarAbas && (
        <div className="tabs-navigation">
          <NavLink 
            to="/cadastros/unidades" 
            className={({ isActive }) => `tab-button ${isActive ? 'active' : ''}`}
          >
            <FontAwesomeIcon icon={faBuilding} /> Unidades
          </NavLink>
          {/* NOVA ABA: Adicionar Equipamento */}
          <NavLink 
            to="/cadastros/equipamentos/adicionar" 
            className={({ isActive }) => `tab-button ${isActive ? 'active' : ''}`}
          >
            <FontAwesomeIcon icon={faPlus} /> <FontAwesomeIcon icon={faMicrochip} /> Add Equipamento
          </NavLink>
          <NavLink 
              to="/cadastros/emails" 
              className={({ isActive }) => `tab-button ${isActive ? 'active' : ''}`}
            >
              <FontAwesomeIcon icon={faEnvelope} /> E-mails de Notificação
            </NavLink>
        </div>
        )}

      {/* O <Outlet> é o marcador de posição onde o React Router irá renderizar o
        componente correspondente à rota filha que foi acessada.
      */}
      <div className="tab-content-container">
        <Outlet /> 
      </div>
    </div>
  );
}

export default CadastrosGeraisPage;
