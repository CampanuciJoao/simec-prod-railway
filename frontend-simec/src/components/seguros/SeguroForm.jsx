import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSave,
  faShieldAlt,
  faHospital,
  faCoins,
  faTimes,
  faFileShield,
} from '@fortawesome/free-solid-svg-icons';

import PageSection from '../ui/layout/PageSection';
import ResponsiveGrid from '../ui/layout/ResponsiveGrid';
import Input from '../ui/primitives/Input';
import Select from '../ui/primitives/Select';
import DateInput from '../ui/primitives/DateInput';
import Button from '../ui/primitives/Button';

import {
  TIPO_SEGURO,
  TIPO_SEGURO_OPTIONS,
  COBERTURA_FIELDS,
  getCoberturaFieldsByTipo,
  sanitizeCoberturasByTipo,
} from '../../utils/seguros';

const TIPOS_VINCULO = {
  GERAL: 'geral',
  EQUIPAMENTO: 'equipamento',
  UNIDADE: 'unidade',
};

const ESTADO_INICIAL_VAZIO = {
  apoliceNumero: '',
  seguradora: '',
  tipoSeguro: TIPO_SEGURO.EQUIPAMENTO,
  dataInicio: '',
  dataFim: '',
  tipoVinculo: TIPOS_VINCULO.GERAL,
  equipamentoId: '',
  unidadeId: '',
  cobertura: '',
  premioTotal: 0,
  lmiColisao: 0,
  lmiIncendio: 0,
  lmiDanosEletricos: 0,
  lmiRoubo: 0,
  lmiVidros: 0,
  lmiResponsabilidadeCivil: 0,
  lmiDanosMateriais: 0,
  lmiDanosCorporais: 0,
  lmiDanosMorais: 0,
  lmiAPP: 0,
  lmiVendaval: 0,
  lmiDanosCausaExterna: 0,
  lmiPerdaLucroBruto: 0,
};

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

function TextareaInput({ className = '', ...props }) {
  return (
    <textarea
      {...props}
      className={[
        'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100',
        'disabled:cursor-not-allowed disabled:bg-slate-100',
        className,
      ].join(' ')}
    />
  );
}

function MoneyInput({ name, value, onChange }) {
  return (
    <Input
      type="number"
      step="0.01"
      min="0"
      name={name}
      value={value}
      onChange={onChange}
      placeholder="0,00"
    />
  );
}

