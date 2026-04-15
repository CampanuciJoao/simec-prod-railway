import React, { useEffect, useMemo, useState } from 'react';
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

import PageSection from '../ui/PageSection';
import Input from '../ui/Input';
import Select from '../ui/Select';
import DateInput from '../ui/DateInput';
import Button from '../ui/primitives/Button';
import ResponsiveGrid from '../ui/ResponsiveGrid';

const ESTADO_INICIAL_VAZIO = {
  numeroContrato: '',
  categoria: '',
  fornecedor: '',
  dataInicio: '',
  dataFim: '',
  status: 'Ativo',
  unidadesCobertasIds: [],
  equipamentosCobertosIds: [],
};

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

function SelectionCard({
  title,
  icon,
  emptyMessage,
  items,
  selectedIds,
  onToggle,
  renderLabel,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
        <FontAwesomeIcon icon={icon} className="text-slate-500" />
        {title}
      </h4>

      <div className="max-h-[280px] overflow-y-auto pr-1">
        {items.length > 0 ? (
          <div className="flex flex-col gap-2">
            {items.map((item) => {
              const checked = selectedIds.includes(item.id);

              return (
                <label
                  key={item.id}
                  className={[
                    'flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition',
                    checked
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100',
                  ].join(' ')}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(item.id)}
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                  />

                  <div className="min-w-0 text-sm text-slate-700">
                    {renderLabel(item)}
                  </div>
                </label>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  );
}

SelectionCard.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.object.isRequired,
  emptyMessage: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
  selectedIds: PropTypes.array.isRequired,
  onToggle: PropTypes.func.isRequired,
  renderLabel: PropTypes.func.isRequired,
};

function ContratoForm({
  onSubmit,
  initialData = null,
  isEditing = false,
  todosEquipamentos = [],
  unidadesDisponiveis = [],
  onCancel,
}) {
  const [formData, setFormData] = useState(ESTADO_INICIAL_VAZIO);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    if (isEditing && initialData) {
      setFormData({
        numeroContrato: initialData.numeroContrato || '',
        categoria: initialData.categoria || '',
        fornecedor: initialData.fornecedor || '',
        dataInicio: initialData.dataInicio
          ? initialData.dataInicio.split('T')[0]
          : '',
        dataFim: initialData.dataFim ? initialData.dataFim.split('T')[0] : '',
        status: initialData.status || 'Ativo',
        unidadesCobertasIds:
          initialData.unidadesCobertas?.map((u) => u.id) || [],
        equipamentosCobertosIds:
          initialData.equipamentosCobertos?.map((e) => e.id) || [],
      });
    } else {
      setFormData(ESTADO_INICIAL_VAZIO);
    }
  }, [isEditing, initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (error) {
      setError('');
    }
  };

  const handleToggleUnidade = (id) => {
    setFormData((prev) => {
      const jaExiste = prev.unidadesCobertasIds.includes(id);

      const novasUnidades = jaExiste
        ? prev.unidadesCobertasIds.filter((itemId) => itemId !== id)
        : [...prev.unidadesCobertasIds, id];

      let novosEquipamentos = prev.equipamentosCobertosIds;

      if (jaExiste) {
        const equipamentosParaRemover = todosEquipamentos
          .filter((e) => e.unidadeId === id)
          .map((e) => e.id);

        novosEquipamentos = prev.equipamentosCobertosIds.filter(
          (equipId) => !equipamentosParaRemover.includes(equipId)
        );
      }

      return {
        ...prev,
        unidadesCobertasIds: novasUnidades,
        equipamentosCobertosIds: novosEquipamentos,
      };
    });
  };

  const handleToggleEquipamento = (id) => {
    setFormData((prev) => {
      const jaExiste = prev.equipamentosCobertosIds.includes(id);

      return {
        ...prev,
        equipamentosCobertosIds: jaExiste
          ? prev.equipamentosCobertosIds.filter((itemId) => itemId !== id)
          : [...prev.equipamentosCobertosIds, id],
      };
    });
  };

  const equipamentosFiltrados = useMemo(() => {
    if (formData.unidadesCobertasIds.length === 0) return [];

    return todosEquipamentos.filter((eq) =>
      formData.unidadesCobertasIds.includes(eq.unidadeId)
    );
  }, [formData.unidadesCobertasIds, todosEquipamentos]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (
      !formData.numeroContrato.trim() ||
      !formData.categoria ||
      !formData.fornecedor.trim() ||
      !formData.dataInicio ||
      !formData.dataFim
    ) {
      setError(
        'Número do contrato, categoria, fornecedor, data de início e data de fim são obrigatórios.'
      );
      return;
    }

    if (formData.dataFim < formData.dataInicio) {
      setError('A data de fim não pode ser menor que a data de início.');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        ...formData,
        numeroContrato: formData.numeroContrato.trim(),
        fornecedor: formData.fornecedor.trim(),
      });
    } catch (apiError) {
      setError(
        apiError?.response?.data?.message ||
          apiError?.message ||
          'Ocorreu um erro ao salvar o contrato.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelClick = () => {
    if (onCancel) onCancel();
    else navigate('/contratos');
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
          <SelectionCard
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

          <SelectionCard
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
            renderLabel={(equip) => (
              <div>
                <div className="font-medium">{equip.modelo}</div>
                <div className="mt-1 text-xs text-slate-500">
                  Tag: {equip.tag || 'N/A'}
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