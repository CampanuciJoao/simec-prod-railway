// Ficheiro: src/components/EquipamentoForm.jsx
// VERSÃO 8.0 - COM CHECKBOX INTELIGENTE PARA "SEM PATRIMÔNIO"

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimes, faSpinner } from '@fortawesome/free-solid-svg-icons';
import DateInput from './DateInput';
import { getUnidades } from '../services/api';
import { useToast } from '../contexts/ToastContext';

const ESTADO_INICIAL_VAZIO = {
  tag: '', modelo: '', tipo: '', setor: '', unidadeId: '', fabricante: '',
  anoFabricacao: '', dataInstalacao: '', status: 'Operante',
  numeroPatrimonio: '', registroAnvisa: '', observacoes: ''
};

const OPCOES_STATUS = [
    { valor: 'Operante', rotulo: 'Operante' },
    { valor: 'Inoperante', rotulo: 'Inoperante' },
    { valor: 'UsoLimitado', rotulo: 'Uso Limitado' },
    { valor: 'EmManutencao', rotulo: 'Em Manutenção' },
];

function EquipamentoForm({ onSubmit, onCancel, initialData = null, isEditing = false }) {
  const [formData, setFormData] = useState(ESTADO_INICIAL_VAZIO);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unidadesDisponiveis, setUnidadesDisponiveis] = useState([]);
  const [error, setError] = useState('');
  
  // NOVO: Estado para o checkbox de Sem Patrimônio
  const [semPatrimonio, setSemPatrimonio] = useState(false);

  const { addToast } = useToast();
  const navigate = useNavigate();

  // Carrega as unidades ao montar o componente
  useEffect(() => {
    getUnidades()
      .then(data => setUnidadesDisponiveis(data.sort((a, b) => a.nomeSistema.localeCompare(b.nomeSistema))))
      .catch(() => addToast('Erro ao carregar lista de unidades.', 'error'));
  }, [addToast]);

  // Preenche o formulário se estiver em modo de edição
  useEffect(() => {
    if (isEditing && initialData) {
      // Verifica se o patrimônio vindo do banco é "Sem Patrimônio" para marcar o checkbox
      const isSemPat = initialData.numeroPatrimonio?.toLowerCase() === "sem patrimônio";
      setSemPatrimonio(isSemPat);

      setFormData({
        tag: initialData.tag || '',
        modelo: initialData.modelo || '',
        tipo: initialData.tipo || '',
        setor: initialData.setor || '',
        unidadeId: initialData.unidade?.id || initialData.unidadeId || '',
        fabricante: initialData.fabricante || '',
        anoFabricacao: initialData.anoFabricacao || '',
        dataInstalacao: initialData.dataInstalacao ? initialData.dataInstalacao.split('T')[0] : '',
        status: initialData.status || 'Operante',
        numeroPatrimonio: initialData.numeroPatrimonio || '',
        registroAnvisa: initialData.registroAnvisa || '',
        observacoes: initialData.observacoes || ''
      });
    } else {
      setFormData(ESTADO_INICIAL_VAZIO);
      setSemPatrimonio(false);
    }
  }, [initialData, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // NOVO: Handler para o Checkbox de Sem Patrimônio
  const handleCheckboxChange = (e) => {
    const checked = e.target.checked;
    setSemPatrimonio(checked);
    
    if (checked) {
      // Se marcou, preenche com o texto padrão
      setFormData(prev => ({ ...prev, numeroPatrimonio: 'Sem Patrimônio' }));
    } else {
      // Se desmarcou, limpa para o usuário digitar um número real
      setFormData(prev => ({ ...prev, numeroPatrimonio: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.tag || !formData.modelo || !formData.tipo || !formData.unidadeId) {
      setError('Tag (Nº Série), Modelo, Tipo e Unidade são campos obrigatórios.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (apiError) {
      setError(apiError.response?.data?.message || apiError.message || 'Erro ao salvar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelClick = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/equipamentos');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-elegante">
      {error && <p className="form-error">{error}</p>}
      
      <div className="form-section">
        <h4>Informações Gerais</h4>
        <div className="info-grid grid-cols-3">
          <div className="form-group">
            <label htmlFor="tag">Nº Série (Tag) *</label>
            <input type="text" id="tag" name="tag" value={formData.tag} onChange={handleChange} required disabled={isEditing} />
          </div>
          <div className="form-group">
            <label htmlFor="modelo">Modelo *</label>
            <input type="text" id="modelo" name="modelo" value={formData.modelo} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="tipo">Tipo *</label>
            <input type="text" id="tipo" name="tipo" value={formData.tipo} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="unidadeId">Unidade / Hospital *</label>
            <select id="unidadeId" name="unidadeId" value={formData.unidadeId} onChange={handleChange} required>
              <option value="">Selecione uma Unidade</option>
              {unidadesDisponiveis.map(unidade => (
                <option key={unidade.id} value={unidade.id}>{unidade.nomeSistema}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="setor">Localização / Setor</label>
            <input type="text" id="setor" name="setor" value={formData.setor} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select id="status" name="status" value={formData.status} onChange={handleChange}>
              {OPCOES_STATUS.map(opt => (
                <option key={opt.valor} value={opt.valor}>{opt.rotulo}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      <div className="form-section">
        <h4>Detalhes Técnicos e de Controle</h4>
        <div className="info-grid grid-cols-3">
            <div className="form-group">
              <label htmlFor="fabricante">Fabricante</label>
              <input type="text" id="fabricante" name="fabricante" value={formData.fabricante} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label htmlFor="anoFabricacao">Ano Fabricação</label>
              <input type="number" id="anoFabricacao" name="anoFabricacao" value={formData.anoFabricacao} onChange={handleChange} placeholder="ex: 2024" />
            </div>
            <div className="form-group">
              <label htmlFor="dataInstalacao">Data Instalação</label>
              <DateInput id="dataInstalacao" name="dataInstalacao" value={formData.dataInstalacao} onChange={handleChange} />
            </div>

            {/* CAMPO DE PATRIMÔNIO ATUALIZADO COM CHECKBOX */}
            <div className="form-group">
              <label htmlFor="numeroPatrimonio">Número de Patrimônio</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input 
                  type="text" 
                  id="numeroPatrimonio" 
                  name="numeroPatrimonio" 
                  value={formData.numeroPatrimonio} 
                  onChange={handleChange} 
                  disabled={semPatrimonio}
                  placeholder={semPatrimonio ? "" : "Digite o número"}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82em', cursor: 'pointer', fontWeight: 'normal', color: 'var(--cor-texto-secundario-light)' }}>
                  <input 
                    type="checkbox" 
                    checked={semPatrimonio} 
                    onChange={handleCheckboxChange} 
                  />
                  Equipamento sem etiqueta de patrimônio
                </label>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="registroAnvisa">Registro ANVISA</label>
              <input type="text" id="registroAnvisa" name="registroAnvisa" value={formData.registroAnvisa} onChange={handleChange} />
            </div>
        </div>
        <div className="form-group" style={{marginTop: '20px'}}>
            <label htmlFor="observacoes">Observações</label>
            <textarea id="observacoes" name="observacoes" rows="3" value={formData.observacoes} onChange={handleChange}></textarea>
        </div>
      </div>
      
      <div className="form-actions" style={{ justifyContent: 'flex-end', display: 'flex', gap: '10px' }}>
        <button type="button" className="btn btn-secondary" onClick={handleCancelClick} disabled={isSubmitting}>
          <FontAwesomeIcon icon={faTimes} /> Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          <FontAwesomeIcon icon={isSubmitting ? faSpinner : faSave} spin={isSubmitting} /> {isSubmitting ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Adicionar Equipamento')}
        </button>
      </div>
    </form>
  );
}

EquipamentoForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func,
  initialData: PropTypes.object,
  isEditing: PropTypes.bool,
};

export default EquipamentoForm;