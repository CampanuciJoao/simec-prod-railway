// Ficheiro: src/components/ManutencaoForm.jsx
// VERSÃO 2.0 - FIX: BOTÕES VISÍVEIS E DESIGN CLEAN

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import DateInput from './DateInput';
import TimeInput from './TimeInput';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faSave, faTimes } from '@fortawesome/free-solid-svg-icons';

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
      {error && <div className="form-error bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm font-bold border border-red-100">{error}</div>}
      
      <div className="form-section">
        <h4 className="text-slate-800 font-bold uppercase text-xs tracking-widest mb-4">Seleção de Equipamento</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="form-group">
            <label className="text-[11px] font-black uppercase text-slate-400 mb-1 block">Unidade / Local *</label>
            <select className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={unidadeSelecionada} onChange={handleUnidadeChange} required disabled={isEditing}>
              <option value="">Selecione a Unidade</option>
              {unidadesDisponiveis.map(unidade => ( <option key={unidade.id} value={unidade.id}>{unidade.nomeSistema}</option> ))}
            </select>
          </div>
          <div className="form-group">
            <label className="text-[11px] font-black uppercase text-slate-400 mb-1 block">Modelo *</label>
            <select className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={modeloSelecionado} onChange={handleModeloChange} required disabled={!unidadeSelecionada || isEditing}>
              <option value="">Selecione o Modelo</option>
              {modelosFiltrados.map(modelo => ( <option key={modelo} value={modelo}>{modelo}</option> ))}
            </select>
          </div>
          <div className="form-group">
            <label className="text-[11px] font-black uppercase text-slate-400 mb-1 block">Nº de Série (Tag) *</label>
            <select className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all" name="equipamentoId" value={formData.equipamentoId} onChange={handleChange} required disabled={!modeloSelecionado || isEditing}>
              <option value="">Selecione a Tag</option>
              {seriesFiltradas.map(eq => ( <option key={eq.id} value={eq.id}>{eq.tag}</option>))}
            </select>
          </div>
        </div>
      </div>

      <div className="form-section mt-10">
        <h4 className="text-slate-800 font-bold uppercase text-xs tracking-widest mb-4">Detalhes da Manutenção</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-group">
                <label className="text-[11px] font-black uppercase text-slate-400 mb-1 block">Tipo de Manutenção *</label>
                <select className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all" name="tipo" value={formData.tipo} onChange={handleChange} required>
                    {["Preventiva", "Corretiva", "Calibracao", "Inspecao"].map(tipoOpt => (<option key={tipoOpt} value={tipoOpt}>{tipoOpt}</option>))}
                </select>
            </div>
             <div className="form-group">
                <label className="text-[11px] font-black uppercase text-slate-400 mb-1 block">Técnico Responsável</label>
                <input className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all" type="text" name="tecnicoResponsavel" value={formData.tecnicoResponsavel} onChange={handleChange}/>
            </div>
        </div>
        
        {formData.tipo === 'Corretiva' && (
            <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="form-group">
                    <label className="text-[11px] font-black uppercase text-slate-400 mb-1 block">Nº do Chamado (Opcional)</label>
                    <input className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all" type="text" name="numeroChamado" value={formData.numeroChamado} onChange={handleChange} />
                </div>
            </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="form-group">
                <label className="text-[11px] font-black uppercase text-slate-400 mb-1 block">Data do Agendamento *</label>
                <DateInput className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all" name="dataLocal" value={formData.dataLocal} onChange={handleChange} required />
            </div>
            <div className="form-group">
                <label className="text-[11px] font-black uppercase text-slate-400 mb-1 block">Horário de Início</label>
                <TimeInput className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all" name="horaLocalInicio" value={formData.horaLocalInicio} onChange={handleChange} />
            </div>
            <div className="form-group">
                <label className="text-[11px] font-black uppercase text-slate-400 mb-1 block">Previsão de Fim</label>
                <TimeInput className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all" name="horaLocalFim" value={formData.horaLocalFim} onChange={handleChange} />
            </div>
        </div>
        <div className="form-group mt-6">
            <label className="text-[11px] font-black uppercase text-slate-400 mb-1 block">
                Descrição {formData.tipo !== 'Preventiva' ? '*' : '(Opcional para Preventiva)'}
            </label>
            <textarea 
                className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all min-h-[100px]"
                name="descricaoProblemaServico" 
                value={formData.descricaoProblemaServico} 
                onChange={handleChange} 
                rows="4"
            ></textarea>
        </div>
      </div>
      
      {/* BOTÕES CORRIGIDOS: Visibilidade total e Design Clean */}
      <div className="flex justify-end items-center gap-3 mt-10 pt-6 border-t border-slate-100">
        <button 
          type="button" 
          className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-xs uppercase tracking-widest transition-all border-none cursor-pointer" 
          onClick={() => navigate('/manutencoes')} 
          disabled={isSubmitting}
        >
          Cancelar
        </button>
        <button 
          type="submit" 
          className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-black text-xs uppercase tracking-widest transition-all shadow-md hover:shadow-lg border-none cursor-pointer flex items-center gap-2" 
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <><FontAwesomeIcon icon={faSpinner} spin /> Salvando...</>
          ) : (
            <><FontAwesomeIcon icon={faSave} /> {isEditing ? 'Atualizar Manutenção' : 'Agendar Manutenção'}</>
          )}
        </button>
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