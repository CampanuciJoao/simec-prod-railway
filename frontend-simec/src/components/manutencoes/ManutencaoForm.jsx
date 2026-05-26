import React from 'react';
import PropTypes from 'prop-types';

import {
  Button,
  DateInput,
  Input,
  PageSection,
  Select,
  Textarea,
  TimeInput,
} from '@/components/ui';

import { useManutencaoForm } from '@/hooks/manutencoes/useManutencaoForm';
import { equipamentoLabel, equipamentoSortKey } from '@/utils/equipamentos/equipamentoLabel';

function ManutencaoForm({
  initialData,
  onSubmit,
  isEditing,
  isSubmitting = false,
  submitError = '',
  todosEquipamentos,
  unidadesDisponiveis,
}) {
  const {
    formData,
    handleChange,
    equipamentosFiltrados,
    unidades,
    isCorretiva,
    intervaloValido,
    fieldErrors,
    isValid,
  } = useManutencaoForm({
    initialData,
    equipamentos: todosEquipamentos,
    unidades: unidadesDisponiveis,
  });

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isValid || isSubmitting) return;

    // try/catch defensivo — onSubmit ja trata o erro internamente
    // (toast + submitError state). Evita unhandled promise rejection
    // no console quando o backend retorna 409/422/etc.
    try {
      await onSubmit(formData);
    } catch {
      /* erro ja foi exibido inline (submitError) + toast */
    }
  };

  const unidadesOptions = (unidades || []).map((unidade) => ({
    value: unidade.id,
    label: unidade.nomeSistema,
  }));

  const equipamentosOptions = [...(equipamentosFiltrados || [])]
    .sort((a, b) => equipamentoSortKey(a).localeCompare(equipamentoSortKey(b), 'pt-BR'))
    .map((equipamento) => ({
      value: equipamento.id,
      label: equipamentoLabel(equipamento),
    }));

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PageSection title="Equipamento e classificação">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Select
            label="Unidade"
            value={formData.unidadeId}
            onChange={(event) => handleChange('unidadeId', event.target.value)}
            options={unidadesOptions}
          />

          <Select
            label="Equipamento"
            value={formData.equipamentoId}
            onChange={(event) =>
              handleChange('equipamentoId', event.target.value)
            }
            options={equipamentosOptions}
            disabled={!formData.unidadeId}
          />

          <Select
            label="Tipo"
            value={formData.tipo}
            onChange={(event) => handleChange('tipo', event.target.value)}
            options={[
              { value: 'Preventiva', label: 'Preventiva' },
              { value: 'Calibracao', label: 'Calibração' },
              { value: 'Inspecao',   label: 'Inspeção' },
            ]}
          />

          <Input
            label="Técnico responsável"
            value={formData.tecnicoResponsavel}
            onChange={(event) =>
              handleChange('tecnicoResponsavel', event.target.value)
            }
          />
        </div>

        {formData.unidadeId && equipamentosOptions.length === 0 ? (
          <div
            className="mt-4 rounded-xl border px-4 py-3 text-sm"
            style={{
              backgroundColor: 'var(--color-warning-soft)',
              borderColor: 'var(--color-warning)',
              color: 'var(--color-warning)',
            }}
          >
            Nenhum equipamento encontrado para a unidade selecionada.
          </div>
        ) : null}
      </PageSection>

      <PageSection title="Descrição e contexto">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {isCorretiva ? (
            <Input
              label="Número do chamado"
              value={formData.numeroChamado}
              onChange={(event) =>
                handleChange('numeroChamado', event.target.value)
              }
              required
            />
          ) : null}

          <div className="lg:col-span-2">
            <Textarea
              label="Descrição do serviço"
              value={formData.descricaoProblemaServico}
              onChange={(event) =>
                handleChange('descricaoProblemaServico', event.target.value)
              }
              rows={5}
              required={isCorretiva}
            />
          </div>
        </div>
      </PageSection>

      <PageSection title="Agendamento">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <DateInput
              label="Data de início"
              value={formData.agendamentoDataInicioLocal}
              onChange={(event) =>
                handleChange('agendamentoDataInicioLocal', event.target.value)
              }
            />

            <TimeInput
              label="Hora inicial"
              name="agendamentoHoraInicioLocal"
              value={formData.agendamentoHoraInicioLocal}
              onChange={(event) =>
                handleChange('agendamentoHoraInicioLocal', event.target.value)
              }
              error={fieldErrors.agendamentoHoraInicioLocal}
              required
            />
          </div>

          <div className="space-y-4">
            <DateInput
              label="Data de término"
              value={formData.agendamentoDataFimLocal}
              onChange={(event) =>
                handleChange('agendamentoDataFimLocal', event.target.value)
              }
            />

            <TimeInput
              label="Hora final"
              name="agendamentoHoraFimLocal"
              value={formData.agendamentoHoraFimLocal}
              onChange={(event) =>
                handleChange('agendamentoHoraFimLocal', event.target.value)
              }
              error={fieldErrors.agendamentoHoraFimLocal}
              required
            />
          </div>
        </div>

        {!intervaloValido &&
        formData.agendamentoDataInicioLocal &&
        formData.agendamentoHoraInicioLocal &&
        formData.agendamentoDataFimLocal &&
        formData.agendamentoHoraFimLocal &&
        !fieldErrors.agendamentoHoraInicioLocal &&
        !fieldErrors.agendamentoHoraFimLocal ? (
          <div
            className="mt-4 rounded-xl border px-4 py-3 text-sm"
            style={{
              backgroundColor: 'var(--color-danger-soft)',
              borderColor: 'var(--color-danger)',
              color: 'var(--color-danger)',
            }}
          >
            O término precisa ser posterior ao início da manutenção.
          </div>
        ) : null}
      </PageSection>

      {submitError ? (
        <div
          className="rounded-xl border px-4 py-3 text-sm"
          style={{
            backgroundColor: 'var(--color-danger-surface, #fee2e2)',
            borderColor: 'var(--color-danger-soft, #fca5a5)',
            color: 'var(--color-danger, #b91c1c)',
          }}
        >
          <strong>Não foi possível agendar:</strong> {submitError}
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={!isValid || isSubmitting}>
          {isSubmitting
            ? isEditing
              ? 'Salvando...'
              : 'Agendando...'
            : isEditing
              ? 'Salvar alterações'
              : 'Agendar manutenção'}
        </Button>
      </div>
    </form>
  );
}

ManutencaoForm.propTypes = {
  initialData: PropTypes.object,
  onSubmit: PropTypes.func.isRequired,
  isEditing: PropTypes.bool,
  isSubmitting: PropTypes.bool,
  submitError: PropTypes.string,
  todosEquipamentos: PropTypes.arrayOf(PropTypes.object),
  unidadesDisponiveis: PropTypes.arrayOf(PropTypes.object),
};

export default ManutencaoForm;
