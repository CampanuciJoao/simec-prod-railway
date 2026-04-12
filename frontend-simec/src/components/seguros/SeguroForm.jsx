import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner,
  faSave,
  faShieldAlt,
  faHospital,
  faCoins,
  faFileLines,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';

import DateInput from '../ui/DateInput';
import PageSection from '../ui/PageSection';

const TIPOS_VINCULO = {
  GERAL: 'geral',
  EQUIPAMENTO: 'equipamento',
  UNIDADE: 'unidade',
};

const ESTADO_INICIAL_VAZIO = {
  apoliceNumero: '',
  seguradora: '',
  dataInicio: '',
  dataFim: '',
  tipoVinculo: TIPOS_VINCULO.GERAL,
  equipamentoId: '',
  unidadeId: '',
  cobertura: '',
  premioTotal: 0,
  lmiIncendio: 0,
  lmiDanosEletricos: 0,
  lmiRoubo: 0,
  lmiVidros: 0,
  lmiResponsabilidadeCivil: 0,
  lmiDanosMateriais: 0,
  lmiDanosCorporais: 0,
  lmiDanosMorais: 0,
  lmiAPP: 0,
};

function FormField({ label, required = false, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700">
        {label}
        {required ? ' *' : ''}
      </label>
      {children}
    </div>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
    />
  );
}

function SelectInput({ children, ...props }) {
  return (
    <select
      {...props}
      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
    >
      {children}
    </select>
  );
}

function TextareaInput(props) {
  return (
    <textarea
      {...props}
      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
    />
  );
}

