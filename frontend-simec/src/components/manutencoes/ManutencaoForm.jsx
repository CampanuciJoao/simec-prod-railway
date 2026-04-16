import React from 'react';
import PropTypes from 'prop-types';

import Input from '@/components/ui/primitives/Input';
import Select from '@/components/ui/primitives/Select';
import DateInput from '@/components/ui/primitives/DateInput';
import TimeInput from '@/components/ui/primitives/TimeInput';
import Button from '@/components/ui/primitives/Button';
import PageSection from '@/components/ui/layout/PageSection';
import ResponsiveGrid from '@/components/ui/layout/ResponsiveGrid';

import { useManutencaoForm } from '@/hooks/manutencoes/useManutencaoForm';

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
    <form onSubmit={handleSubmit} className="space-y-6">
      <PageSection
        title="Equipamento"
        description="Selecione primeiro a unidade e depois o equipamento que receberá a ordem de serviço."
      >
        <ResponsiveGrid cols={{ base: 1, md: 2 }}>
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
        </ResponsiveGrid>

        {formData.unidadeId && equipamentosOptions.length === 0 ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Nenhum equipamento encontrado para a unidade selecionada.
          </div>
        ) : null}

        {unidadeSelecionada ? (
          <div className="mt-4 text-sm text-slate-500">
            Unidade selecionada: <span className="font-medium text-slate-700">{unidadeSelecionada.nomeSistema}</span>
          </div>
        ) : null}
      </PageSection>

      <PageSection
        title="Tipo de Manutenção"
        description="Defina o tipo da ordem de serviço."
      >
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
      </PageSection>

      <PageSection
        title="Descrição"
        description="Descreva de forma objetiva o serviço ou problema a ser tratado."
      >
        <Input
          label="Descrição do serviço"
          value={formData.descricaoProblemaServico}
          onChange={(e) =>
            handleChange('descricaoProblemaServico', e.target.value)
          }
          placeholder="Descreva o serviço..."
        />
      </PageSection>

      <PageSection
        title="Agendamento"
        description="Informe a data e a janela prevista para execução da manutenção."
      >
        <ResponsiveGrid cols={{ base: 1, md: 3 }}>
          <DateInput
            label="Data"
            value={formData.agendamentoDataLocal}
            onChange={(e) =>
              handleChange('agendamentoDataLocal', e.target.value)
            }
          />

          <TimeInput
            label="Hora inicial"
            value={formData.agendamentoHoraInicioLocal}
            onChange={(e) =>
              handleChange('agendamentoHoraInicioLocal', e.target.value)
            }
          />

          <TimeInput
            label="Hora final"
            value={formData.agendamentoHoraFimLocal}
            onChange={(e) =>
              handleChange('agendamentoHoraFimLocal', e.target.value)
            }
          />
        </ResponsiveGrid>
      </PageSection>

      {isCorretiva && (
        <PageSection
          title="Chamado"
          description="Para manutenção corretiva, o número do chamado é obrigatório."
        >
          <Input
            label="Número do chamado"
            value={formData.numeroChamado}
            onChange={(e) => handleChange('numeroChamado', e.target.value)}
            placeholder="Informe o número do chamado"
          />
        </PageSection>
      )}

      <PageSection
        title="Responsável"
        description="Informe o técnico ou responsável previsto para o atendimento."
      >
        <Input
          label="Técnico responsável"
          value={formData.tecnicoResponsavel}
          onChange={(e) => handleChange('tecnicoResponsavel', e.target.value)}
          placeholder="Nome do responsável"
        />
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