import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHospital,
  faMicrochip,
} from '@fortawesome/free-solid-svg-icons';

import { useContratoForm } from '@/hooks/contratos/useContratoForm';

import {
  DateInput,
  FormActions,
  FormSection,
  Input,
  ResponsiveGrid,
  Select,
} from '@/components/ui';

import ContratoSelectionCard from '@/components/contratos/ContratoSelectionCard';

const OPCOES_CATEGORIA = [
  'Manutenção Corretiva',
  'Manutenção Preventiva',
  'Full Service',
  'Comodato',
];

const OPCOES_STATUS = ['Ativo', 'Expirado', 'Cancelado'];

function ContratoForm({
  onSubmit,
  initialData = null,
  isEditing = false,
  todosEquipamentos = [],
  unidadesDisponiveis = [],
  onCancel,
}) {
  const navigate = useNavigate();

  const {
    formData,
    error,
    isSubmitting,
    equipamentosFiltrados,
    handleChange,
    handleToggleUnidade,
    handleToggleEquipamento,
    handleSubmit,
  } = useContratoForm({
    initialData,
    isEditing,
    todosEquipamentos,
    onSubmit,
  });

  const handleCancelClick = () => {
    if (onCancel) {
      onCancel();
      return;
    }

    navigate('/contratos');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <FormSection
        title="Informações do contrato"
        description="Dados principais de identificação, fornecedor e vigência."
      >
        <ResponsiveGrid preset="form">
          <Input
            label="Número do contrato"
            name="numeroContrato"
            value={formData.numeroContrato}
            onChange={handleChange}
            placeholder="Digite o número do contrato"
            required
          />

          <Select
            label="Categoria"
            name="categoria"
            value={formData.categoria}
            onChange={handleChange}
            options={OPCOES_CATEGORIA.map((categoria) => ({
              value: categoria,
              label: categoria,
            }))}
            placeholder="Selecione a categoria"
            required
          />

          <Input
            label="Fornecedor"
            name="fornecedor"
            value={formData.fornecedor}
            onChange={handleChange}
            placeholder="Digite o fornecedor"
            required
          />

          <DateInput
            label="Data de início"
            name="dataInicio"
            value={formData.dataInicio}
            onChange={handleChange}
            hint="Você pode selecionar no calendário ou digitar."
          />

          <DateInput
            label="Data de fim"
            name="dataFim"
            value={formData.dataFim}
            onChange={handleChange}
            min={formData.dataInicio || undefined}
            hint="A vigência final não pode ser anterior ao início."
          />

          <Select
            label="Status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            options={OPCOES_STATUS.map((status) => ({
              value: status,
              label: status,
            }))}
            placeholder=""
            required
          />
        </ResponsiveGrid>
      </FormSection>

      <FormSection
        title="Cobertura"
        description="Selecione as unidades e equipamentos cobertos por este contrato."
      >
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <ContratoSelectionCard
            title="Unidades cobertas"
            icon={faHospital}
            items={unidadesDisponiveis}
            selectedIds={formData.unidadesCobertasIds}
            onToggle={handleToggleUnidade}
            emptyMessage="Nenhuma unidade disponível."
            renderLabel={(unidade) => (
              <div>
                <div className="font-medium">{unidade.nomeSistema}</div>
                {unidade.nomeFantasia ? (
                  <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {unidade.nomeFantasia}
                  </div>
                ) : null}
              </div>
            )}
          />

          <ContratoSelectionCard
            title="Equipamentos cobertos"
            icon={faMicrochip}
            items={equipamentosFiltrados}
            selectedIds={formData.equipamentosCobertosIds}
            onToggle={handleToggleEquipamento}
            emptyMessage={
              formData.unidadesCobertasIds.length === 0
                ? 'Selecione uma ou mais unidades para listar os equipamentos.'
                : 'Nenhum equipamento encontrado para a(s) unidade(s) selecionada(s).'
            }
            renderLabel={(equipamento) => (
              <div>
                <div className="font-medium">{equipamento.modelo}</div>
                <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  Tag: {equipamento.tag || 'N/A'}
                </div>
              </div>
            )}
          />
        </div>
      </FormSection>

      <FormActions
        onCancel={handleCancelClick}
        loading={isSubmitting}
        submitLabel={isEditing ? 'Salvar alterações' : 'Salvar contrato'}
      />
    </form>
  );
}

ContratoForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  initialData: PropTypes.object,
  isEditing: PropTypes.bool,
  todosEquipamentos: PropTypes.array,
  unidadesDisponiveis: PropTypes.array,
  onCancel: PropTypes.func,
};

export default ContratoForm;
