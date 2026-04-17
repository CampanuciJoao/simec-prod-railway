import React from 'react';
import PropTypes from 'prop-types';

import {
  Input,
  Select,
  DateInput,
  Button,
  PageSection,
  Textarea,
} from '@/components/ui';

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

  const unidadesOptions = (unidades || []).map((u) => ({
    value: u.id,
    label: u.nomeSistema,
  }));

  const equipamentosOptions = (equipamentosFiltrados || []).map((e) => ({
    value: e.id,
    label: `${e.modelo} (${e.tag || 'Sem TAG'})`,
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PageSection title="Equipamento e classificação">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Select
            label="Unidade"
            value={formData.unidadeId}
            onChange={(e) => handleChange('unidadeId', e.target.value)}
            options={unidadesOptions}
          />

          <Select
            label="Equipamento"
            value={formData.equipamentoId}
            onChange={(e) => handleChange('equipamentoId', e.target.value)}
            options={equipamentosOptions}
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
          />

          <Input
            label="Técnico responsável"
            value={formData.tecnicoResponsavel}
            onChange={(e) => handleChange('tecnicoResponsavel', e.target.value)}
          />
        </div>

        {formData.unidadeId && equipamentosOptions.length === 0 && (
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
        )}
      </PageSection>

      <PageSection title="Descrição e contexto">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {isCorretiva && (
            <Input
              label="Número do chamado"
              value={formData.numeroChamado}
              onChange={(e) => handleChange('numeroChamado', e.target.value)}
            />
          )}

          <div className="lg:col-span-2">
            <Textarea
              label="Descrição do serviço"
              value={formData.descricaoProblemaServico}
              onChange={(e) =>
                handleChange('descricaoProblemaServico', e.target.value)
              }
              rows={5}
            />
          </div>
        </div>
      </PageSection>

      <PageSection title="Agendamento">
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
          />

          <Select
            label="Hora final"
            value={formData.agendamentoHoraFimLocal}
            onChange={(e) =>
              handleChange('agendamentoHoraFimLocal', e.target.value)
            }
            options={HORARIOS_OPTIONS}
          />
        </div>

        {!intervaloValido && (
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
        )}
      </PageSection>

      <div className="flex justify-end">
        <Button type="submit" disabled={!isValid}>
          {isEditing ? 'Salvar alterações' : 'Agendar manutenção'}
        </Button>
      </div>
    </form>
  );
}

export default ManutencaoForm;