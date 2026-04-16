import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSave,
  faTimes,
  faSpinner,
  faFileContract,
  faHospital,
  faMicrochip,
} from '@fortawesome/free-solid-svg-icons';

import { useContratoForm } from '@/hooks/contratos/useContratoForm';

import PageSection from '@/components/ui/layout/PageSection';
import ResponsiveGrid from '@/components/ui/layout/ResponsiveGrid';
import Input from '@/components/ui/primitives/Input';
import Select from '@/components/ui/primitives/Select';
import DateInput from '@/components/ui/primitives/DateInput';
import Button from '@/components/ui/primitives/Button';

import ContratoSelectionCard from '@/components/contratos/ContratoSelectionCard';

const OPCOES_CATEGORIA = [
  'Manutenção Corretiva',
  'Manutenção Preventiva',
  'Full Service',
];

const OPCOES_STATUS = ['Ativo', 'Expirado', 'Cancelado'];

function FormField({ label, required = false, hint = '', children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700">
        {label}
        {required ? ' *' : ''}
      </label>
      {children}
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

FormField.propTypes = {
  label: PropTypes.string.isRequired,
  required: PropTypes.bool,
  hint: PropTypes.string,
  children: PropTypes.node.isRequired,
};

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

      <PageSection
        title="Informações do contrato"
        description="Dados principais de identificação e vigência."
      >
        <div className="mb-5 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <FontAwesomeIcon icon={faFileContract} />
          </span>

          <div>
            <p className="text-sm font-semibold text-slate-900">
              Cadastro principal do contrato
            </p>
            <p className="text-sm text-slate-500">
              Informe dados básicos para registrar o contrato no sistema.
            </p>
          </div>
        </div>

        <ResponsiveGrid preset="form">
          <FormField label="Número do contrato" required>
            <Input
              type="text"
              name="numeroContrato"
              value={formData.numeroContrato}
              onChange={handleChange}
              placeholder="Digite o número do contrato"
              required
            />
          </FormField>

          <FormField label="Categoria" required>
            <Select
              name="categoria"
              value={formData.categoria}
              onChange={handleChange}
              required
            >
              <option value="">Selecione</option>
              {OPCOES_CATEGORIA.map((categoria) => (
                <option key={categoria} value={categoria}>
                  {categoria}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Fornecedor" required>
            <Input
              type="text"
              name="fornecedor"
              value={formData.fornecedor}
              onChange={handleChange}
              placeholder="Digite o fornecedor"
              required
            />
          </FormField>

          <FormField
            label="Data de início"
            required
            hint="Você pode selecionar no calendário ou digitar."
          >
            <DateInput
              name="dataInicio"
              value={formData.dataInicio}
              onChange={handleChange}
            />
          </FormField>

          <FormField
            label="Data de fim"
            required
            hint="A vigência final não pode ser anterior ao início."
          >
            <DateInput
              name="dataFim"
              value={formData.dataFim}
              onChange={handleChange}
              min={formData.dataInicio || undefined}
            />
          </FormField>

          <FormField label="Status" required>
            <Select
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
            >
              {OPCOES_STATUS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </FormField>
        </ResponsiveGrid>
      </PageSection>

      <PageSection
        title="Cobertura"
        description="Selecione unidades e equipamentos cobertos pelo contrato."
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
                  <div className="mt-1 text-xs text-slate-500">
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
                <div className="mt-1 text-xs text-slate-500">
                  Tag: {equipamento.tag || 'N/A'}
                </div>
              </div>
            )}
          />
        </div>
      </PageSection>

      <div className="flex flex-wrap justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={handleCancelClick}
          disabled={isSubmitting}
        >
          <FontAwesomeIcon icon={faTimes} />
          Cancelar
        </Button>

        <Button type="submit" disabled={isSubmitting}>
          <FontAwesomeIcon
            icon={isSubmitting ? faSpinner : faSave}
            spin={isSubmitting}
          />
          {isSubmitting
            ? 'Salvando...'
            : isEditing
              ? 'Salvar alterações'
              : 'Salvar contrato'}
        </Button>
      </div>
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