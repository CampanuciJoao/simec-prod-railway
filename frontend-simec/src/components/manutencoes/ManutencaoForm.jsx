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

function ManutencaoForm({
  initialData,
  onSubmit,
  isEditing,
  isSubmitting = false,
  todosEquipamentos,
  unidadesDisponiveis,
}) {
  const {
    formData,
    handleChange,
    equipamentosFiltrados,
    unidades,
    isCorretiva,
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

    await onSubmit(formData);
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
      <PageSection title="Equipamento e classificacao">
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
              { value: 'Corretiva', label: 'Corretiva' },
              { value: 'Calibracao', label: 'Calibracao' },
              { value: 'Inspecao', label: 'Inspecao' },
            ]}
          />

          <Input
            label="Tecnico responsavel"
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

      <PageSection title="Agendamento">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DateInput
            label="Data de inicio"
            value={formData.agendamentoDataInicioLocal}
            onChange={(event) =>
              handleChange('agendamentoDataInicioLocal', event.target.value)
            }
          />

          <DateInput
            label="Data de termino"
            value={formData.agendamentoDataFimLocal}
            onChange={(event) =>
              handleChange('agendamentoDataFimLocal', event.target.value)
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
      </PageSection>

      <PageSection title="Descricao e contexto">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {isCorretiva ? (
            <Input
              label="Numero do chamado"
              value={formData.numeroChamado}
              onChange={(event) =>
                handleChange('numeroChamado', event.target.value)
              }
              required
            />
          ) : null}

          <div className="lg:col-span-2">
            <Textarea
              label="Descricao do servico"
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

      <div className="flex justify-end">
        <Button type="submit" disabled={!isValid || isSubmitting}>
          {isSubmitting
            ? isEditing
              ? 'Salvando...'
              : 'Agendando...'
            : isEditing
              ? 'Salvar alteracoes'
              : 'Agendar manutencao'}
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
  todosEquipamentos: PropTypes.arrayOf(PropTypes.object),
  unidadesDisponiveis: PropTypes.arrayOf(PropTypes.object),
};

export default ManutencaoForm;
