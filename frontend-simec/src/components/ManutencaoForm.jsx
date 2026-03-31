// Ficheiro: src/components/ManutencaoForm.jsx
// VERSÃO ATUALIZADA - DESCRIÇÃO OPCIONAL PARA PREVENTIVAS

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import DateInput from './DateInput';
import TimeInput from './TimeInput';

const ESTADO_INICIAL_VAZIO = {
  equipamentoId: '',
  tipo: 'Preventiva',
  descricaoProblemaServico: '',
  tecnicoResponsavel: '',
  dataLocal: '',
  horaLocalInicio: '',
  horaLocalFim: '',
  numeroChamado: '',
};

function ManutencaoForm({ 
  onSubmit, 
  initialData = null, 
  isEditing = false, 
  todosEquipamentos = [], 
  unidadesDisponiveis = [] 
}) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(ESTADO_INICIAL_VAZIO);
  const [unidadeSelecionada, setUnidadeSelecionada] = useState('');
  const [modeloSelecionado, setModeloSelecionado] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditing && initialData && todosEquipamentos.length > 0) {
      const equipamentoDaOs = todosEquipamentos.find(eq => eq.id === initialData.equipamentoId);
      if (equipamentoDaOs) {
        setUnidadeSelecionada(equipamentoDaOs.unidadeId || '');
        setModeloSelecionado(equipamentoDaOs.modelo || '');
      }
      
      const dataInicio = initialData.dataHoraAgendamentoInicio ? new Date(initialData.dataHoraAgendamentoInicio) : null;
      const dataFim = initialData.dataHoraAgendamentoFim ? new Date(initialData.dataHoraAgendamentoFim) : null;
      
      setFormData({
        equipamentoId: initialData.equipamentoId || '',
        tipo: initialData.tipo || 'Preventiva',
        descricaoProblemaServico: initialData.descricaoProblemaServico || '',
        tecnicoResponsavel: initialData.tecnicoResponsavel || '',
        dataLocal: dataInicio ? dataInicio.toISOString().split('T')[0] : '',
        horaLocalInicio: dataInicio ? dataInicio.toTimeString().slice(0, 5) : '',
        horaLocalFim: dataFim ? dataFim.toTimeString().slice(0, 5) : '',
        numeroChamado: initialData.numeroChamado || '',
      });
    } else {
      setFormData(ESTADO_INICIAL_VAZIO);
    }
  }, [initialData, isEditing, todosEquipamentos]);
  
  const modelosFiltrados = useMemo(() => {
    if (!unidadeSelecionada) return [];
    return [...new Set(todosEquipamentos.filter(eq => eq.unidadeId === unidadeSelecionada).map(eq => eq.modelo))].sort();
  }, [unidadeSelecionada, todosEquipamentos]);

  const seriesFiltradas = useMemo(() => {
    if (!unidadeSelecionada || !modeloSelecionado) return [];
    return todosEquipamentos.filter(eq => eq.unidadeId === unidadeSelecionada && eq.modelo === modeloSelecionado);
  }, [unidadeSelecionada, modeloSelecionado, todosEquipamentos]);

  const handleUnidadeChange = (e) => {
    setUnidadeSelecionada(e.target.value);
    setModeloSelecionado('');
    setFormData(prev => ({ ...prev, equipamentoId: '' }));
  };

  const handleModeloChange = (e) => {
    setModeloSelecionado(e.target.value);
    setFormData(prev => ({ ...prev, equipamentoId: '' }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // LÓGICA DE VALIDAÇÃO CONDICIONAL
    const isPreventiva = formData.tipo === 'Preventiva';
    const temDescricao = formData.descricaoProblemaServico.trim() !== '';

    if (!formData.equipamentoId || !formData.dataLocal || (!isPreventiva && !temDescricao)) {
      setError(isPreventiva ? 'Seleção de Equipamento e Data são obrigatórios.' : 'Seleção de Equipamento, Data e Descrição são obrigatórios.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const dataHoraInicioLocal = new Date(`${formData.dataLocal}T${formData.horaLocalInicio || '00:00:00'}`);
      const dataHoraFimLocal = formData.horaLocalFim ? new Date(`${formData.dataLocal}T${formData.horaLocalFim}:00`) : null;

      const dadosParaApi = {
          equipamentoId: formData.equipamentoId,
          tipo: formData.tipo,
          // Se for preventiva e estiver vazio, coloca um texto padrão
          descricaoProblemaServico: !temDescricao && isPreventiva ? 'Manutenção Preventiva de Rotina' : formData.descricaoProblemaServico,
          tecnicoResponsavel: formData.tecnicoResponsavel,
          numeroChamado: formData.numeroChamado,
          dataHoraAgendamentoInicio: dataHoraInicioLocal.toISOString(),
          dataHoraAgendamentoFim: dataHoraFimLocal && !isNaN(dataHoraFimLocal) ? dataHoraFimLocal.toISOString() : null,
      };

      await onSubmit(dadosParaApi);
    } catch (apiError) {
      setError(apiError.response?.data?.message || `Erro ao processar manutenção.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-elegante" noValidate>
      {error && <div className="form-error">{error}</div>}
      
      <div className="form-section">
        <h4>Seleção de Equipamento</h4>
        <div className="info-grid grid-cols-3">
          <div className="form-group">
            <label htmlFor="unidade">Unidade / Local *</label>
            <select id="unidade" value={unidadeSelecionada} onChange={handleUnidadeChange} required disabled={isEditing}>
              <option value="">Selecione a Unidade</option>
              {unidadesDisponiveis.map(unidade => ( <option key={unidade.id} value={unidade.id}>{unidade.nomeSistema}</option> ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="modelo">Modelo *</label>
            <select id="modelo" value={modeloSelecionado} onChange={handleModeloChange} required disabled={!unidadeSelecionada || isEditing}>
              <option value="">Selecione o Modelo</option>
              {modelosFiltrados.map(modelo => ( <option key={modelo} value={modelo}>{modelo}</option> ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="equipamentoId">Nº de Série (Tag) *</label>
            <select id="equipamentoId" name="equipamentoId" value={formData.equipamentoId} onChange={handleChange} required disabled={!modeloSelecionado || isEditing}>
              <option value="">Selecione a Tag</option>
              {seriesFiltradas.map(eq => ( <option key={eq.id} value={eq.id}>{eq.tag}</option>))}
            </select>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h4>Detalhes da Manutenção</h4>
        <div className="info-grid grid-cols-2">
            <div className="form-group">
                <label htmlFor="tipo">Tipo de Manutenção *</label>
                <select id="tipo" name="tipo" value={formData.tipo} onChange={handleChange} required>
                    {["Preventiva", "Corretiva", "Calibracao", "Inspecao"].map(tipoOpt => (<option key={tipoOpt} value={tipoOpt}>{tipoOpt}</option>))}
                </select>
            </div>
             <div className="form-group">
                <label htmlFor="tecnicoResponsavel">Técnico Responsável</label>
                <input type="text" id="tecnicoResponsavel" name="tecnicoResponsavel" value={formData.tecnicoResponsavel} onChange={handleChange}/>
            </div>
        </div>
        
        {formData.tipo === 'Corretiva' && (
            <div className="info-grid grid-cols-1" style={{ marginTop: '15px', border: '1px solid var(--cor-borda-light)', padding: '15px', borderRadius: '8px', background: 'var(--cor-fundo-pagina-light)' }}>
                <div className="form-group" style={{marginBottom: 0}}>
                    <label htmlFor="numeroChamado">Nº do Chamado (Opcional)</label>
                    <input type="text" id="numeroChamado" name="numeroChamado" value={formData.numeroChamado} onChange={handleChange} />
                </div>
            </div>
        )}
        
        <div className="info-grid grid-cols-3" style={{alignItems: 'flex-end', marginTop: '15px'}}>
            <div className="form-group">
                <label htmlFor="dataLocal">Data do Agendamento *</label>
                <DateInput id="dataLocal" name="dataLocal" value={formData.dataLocal} onChange={handleChange} required />
            </div>
            <div className="form-group">
                <label htmlFor="horaLocalInicio">Horário de Início</label>
                <TimeInput id="horaLocalInicio" name="horaLocalInicio" value={formData.horaLocalInicio} onChange={handleChange} />
            </div>
            <div className="form-group">
                <label htmlFor="horaLocalFim">Previsão de Fim</label>
                <TimeInput id="horaLocalFim" name="horaLocalFim" value={formData.horaLocalFim} onChange={handleChange} />
            </div>
        </div>
        <div className="form-group" style={{marginTop: '15px'}}>
            <label htmlFor="descricaoProblemaServico">
                Descrição do Problema/Serviço {formData.tipo !== 'Preventiva' ? '*' : '(Opcional para Preventiva)'}
            </label>
            <textarea 
                id="descricaoProblemaServico" 
                name="descricaoProblemaServico" 
                value={formData.descricaoProblemaServico} 
                onChange={handleChange} 
                rows="4"
            ></textarea>
        </div>
      </div>
      
      <div className="form-actions" style={{ justifyContent: 'flex-end', gap: '10px' }}>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/manutencoes')} disabled={isSubmitting}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : (isEditing ? 'Atualizar Manutenção' : 'Agendar Manutenção')}</button>
      </div>
    </form>
  );
}

ManutencaoForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  initialData: PropTypes.object,
  isEditing: PropTypes.bool,
  todosEquipamentos: PropTypes.array,
  unidadesDisponiveis: PropTypes.array,
};

export default ManutencaoForm;