function NumberInput(props) {
  return (
    <input
      type="number"
      step="0.01"
      min="0"
      {...props}
      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
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
        tipoVinculo: tipoVinculoInicial,
        dataInicio: initialData.dataInicio
          ? initialData.dataInicio.split('T')[0]
          : '',
        dataFim: initialData.dataFim ? initialData.dataFim.split('T')[0] : '',
        premioTotal: Number(initialData.premioTotal || 0),
        lmiIncendio: Number(initialData.lmiIncendio || 0),
        lmiDanosEletricos: Number(initialData.lmiDanosEletricos || 0),
        lmiRoubo: Number(initialData.lmiRoubo || 0),
        lmiVidros: Number(initialData.lmiVidros || 0),
        lmiResponsabilidadeCivil: Number(initialData.lmiResponsabilidadeCivil || 0),
        lmiDanosMateriais: Number(initialData.lmiDanosMateriais || 0),
        lmiDanosCorporais: Number(initialData.lmiDanosCorporais || 0),
        lmiDanosMorais: Number(initialData.lmiDanosMorais || 0),
        lmiAPP: Number(initialData.lmiAPP || 0),
      });
    } else {
      setFormData(ESTADO_INICIAL_VAZIO);
    }
  }, [isEditing, initialData]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const finalValue = type === 'number' ? Number(value) || 0 : value;

    setFormData((prev) => ({
      ...prev,
      [name]: finalValue,
    }));
  };

  const handleTipoVinculoChange = (e) => {
    const novoTipo = e.target.value;

    setFormData((prev) => ({
      ...prev,
      tipoVinculo: novoTipo,
      equipamentoId: '',
      unidadeId: '',
    }));
  };

  const equipamentosFiltradosPorUnidade = useMemo(() => {
    if (
      formData.tipoVinculo === TIPOS_VINCULO.EQUIPAMENTO &&
      formData.unidadeId
    ) {
      return equipamentosDisponiveis.filter(
        (eq) => String(eq.unidadeId) === String(formData.unidadeId)
      );
    }

    return [];
  }, [formData.tipoVinculo, formData.unidadeId, equipamentosDisponiveis]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.apoliceNumero || !formData.seguradora) {
      setError('Número da apólice e seguradora são campos obrigatórios.');
      return;
    }

    if (!formData.dataInicio || !formData.dataFim) {
      setError('Início e fim da vigência são campos obrigatórios.');
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
      const payload = {
        ...formData,
        equipamentoId:
          formData.tipoVinculo === TIPOS_VINCULO.EQUIPAMENTO
            ? formData.equipamentoId
            : null,
        unidadeId:
          formData.tipoVinculo === TIPOS_VINCULO.UNIDADE
            ? formData.unidadeId
            : formData.tipoVinculo === TIPOS_VINCULO.EQUIPAMENTO
              ? formData.unidadeId
              : null,
      };

      await onSubmit(payload);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
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
        title="Detalhes da apólice"
        description="Informações principais de identificação e vigência do seguro."
      >
        <div className="mb-5 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <FontAwesomeIcon icon={faShieldAlt} />
          </span>

          <div>
            <p className="text-sm font-semibold text-slate-900">
              Cadastro principal da apólice
            </p>
            <p className="text-sm text-slate-500">
              Preencha os dados básicos do contrato de seguro.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FormField label="Número da apólice" required>
            <TextInput
              type="text"
              name="apoliceNumero"
              value={formData.apoliceNumero}
              onChange={handleChange}
              placeholder="Digite o número da apólice"
              required
            />
          </FormField>

          <FormField label="Seguradora" required>
            <TextInput
              type="text"
              name="seguradora"
              value={formData.seguradora}
              onChange={handleChange}
              placeholder="Digite a seguradora"
              required
            />
          </FormField>

          <FormField label="Início da vigência" required>
            <DateInput
              name="dataInicio"
              value={formData.dataInicio}
              onChange={handleChange}
              required
            />
          </FormField>

          <FormField label="Fim da vigência" required>
            <DateInput
              name="dataFim"
              value={formData.dataFim}
              onChange={handleChange}
              required
            />
          </FormField>
        </div>
      </PageSection>

      <PageSection
        title="Objeto segurado"
        description="Defina se a apólice é geral, vinculada à unidade ou a um equipamento."
      >
        <div className="mb-5 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <FontAwesomeIcon icon={faHospital} />
          </span>

          <div>
            <p className="text-sm font-semibold text-slate-900">
              Vínculo da cobertura
            </p>
            <p className="text-sm text-slate-500">
              Escolha o alvo segurado para manter o controle correto da apólice.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <FormField label="Tipo de vínculo">
            <SelectInput
              name="tipoVinculo"
              value={formData.tipoVinculo}
              onChange={handleTipoVinculoChange}
            >
              <option value={TIPOS_VINCULO.GERAL}>
                Geral (sem vínculo específico)
              </option>
              <option value={TIPOS_VINCULO.UNIDADE}>
                Vincular à unidade
              </option>
              <option value={TIPOS_VINCULO.EQUIPAMENTO}>
                Vincular ao equipamento
              </option>
            </SelectInput>
          </FormField>

          {(formData.tipoVinculo === TIPOS_VINCULO.UNIDADE ||
            formData.tipoVinculo === TIPOS_VINCULO.EQUIPAMENTO) && (
            <FormField label="Unidade" required>
              <SelectInput
                name="unidadeId"
                value={formData.unidadeId}
                onChange={handleChange}
                required
              >
                <option value="">Selecione a unidade</option>
                {unidadesDisponiveis.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nomeSistema}
                  </option>
                ))}
              </SelectInput>
            </FormField>
          )}

          {formData.tipoVinculo === TIPOS_VINCULO.EQUIPAMENTO && (
            <FormField label="Equipamento" required>
              <SelectInput
                name="equipamentoId"
                value={formData.equipamentoId}
                onChange={handleChange}
                required
                disabled={!formData.unidadeId}
              >
                <option value="">Selecione o equipamento</option>
                {equipamentosFiltradosPorUnidade.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.modelo} (Tag: {eq.tag})
                  </option>
                ))}
              </SelectInput>
            </FormField>
          )}
        </div>
      </PageSection>

      <PageSection
        title="Coberturas e valores"
        description="Informe os valores segurados por categoria para controle detalhado da apólice."
      >
        <div className="mb-5 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <FontAwesomeIcon icon={faCoins} />
          </span>

          <div>
            <p className="text-sm font-semibold text-slate-900">
              Limites máximos de indenização
            </p>
            <p className="text-sm text-slate-500">
              Preencha os valores conforme a cobertura contratada.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <FormField label="Prêmio total (custo)">
            <NumberInput
              name="premioTotal"
              value={formData.premioTotal}
              onChange={handleChange}
              placeholder="0,00"
            />
          </FormField>

          <FormField label="Incêndio / explosão">
            <NumberInput
              name="lmiIncendio"
              value={formData.lmiIncendio}
              onChange={handleChange}
              placeholder="0,00"
            />
          </FormField>

          <FormField label="Danos elétricos">
            <NumberInput
              name="lmiDanosEletricos"
              value={formData.lmiDanosEletricos}
              onChange={handleChange}
              placeholder="0,00"
            />
          </FormField>

          <FormField label="Roubo / furto">
            <NumberInput
              name="lmiRoubo"
              value={formData.lmiRoubo}
              onChange={handleChange}
              placeholder="0,00"
            />
          </FormField>

          <FormField label="Quebra de vidros">
            <NumberInput
              name="lmiVidros"
              value={formData.lmiVidros}
              onChange={handleChange}
              placeholder="0,00"
            />
          </FormField>

          <FormField label="Responsabilidade civil">
            <NumberInput
              name="lmiResponsabilidadeCivil"
              value={formData.lmiResponsabilidadeCivil}
              onChange={handleChange}
              placeholder="0,00"
            />
          </FormField>

          <FormField label="Danos materiais">
            <NumberInput
              name="lmiDanosMateriais"
              value={formData.lmiDanosMateriais}
              onChange={handleChange}
              placeholder="0,00"
            />
          </FormField>

          <FormField label="Danos corporais">
            <NumberInput
              name="lmiDanosCorporais"
              value={formData.lmiDanosCorporais}
              onChange={handleChange}
              placeholder="0,00"
            />
          </FormField>

          <FormField label="Danos morais">
            <NumberInput
              name="lmiDanosMorais"
              value={formData.lmiDanosMorais}
              onChange={handleChange}
              placeholder="0,00"
            />
          </FormField>

          <FormField label="APP (passageiros)">
            <NumberInput
              name="lmiAPP"
              value={formData.lmiAPP}
              onChange={handleChange}
              placeholder="0,00"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Observações da cobertura">
            <TextareaInput
              name="cobertura"
              rows={4}
              value={formData.cobertura}
              onChange={handleChange}
              placeholder="Detalhes adicionais sobre cláusulas, franquias, exclusões ou observações relevantes"
            />
          </FormField>
        </div>
      </PageSection>

      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          <FontAwesomeIcon icon={faTimes} />
          Cancelar
        </button>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
        >
          <FontAwesomeIcon
            icon={isSubmitting ? faSpinner : faSave}
            spin={isSubmitting}
          />
          {isSubmitting
            ? 'Salvando...'
            : isEditing
              ? 'Salvar alterações'
              : 'Salvar seguro'}
        </button>
      </div>
    </form>
  );
}

SeguroForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  initialData: PropTypes.object,
  isEditing: PropTypes.bool,
  equipamentosDisponiveis: PropTypes.array,
  unidadesDisponiveis: PropTypes.array,
  onCancel: PropTypes.func,
};

export default SeguroForm;