import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faSpinner } from '@fortawesome/free-solid-svg-icons';

import DateInput from '../ui/DateInput';
import TimeInput from '../ui/TimeInput';
import Button from '../ui/Button';
import PageState from '../ui/PageState';

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
  unidadesDisponiveis = [],
}) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(ESTADO_INICIAL_VAZIO);
  const [unidadeSelecionada, setUnidadeSelecionada] = useState('');
  const [modeloSelecionado, setModeloSelecionado] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditing && initialData && todosEquipamentos.length > 0) {
      const equipamentoDaOs = todosEquipamentos.find(
        (eq) => eq.id === initialData.equipamentoId
      );

      if (equipamentoDaOs) {
        setUnidadeSelecionada(equipamentoDaOs.unidadeId || '');
        setModeloSelecionado(equipamentoDaOs.modelo || '');
      }

      const dataInicio = initialData.dataHoraAgendamentoInicio
        ? new Date(initialData.dataHoraAgendamentoInicio)
        : null;
      const dataFim = initialData.dataHoraAgendamentoFim
        ? new Date(initialData.dataHoraAgendamentoFim)
        : null;

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
    return [
      ...new Set(
        todosEquipamentos
          .filter((eq) => eq.unidadeId === unidadeSelecionada)
          .map((eq) => eq.modelo)
      ),
    ].sort();
  }, [unidadeSelecionada, todosEquipamentos]);

  const seriesFiltradas = useMemo(() => {
    if (!unidadeSelecionada || !modeloSelecionado) return [];
    return todosEquipamentos.filter(
      (eq) =>
        eq.unidadeId === unidadeSelecionada && eq.modelo === modeloSelecionado
    );
  }, [unidadeSelecionada, modeloSelecionado, todosEquipamentos]);

  const handleUnidadeChange = (e) => {
    setUnidadeSelecionada(e.target.value);
    setModeloSelecionado('');
    setFormData((prev) => ({ ...prev, equipamentoId: '' }));
  };

  const handleModeloChange = (e) => {
    setModeloSelecionado(e.target.value);
    setFormData((prev) => ({ ...prev, equipamentoId: '' }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const isPreventiva = formData.tipo === 'Preventiva';
    const temDescricao = formData.descricaoProblemaServico.trim() !== '';

    if (!formData.equipamentoId || !formData.dataLocal || (!isPreventiva && !temDescricao)) {
      setError(
        isPreventiva
          ? 'Seleção de equipamento e data são obrigatórios.'
          : 'Seleção de equipamento, data e descrição são obrigatórios.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const dataHoraInicioLocal = new Date(
        `${formData.dataLocal}T${formData.horaLocalInicio || '00:00:00'}`
      );

      const dataHoraFimLocal = formData.horaLocalFim
        ? new Date(`${formData.dataLocal}T${formData.horaLocalFim}:00`)
        : null;

      const dadosParaApi = {
        equipamentoId: formData.equipamentoId,
        tipo: formData.tipo,
        descricaoProblemaServico:
          !temDescricao && isPreventiva
            ? 'Manutenção Preventiva de Rotina'
            : formData.descricaoProblemaServico,
        tecnicoResponsavel: formData.tecnicoResponsavel,
        numeroChamado: formData.numeroChamado,
        dataHoraAgendamentoInicio: dataHoraInicioLocal.toISOString(),
        dataHoraAgendamentoFim:
          dataHoraFimLocal && !isNaN(dataHoraFimLocal)
            ? dataHoraFimLocal.toISOString()
            : null,
      };

      await onSubmit(dadosParaApi);
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Erro ao processar manutenção.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      {error && <PageState error={error} />}

      <div className="space-y-4">
        <div className="border-b border-slate-200 pb-3">
          <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-700">
            Seleção de equipamento
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Unidade / Local
            </label>
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              value={unidadeSelecionada}
              onChange={handleUnidadeChange}
              required
              disabled={isEditing}
            >
              <option value="">Selecione a unidade</option>
              {unidadesDisponiveis.map((unidade) => (
                <option key={unidade.id} value={unidade.id}>
                  {unidade.nomeSistema}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Modelo
            </label>
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              value={modeloSelecionado}
              onChange={handleModeloChange}
              required
              disabled={!unidadeSelecionada || isEditing}
            >
              <option value="">Selecione o modelo</option>
              {modelosFiltrados.map((modelo) => (
                <option key={modelo} value={modelo}>
                  {modelo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Nº de Série (Tag)
            </label>
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              name="equipamentoId"
              value={formData.equipamentoId}
              onChange={handleChange}
              required
              disabled={!modeloSelecionado || isEditing}
            >
              <option value="">Selecione a tag</option>
              {seriesFiltradas.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.tag}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="border-b border-slate-200 pb-3">
          <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-700">
            Detalhes da manutenção
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Tipo de manutenção
            </label>
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              name="tipo"
              value={formData.tipo}
              onChange={handleChange}
              required
            >
              {['Preventiva', 'Corretiva', 'Calibracao', 'Inspecao'].map(
                (tipoOpt) => (
                  <option key={tipoOpt} value={tipoOpt}>
                    {tipoOpt}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Técnico responsável
            </label>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              type="text"
              name="tecnicoResponsavel"
              value={formData.tecnicoResponsavel}
              onChange={handleChange}
            />
          </div>
        </div>

        {formData.tipo === 'Corretiva' && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Nº do chamado
            </label>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              type="text"
              name="numeroChamado"
              value={formData.numeroChamado}
              onChange={handleChange}
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Data do agendamento
            </label>
            <DateInput
              name="dataLocal"
              value={formData.dataLocal}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Horário de início
            </label>
            <TimeInput
              name="horaLocalInicio"
              value={formData.horaLocalInicio}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Previsão de fim
            </label>
            <TimeInput
              name="horaLocalFim"
              value={formData.horaLocalFim}
              onChange={handleChange}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Descrição {formData.tipo !== 'Preventiva' ? '*' : '(opcional para preventiva)'}
          </label>
          <textarea
            className="min-h-[110px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            name="descricaoProblemaServico"
            value={formData.descricaoProblemaServico}
            onChange={handleChange}
            rows={4}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-6">
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate('/manutencoes')}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <FontAwesomeIcon icon={faSpinner} spin />
              Salvando...
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faSave} />
              {isEditing ? 'Atualizar manutenção' : 'Agendar manutenção'}
            </>
          )}
        </Button>
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