function SeguroForm({
  onSubmit,
  initialData = null,
  isEditing = false,
  equipamentosDisponiveis = [],
  unidadesDisponiveis = [],
  onCancel,
}) {
  const [formData, setFormData] = useState(ESTADO_INICIAL_VAZIO);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditing && initialData) {
      let tipoVinculoInicial = TIPOS_VINCULO.GERAL;

      if (initialData.equipamentoId) {
        tipoVinculoInicial = TIPOS_VINCULO.EQUIPAMENTO;
      } else if (initialData.unidadeId) {
        tipoVinculoInicial = TIPOS_VINCULO.UNIDADE;
      }

      setFormData({
        ...ESTADO_INICIAL_VAZIO,
        ...initialData,
        tipoSeguro: initialData.tipoSeguro || TIPO_SEGURO.EQUIPAMENTO,
        tipoVinculo: tipoVinculoInicial,
        dataInicio: initialData.dataInicio
          ? initialData.dataInicio.split('T')[0]
          : '',
        dataFim: initialData.dataFim ? initialData.dataFim.split('T')[0] : '',
        premioTotal: Number(initialData.premioTotal || 0),
        lmiColisao: Number(initialData.lmiColisao || 0),
        lmiIncendio: Number(initialData.lmiIncendio || 0),
        lmiDanosEletricos: Number(initialData.lmiDanosEletricos || 0),
        lmiRoubo: Number(initialData.lmiRoubo || 0),
        lmiVidros: Number(initialData.lmiVidros || 0),
        lmiResponsabilidadeCivil: Number(initialData.lmiResponsabilidadeCivil || 0),
        lmiDanosMateriais: Number(initialData.lmiDanosMateriais || 0),
        lmiDanosCorporais: Number(initialData.lmiDanosCorporais || 0),
        lmiDanosMorais: Number(initialData.lmiDanosMorais || 0),
        lmiAPP: Number(initialData.lmiAPP || 0),
        lmiVendaval: Number(initialData.lmiVendaval || 0),
        lmiDanosCausaExterna: Number(initialData.lmiDanosCausaExterna || 0),
        lmiPerdaLucroBruto: Number(initialData.lmiPerdaLucroBruto || 0),
      });
    } else {
      setFormData(ESTADO_INICIAL_VAZIO);
    }
  }, [isEditing, initialData]);

  const coberturaFields = useMemo(() => {
    return getCoberturaFieldsByTipo(formData.tipoSeguro);
  }, [formData.tipoSeguro]);

  const equipamentosFiltrados = useMemo(() => {
    if (formData.tipoVinculo !== TIPOS_VINCULO.EQUIPAMENTO) {
      return [];
    }

    if (!formData.unidadeId) {
      return equipamentosDisponiveis;
    }

    return equipamentosDisponiveis.filter(
      (eq) => String(eq.unidadeId) === String(formData.unidadeId)
    );
  }, [formData.tipoVinculo, formData.unidadeId, equipamentosDisponiveis]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const finalValue = type === 'number' ? Number(value) || 0 : value;

    setFormData((prev) => ({
      ...prev,
      [name]: finalValue,
    }));

    if (error) {
      setError('');
    }
  };

  const handleTipoVinculoChange = (e) => {
    const novoTipo = e.target.value;

    setFormData((prev) => ({
      ...prev,
      tipoVinculo: novoTipo,
      equipamentoId: '',
      unidadeId: '',
    }));

    if (error) {
      setError('');
    }
  };

  const handleTipoSeguroChange = (e) => {
    const novoTipoSeguro = e.target.value;

    setFormData((prev) =>
      sanitizeCoberturasByTipo({
        ...prev,
        tipoSeguro: novoTipoSeguro,
      })
    );

    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.apoliceNumero.trim() || !formData.seguradora.trim()) {
      setError('Número da apólice e seguradora são campos obrigatórios.');
      return;
    }

    if (!formData.dataInicio || !formData.dataFim) {
      setError('Início e fim da vigência são campos obrigatórios.');
      return;
    }

    if (formData.dataFim < formData.dataInicio) {
      setError('A data final da vigência não pode ser anterior à data inicial.');
      return;
    }

    if (
      (formData.tipoVinculo === TIPOS_VINCULO.UNIDADE ||
        formData.tipoVinculo === TIPOS_VINCULO.EQUIPAMENTO) &&
      !formData.unidadeId
    ) {
      setError('Selecione a unidade para o vínculo informado.');
      return;
    }

    if (
      formData.tipoVinculo === TIPOS_VINCULO.EQUIPAMENTO &&
      !formData.equipamentoId
    ) {
      setError('Selecione o equipamento vinculado.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = sanitizeCoberturasByTipo({
        ...formData,
        apoliceNumero: formData.apoliceNumero.trim(),
        seguradora: formData.seguradora.trim(),
        cobertura: String(formData.cobertura || '').trim(),
        equipamentoId:
          formData.tipoVinculo === TIPOS_VINCULO.EQUIPAMENTO
            ? formData.equipamentoId
            : null,
        unidadeId:
          formData.tipoVinculo === TIPOS_VINCULO.UNIDADE ||
          formData.tipoVinculo === TIPOS_VINCULO.EQUIPAMENTO
            ? formData.unidadeId
            : null,
      });

      await onSubmit(payload);
    } catch (apiError) {
      setError(
        apiError?.response?.data?.message ||
          apiError?.message ||
          'Ocorreu um erro ao salvar o seguro.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <PageSection
        title="Informações da apólice"
        description="Dados principais de identificação, vigência e enquadramento."
      >
        <ResponsiveGrid cols={{ base: 1, md: 2, xl: 3 }}>
          <FormField label="Número da apólice" required>
            <Input
              name="apoliceNumero"
              value={formData.apoliceNumero}
              onChange={handleChange}
              placeholder="Digite o número da apólice"
            />
          </FormField>

          <FormField label="Seguradora" required>
            <Input
              name="seguradora"
              value={formData.seguradora}
              onChange={handleChange}
              placeholder="Digite a seguradora"
            />
          </FormField>

          <FormField
            label="Tipo de seguro"
            required
            hint="Esse campo controla quais coberturas são coerentes para a apólice."
          >
            <Select
              name="tipoSeguro"
              value={formData.tipoSeguro}
              onChange={handleTipoSeguroChange}
            >
              {TIPO_SEGURO_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Data de início" required>
            <DateInput
              name="dataInicio"
              value={formData.dataInicio}
              onChange={handleChange}
            />
          </FormField>

          <FormField label="Data de fim" required>
            <DateInput
              name="dataFim"
              value={formData.dataFim}
              min={formData.dataInicio || undefined}
              onChange={handleChange}
            />
          </FormField>

          <FormField label="Prêmio total">
            <MoneyInput
              name="premioTotal"
              value={formData.premioTotal}
              onChange={handleChange}
            />
          </FormField>
        </ResponsiveGrid>
      </PageSection>

      <PageSection
        title="Vínculo do seguro"
        description="Defina se a apólice cobre um equipamento, uma unidade ou uso geral."
      >
        <ResponsiveGrid cols={{ base: 1, md: 2, xl: 3 }}>
          <FormField label="Tipo de vínculo" required>
            <Select
              name="tipoVinculo"
              value={formData.tipoVinculo}
              onChange={handleTipoVinculoChange}
            >
              <option value={TIPOS_VINCULO.GERAL}>Geral</option>
              <option value={TIPOS_VINCULO.UNIDADE}>Unidade</option>
              <option value={TIPOS_VINCULO.EQUIPAMENTO}>Equipamento</option>
            </Select>
          </FormField>

          {formData.tipoVinculo !== TIPOS_VINCULO.GERAL && (
            <FormField label="Unidade" required>
              <Select
                name="unidadeId"
                value={formData.unidadeId}
                onChange={handleChange}
              >
                <option value="">Selecione</option>
                {unidadesDisponiveis.map((unidade) => (
                  <option key={unidade.id} value={unidade.id}>
                    {unidade.nomeSistema || unidade.nomeFantasia || unidade.nome}
                  </option>
                ))}
              </Select>
            </FormField>
          )}

          {formData.tipoVinculo === TIPOS_VINCULO.EQUIPAMENTO && (
            <FormField label="Equipamento" required>
              <Select
                name="equipamentoId"
                value={formData.equipamentoId}
                onChange={handleChange}
              >
                <option value="">Selecione</option>
                {equipamentosFiltrados.map((equipamento) => (
                  <option key={equipamento.id} value={equipamento.id}>
                    {equipamento.modelo} {equipamento.tag ? `(${equipamento.tag})` : ''}
                  </option>
                ))}
              </Select>
            </FormField>
          )}
        </ResponsiveGrid>

        <div className="mt-5">
          <FormField
            label="Descrição complementar"
            hint="Use para observações operacionais, cláusulas especiais ou resumo livre da cobertura."
          >
            <TextareaInput
              rows={4}
              name="cobertura"
              value={formData.cobertura}
              onChange={handleChange}
              placeholder="Descreva observações relevantes da apólice..."
            />
          </FormField>
        </div>
      </PageSection>

      <PageSection
        title="Coberturas"
        description="A lista abaixo muda conforme o tipo de seguro selecionado."
      >
        <ResponsiveGrid cols={{ base: 1, md: 2, xl: 3 }}>
          {coberturaFields.map((fieldKey) => {
            const config = COBERTURA_FIELDS[fieldKey];

            return (
              <FormField key={fieldKey} label={config.label}>
                <MoneyInput
                  name={fieldKey}
                  value={formData[fieldKey]}
                  onChange={handleChange}
                />
              </FormField>
            );
          })}
        </ResponsiveGrid>
      </PageSection>

      <div className="flex flex-wrap justify-end gap-3">
        {onCancel ? (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            <FontAwesomeIcon icon={faTimes} />
            Cancelar
          </Button>
        ) : null}

        <Button type="submit" disabled={isSubmitting}>
          <FontAwesomeIcon icon={faSave} />
          {isSubmitting ? 'Salvando...' : 'Salvar seguro'}
        </Button>
      </div>
    </form>
  );
}

FormField.propTypes = {
  label: PropTypes.string.isRequired,
  required: PropTypes.bool,
  hint: PropTypes.string,
  children: PropTypes.node.isRequired,
};

TextareaInput.propTypes = {
  className: PropTypes.string,
};

MoneyInput.propTypes = {
  name: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
};

SeguroForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  initialData: PropTypes.object,
  isEditing: PropTypes.bool,
  equipamentosDisponiveis: PropTypes.array,
  unidadesDisponiveis: PropTypes.array,
  onCancel: PropTypes.func,
};

export default SeguroForm;