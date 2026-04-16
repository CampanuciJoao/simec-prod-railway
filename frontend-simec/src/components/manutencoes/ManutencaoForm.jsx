import React from 'react';
import PropTypes from 'prop-types';

import Input from '@/components/ui/primitives/Input';
import Select from '@/components/ui/primitives/Select';
import DateInput from '@/components/ui/primitives/DateInput';
import Button from '@/components/ui/primitives/Button';
import PageSection from '@/components/ui/layout/PageSection';

import { useManutencaoForm } from '@/hooks/manutencoes/useManutencaoForm';

function gerarHorarios(intervaloMinutos = 30) {
  const options = [];

  for (let hora = 0; hora < 24; hora += 1) {
    for (let minuto = 0; minuto < 60; minuto += intervaloMinutos) {
      const hh = String(hora).padStart(2, '0');
      const mm = String(minuto).padStart(2, '0');

      options.push({
        value: `${hh}:${mm}`,
        label: `${hh}:${mm}`,
      });
    }
  }

  return options;
}

const HORARIOS_OPTIONS = gerarHorarios(30);

function ManutencaoForm({
  initialData,
  onSubmit,
  isEditing,
  todosEquipamentos,
  unidadesDisponiveis,
}) {
  const {
    formData,
    handleChange,
    equipamentosFiltrados,
    unidades,
    unidadeSelecionada,
    isCorretiva,
    intervaloValido,
    isValid,
  } = useManutencaoForm({
    initialData,
    equipamentos: todosEquipamentos,
    unidades: unidadesDisponiveis,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;
    onSubmit(formData);
  };

  const unidadesOptions = (unidades || []).map((unidade) => ({
    value: unidade.id,
    label: unidade.nomeSistema,
  }));

  const equipamentosOptions = (equipamentosFiltrados || []).map((equipamento) => ({
    value: equipamento.id,
    label: `${equipamento.modelo} (${equipamento.tag || 'Sem TAG'})`,
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PageSection
        title="Equipamento e classificação"
        description="Selecione o ativo, o tipo da manutenção e o responsável previsto."
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Select
            label="Unidade"
            value={formData.unidadeId}
            onChange={(e) => handleChange('unidadeId', e.target.value)}
            options={unidadesOptions}
            placeholder="Selecione a unidade"
          />

          <Select
            label="Equipamento"
            value={formData.equipamentoId}
            onChange={(e) => handleChange('equipamentoId', e.target.value)}
            options={equipamentosOptions}
            placeholder={
              formData.unidadeId
                ? 'Selecione o equipamento'
                : 'Selecione uma unidade primeiro'
            }
            disabled={!formData.unidadeId}
          />

          <Select
            label="Tipo"
            value={formData.tipo}
            onChange={(e) => handleChange('tipo', e.target.value)}
            options={[
              { value: 'Preventiva', label: 'Preventiva' },
              { value: 'Corretiva', label: 'Corretiva' },
              { value: 'Calibracao', label: 'Calibração' },
              { value: 'Inspecao', label: 'Inspeção' },
            ]}
            placeholder="Selecione o tipo"
          />

          <Input
            label="Técnico responsável"
            value={formData.tecnicoResponsavel}
            onChange={(e) => handleChange('tecnicoResponsavel', e.target.value)}
            placeholder="Nome do responsável"
          />
        </div>

        {formData.unidadeId && equipamentosOptions.length === 0 ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Nenhum equipamento encontrado para a unidade selecionada.
          </div>
        ) : null}

        {unidadeSelecionada ? (
          <div className="mt-4 text-sm text-slate-500">
            Unidade selecionada:{' '}
            <span className="font-medium text-slate-700">
              {unidadeSelecionada.nomeSistema}
            </span>
          </div>
        ) : null}
      </PageSection>

      <PageSection
        title="Descrição e contexto"
        description={
          isCorretiva
            ? 'Para manutenção corretiva, descrição e número do chamado são obrigatórios.'
            : 'Na preventiva, a descrição é opcional. Se vier vazia, o backend preencherá automaticamente.'
        }
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {isCorretiva ? (
            <Input
              label="Número do chamado"
              value={formData.numeroChamado}
              onChange={(e) => handleChange('numeroChamado', e.target.value)}
              placeholder="Informe o número do chamado"
            />
          ) : (
            <div className="hidden lg:block" />
          )}

          <div className={isCorretiva ? 'lg:col-span-2' : 'lg:col-span-2'}>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Descrição do serviço
            </label>

            <textarea
              value={formData.descricaoProblemaServico}
              onChange={(e) =>
                handleChange('descricaoProblemaServico', e.target.value)
              }
              rows={5}
              placeholder={
                isCorretiva
                  ? 'Descreva o problema, contexto e serviço a ser executado'
                  : 'Opcional para preventiva'
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>
        </div>
      </PageSection>

      <PageSection
        title="Agendamento"
        description="Informe o início e o término previstos da manutenção."
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DateInput
            label="Data de início"
            value={formData.agendamentoDataInicioLocal}
            onChange={(e) =>
              handleChange('agendamentoDataInicioLocal', e.target.value)
            }
          />

          <DateInput
            label="Data de término"
            value={formData.agendamentoDataFimLocal}
            onChange={(e) =>
              handleChange('agendamentoDataFimLocal', e.target.value)
            }
          />

          <Select
            label="Hora inicial"
            value={formData.agendamentoHoraInicioLocal}
            onChange={(e) =>
              handleChange('agendamentoHoraInicioLocal', e.target.value)
            }
            options={HORARIOS_OPTIONS}
            placeholder="Selecione o horário"
          />

          <Select
            label="Hora final"
            value={formData.agendamentoHoraFimLocal}
            onChange={(e) =>
              handleChange('agendamentoHoraFimLocal', e.target.value)
            }
            options={HORARIOS_OPTIONS}
            placeholder="Selecione o horário"
          />
        </div>

        {!intervaloValido &&
        formData.agendamentoDataInicioLocal &&
        formData.agendamentoHoraInicioLocal &&
        formData.agendamentoDataFimLocal &&
        formData.agendamentoHoraFimLocal ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            O término precisa ser posterior ao início da manutenção.
          </div>
        ) : null}
      </PageSection>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="submit" disabled={!isValid}>
          {isEditing ? 'Salvar alterações' : 'Agendar manutenção'}
        </Button>
      </div>
    </form>
  );
}

ManutencaoForm.propTypes = {
  initialData: PropTypes.object,
  onSubmit: PropTypes.func.isRequired,
  isEditing: PropTypes.bool,
  todosEquipamentos: PropTypes.array,
  unidadesDisponiveis: PropTypes.array,
};

export default ManutencaoForm;