import React from 'react';
import PropTypes from 'prop-types';

import {
  Button,
  DateInput,
  FormSection,
  Input,
  ResponsiveGrid,
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormSection
        title="Equipamento e classificação"
        description="Selecione a unidade, o equipamento e o tipo de manutenção."
      >
        <ResponsiveGrid preset="form">
          <Select
            label="Unidade"
            value={formData.unidadeId}
            onChange={(event) => handleChange('unidadeId', event.target.value)}
            options={unidadesOptions}
            required
          />

          <Select
            label="Equipamento"
            value={formData.equipamentoId}
            onChange={(event) =>
              handleChange('equipamentoId', event.target.value)
            }
            options={equipamentosOptions}
            disabled={!formData.unidadeId}
            required
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
            required
          />

          <Input
            label="Técnico responsável"
            value={formData.tecnicoResponsavel}
            onChange={(event) =>
              handleChange('tecnicoResponsavel', event.target.value)
            }
            placeholder="Nome do técnico ou empresa"
          />
        </ResponsiveGrid>

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
      </FormSection>

      <FormSection
        title="Descrição e contexto"
        description="Descreva o problema ou serviço a ser executado."
      >
        <ResponsiveGrid preset="form">
          {isCorretiva ? (
            <Input
              label="Número do chamado"
              value={formData.numeroChamado}
              onChange={(event) =>
                handleChange('numeroChamado', event.target.value)
              }
              required
              placeholder="Ex.: 8765432"
            />
          ) : null}

          <div className="xl:col-span-3 md:col-span-2">
            <Textarea
              label="Descrição do serviço"
              value={formData.descricaoProblemaServico}
              onChange={(event) =>
                handleChange('descricaoProblemaServico', event.target.value)
              }
              rows={5}
              required={isCorretiva}
              placeholder="Detalhe o problema, serviço esperado ou checklist da manutenção..."
            />
          </div>
        </ResponsiveGrid>
      </FormSection>

      <FormSection
        title="Agendamento"
        description="Defina o intervalo de execução previsto da manutenção."
      >
        <ResponsiveGrid preset="form">
          <DateInput
            label="Data de início"
            value={formData.agendamentoDataInicioLocal}
            onChange={(event) =>
              handleChange('agendamentoDataInicioLocal', event.target.value)
            }
            required
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

          <div className="hidden xl:block" aria-hidden="true" />

          <DateInput
            label="Data de término"
            value={formData.agendamentoDataFimLocal}
            onChange={(event) =>
              handleChange('agendamentoDataFimLocal', event.target.value)
            }
            required
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
        </ResponsiveGrid>

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
      </FormSection>

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
