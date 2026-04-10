// src/pages/AdicionarEquipamentoPage.jsx
// VERSÃO COMPLETA E ATUALIZADA com Toast Notifications

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addEquipamento } from '../../services/api';
import { useToast } from '../../contexts/ToastContext'; // Importa o hook para usar toasts
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faSave } from '@fortawesome/free-solid-svg-icons';

function AdicionarEquipamentoPage() {
  const navigate = useNavigate();
  const { addToast } = useToast(); // Pega a função para adicionar toasts
  const [formData, setFormData] = useState({
    id: '',
    modelo: '',
    tipo: '',
    setor: '',
    unidade: '',
    fabricante: '',
    ano_fabricacao: '',
    data_instalacao: '',
    status: 'Ativo',
    numeroPatrimonio: '',
    registroAnvisa: '',
    observacoes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    if (!formData.id || !formData.modelo || !formData.tipo) {
      addToast('Nº Série (ID), Modelo e Tipo são campos obrigatórios.', 'error');
      setSubmitting(false);
      return;
    }

    try {
      await addEquipamento(formData);
      addToast('Equipamento adicionado com sucesso!', 'success');
      // Navega de volta para a lista após um pequeno delay para o usuário ver o toast
      setTimeout(() => navigate('/equipamentos'), 1500); 
    } catch (err) {
      console.error(err);
      addToast(err.message || 'Erro ao adicionar equipamento.', 'error');
      setSubmitting(false);
    }
    // Não precisa mais do `finally` aqui se a navegação acontece no sucesso
  };

  return (
    <div className="page-content-wrapper">
      <div className="page-title-card">
        <h1 className="page-title-internal">Adicionar Novo Equipamento</h1>
        <button className="btn btn-secondary" onClick={() => navigate('/equipamentos')}>
          <FontAwesomeIcon icon={faArrowLeft} /> Voltar
        </button>
      </div>

      <section className="page-section">
        <form onSubmit={handleSubmit}>
          {/* O JSX do formulário continua o mesmo */}
          <div className="info-grid" style={{ marginBottom: '20px' }}>
            <div className="form-group"><label htmlFor="id">Nº Série (ID) *</label><input type="text" id="id" name="id" value={formData.id} onChange={handleChange} required /></div>
            <div className="form-group"><label htmlFor="modelo">Modelo *</label><input type="text" id="modelo" name="modelo" value={formData.modelo} onChange={handleChange} required /></div>
            <div className="form-group"><label htmlFor="tipo">Tipo *</label><input type="text" id="tipo" name="tipo" value={formData.tipo} onChange={handleChange} required /></div>
            <div className="form-group"><label htmlFor="unidade">Unidade / Hospital</label><input type="text" id="unidade" name="unidade" value={formData.unidade} onChange={handleChange} /></div>
            <div className="form-group"><label htmlFor="setor">Localização / Setor</label><input type="text" id="setor" name="setor" value={formData.setor} onChange={handleChange} /></div>
            <div className="form-group"><label htmlFor="fabricante">Fabricante</label><input type="text" id="fabricante" name="fabricante" value={formData.fabricante} onChange={handleChange} /></div>
            <div className="form-group"><label htmlFor="ano_fabricacao">Ano Fabricação</label><input type="number" id="ano_fabricacao" name="ano_fabricacao" value={formData.ano_fabricacao} onChange={handleChange} /></div>
            <div className="form-group"><label htmlFor="data_instalacao">Data Instalação</label><input type="date" id="data_instalacao" name="data_instalacao" value={formData.data_instalacao} onChange={handleChange} /></div>
            <div className="form-group"><label htmlFor="status">Status</label><select id="status" name="status" value={formData.status} onChange={handleChange}><option value="Ativo">Ativo</option><option value="Inativo">Inativo</option><option value="Pendente Instalação">Pendente Instalação</option><option value="Em Manutenção">Em Manutenção</option></select></div>
          </div>
          <div className="info-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '20px' }}>
            <div className="form-group"><label htmlFor="numeroPatrimonio">Número de Patrimônio</label><input type="text" id="numeroPatrimonio" name="numeroPatrimonio" value={formData.numeroPatrimonio} onChange={handleChange} /></div>
            <div className="form-group"><label htmlFor="registroAnvisa">Registro ANVISA</label><input type="text" id="registroAnvisa" name="registroAnvisa" value={formData.registroAnvisa} onChange={handleChange} /></div>
          </div>
          <div className="form-group"><label htmlFor="observacoes">Observações</label><textarea id="observacoes" name="observacoes" rows="4" value={formData.observacoes} onChange={handleChange}></textarea></div>
          <div className="form-actions" style={{ justifyContent: 'flex-start', marginTop: '30px' }}>
            <button type="submit" className="btn btn-primary" disabled={submitting}><FontAwesomeIcon icon={faSave} /> {submitting ? 'Salvando...' : 'Salvar Equipamento'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default AdicionarEquipamentoPage;