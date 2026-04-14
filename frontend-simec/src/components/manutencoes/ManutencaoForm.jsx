// src/components/manutencoes/ManutencaoForm.jsx

import React from 'react';

import Input from '../ui/primitives/Input';
import Select from '../ui/primitives/Select';
import DateInput from '../ui/primitives/DateInput';
import TimeInput from '../ui/primitives/TimeInput';
import Button from '../ui/primitives/Button';
import PageSection from '../ui/PageSection';
import ResponsiveGrid from '../ui/ResponsiveGrid';

import { useManutencaoForm } from '../../hooks/manutencoes/useManutencaoForm';

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
    isCorretiva,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {/* EQUIPAMENTO */}
      <PageSection title="Equipamento">
        <ResponsiveGrid cols={2}>
          <Select
            label="Unidade"
            value={formData.unidadeId || ''}
            onChange={(e) => handleChange('unidadeId', e.target.value)}
            options={unidades.map((u) => ({
              value: u.id,
              label: u.nomeSistema,
            }))}
          />

          <Select
            label="Equipamento"
            value={formData.equipamentoId}
            onChange={(e) => handleChange('equipamentoId', e.target.value)}
            options={equipamentosFiltrados.map((e) => ({
              value: e.id,
              label: `${e.modelo} (${e.tag})`,
            }))}
          />
        </ResponsiveGrid>
      </PageSection>

      {/* TIPO */}
      <PageSection title="Tipo de Manutenção">
        <Select
          value={formData.tipo}
          onChange={(e) => handleChange('tipo', e.target.value)}
          options={[
            { value: 'Preventiva', label: 'Preventiva' },
            { value: 'Corretiva', label: 'Corretiva' },
            { value: 'Calibracao', label: 'Calibração' },
            { value: 'Inspecao', label: 'Inspeção' },
          ]}
        />
      </PageSection>

      {/* DESCRIÇÃO */}
      <PageSection title="Descrição">
        <Input
          value={formData.descricaoProblemaServico}
          onChange={(e) =>
            handleChange('descricaoProblemaServico', e.target.value)
          }
          placeholder="Descreva o serviço..."
        />
      </PageSection>

      {/* AGENDAMENTO */}
      <PageSection title="Agendamento">
        <ResponsiveGrid cols={3}>
          <DateInput
            value={formData.agendamentoDataLocal}
            onChange={(e) =>
              handleChange('agendamentoDataLocal', e.target.value)
            }
          />

          <TimeInput
            value={formData.agendamentoHoraInicioLocal}
            onChange={(e) =>
              handleChange('agendamentoHoraInicioLocal', e.target.value)
            }
          />

          <TimeInput
            value={formData.agendamentoHoraFimLocal}
            onChange={(e) =>
              handleChange('agendamentoHoraFimLocal', e.target.value)
            }
          />
        </ResponsiveGrid>
      </PageSection>

      {/* CAMPOS CONDICIONAIS */}
      {isCorretiva && (
        <PageSection title="Chamado">
          <Input
            label="Número do chamado"
            value={formData.numeroChamado}
            onChange={(e) =>
              handleChange('numeroChamado', e.target.value)
            }
          />
        </PageSection>
      )}

      {/* RESPONSÁVEL */}
      <PageSection title="Responsável">
        <Input
          value={formData.tecnicoResponsavel}
          onChange={(e) =>
            handleChange('tecnicoResponsavel', e.target.value)
          }
        />
      </PageSection>

      {/* ACTIONS */}
      <div className="flex justify-end">
        <Button type="submit" disabled={!isValid}>
          {isEditing ? 'Salvar alterações' : 'Agendar manutenção'}
        </Button>
      </div>
    </form>
  );
}

export default ManutencaoForm;