import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleInfo,
  faScrewdriverWrench,
  faCalendarDays,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';

import PageSection from '../ui/PageSection';
import { ResponsiveGrid, FormActions } from '../ui/layout';
import { getUnidades } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { getErrorMessage } from '../../utils/getErrorMessage';

const LISTA_TIPOS = [
  'Arco Cirúrgico',
  'Bomba Injetora',
  'Cintilografia',
  'CR (Radiologia Computadorizada)',
  'Densitometria Óssea',
  'DR (Radiologia Digital)',
  'Esteira Ergométrica',
  'Mamografia',
  'PET-CT',
  'Raio-X',
  'Ressonância Magnética',
  'Tomografia Computadorizada',
  'Ultrassom',
  'Outros',
].sort();

const OPCOES_STATUS = [
  { valor: 'Operante', rotulo: 'Operante' },
  { valor: 'Inoperante', rotulo: 'Inoperante' },
  { valor: 'UsoLimitado', rotulo: 'Uso Limitado' },
  { valor: 'EmManutencao', rotulo: 'Em Manutenção' },
];

const ESTADO_INICIAL_VAZIO = {
  tag: '',
  modelo: '',
  tipo: '',
  setor: '',
  unidadeId: '',
  fabricante: '',
  anoFabricacao: '',
  dataInstalacao: '',
  status: 'Operante',
  numeroPatrimonio: '',
  registroAnvisa: '',
  observacoes: '',
};

function hojeISO() {
  return new Date().toISOString().split('T')[0];
}

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

function TextInput({ className = '', ...props }) {
  return (
    <input
      {...props}
      className={[
        'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100',
        'disabled:cursor-not-allowed disabled:bg-slate-100',
        className,
      ].join(' ')}
    />
  );
}

function SelectInput({ children, className = '', ...props }) {
  return (
    <select
      {...props}
      className={[
        'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100',
        'disabled:cursor-not-allowed disabled:bg-slate-100',
        className,
      ].join(' ')}
    >
      {children}
    </select>
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

function DateField({ name, value, onChange, disabled = false }) {
  const handleHoje = () => {
    onChange({
      target: {
        name,
        value: hojeISO(),
      },
    });
  };

  const handleLimpar = () => {
    onChange({
      target: {
        name,
        value: '',
      },
    });
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <FontAwesomeIcon
          icon={faCalendarDays}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type="date"
          name={name}
          value={value || ''}
          onChange={onChange}
          disabled={disabled}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 pl-10 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleHoje}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FontAwesomeIcon icon={faCalendarDays} />
          Hoje
        </button>

        {!!value ? (
          <button
            type="button"
            onClick={handleLimpar}
            disabled={disabled}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FontAwesomeIcon icon={faTimes} />
            Limpar
          </button>
        ) : null}
      </div>
    </div>
  );
}

function EquipamentoForm({
  onSubmit,
  onCancel,
  initialData = null,
  isEditing = false,
}) {
  const [formData, setFormData] = useState(ESTADO_INICIAL_VAZIO);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unidadesDisponiveis, setUnidadesDisponiveis] = useState([]);
  const [loadingUnidades, setLoadingUnidades] = useState(true);
  const [error, setError] = useState('');
  const [semPatrimonio, setSemPatrimonio] = useState(false);

  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    async function carregarUnidades() {
      setLoadingUnidades(true);

      try {
        const data = await getUnidades();

        if (!mounted) return;

        setUnidadesDisponiveis(
          (Array.isArray(data) ? data : []).sort((a, b) =>
            String(a.nomeSistema || '').localeCompare(
              String(b.nomeSistema || '')
            )
          )
        );
      } catch (err) {
        if (!mounted) return;
        addToast(
          getErrorMessage(err, 'Erro ao carregar lista de unidades.'),
          'error'
        );
      } finally {
        if (mounted) setLoadingUnidades(false);
      }
    }

    carregarUnidades();

    return () => {
      mounted = false;
    };
  }, [addToast]);

  useEffect(() => {
    if (isEditing && initialData) {
      const isSemPat =
        String(initialData.numeroPatrimonio || '').toLowerCase() ===
        'sem patrimônio';

      setSemPatrimonio(isSemPat);

      setFormData({
        tag: initialData.tag || '',
        modelo: initialData.modelo || '',
        tipo: initialData.tipo || '',
        setor: initialData.setor || '',
        unidadeId: initialData.unidade?.id || initialData.unidadeId || '',
        fabricante: initialData.fabricante || '',
        anoFabricacao: initialData.anoFabricacao || '',
        dataInstalacao: initialData.dataInstalacao
          ? String(initialData.dataInstalacao).split('T')[0]
          : '',
        status: initialData.status || 'Operante',
        numeroPatrimonio: initialData.numeroPatrimonio || '',
        registroAnvisa: initialData.registroAnvisa || '',
        observacoes: initialData.observacoes || '',
      });
    } else {
      setFormData(ESTADO_INICIAL_VAZIO);
      setSemPatrimonio(false);
    }
  }, [initialData, isEditing]);

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

  const handleCheckboxChange = (e) => {
    const checked = e.target.checked;
    setSemPatrimonio(checked);

    if (checked) {
      setFormData((prev) => ({
        ...prev,
        numeroPatrimonio: 'Sem Patrimônio',
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        numeroPatrimonio: '',
      }));
    }

    if (error) {
      setError('');
    }
  };

  const handleInternalSubmit = async () => {
    setError('');

    if (
      !formData.tag.trim() ||
      !formData.modelo.trim() ||
      !formData.tipo ||
      !formData.unidadeId
    ) {
      setError('Tag, modelo, tipo e unidade são campos obrigatórios.');
      return;
    }

    if (
      formData.anoFabricacao &&
      !/^\d{4}$/.test(String(formData.anoFabricacao).trim())
    ) {
      setError('O ano de fabricação deve conter 4 dígitos.');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        ...formData,
        tag: formData.tag.trim(),
        modelo: formData.modelo.trim(),
        tipo: formData.tipo,
        setor: String(formData.setor || '').trim(),
        unidadeId: formData.unidadeId,
        fabricante: String(formData.fabricante || '').trim(),
        anoFabricacao: String(formData.anoFabricacao || '').trim(),
        dataInstalacao: formData.dataInstalacao || '',
        status: formData.status,
        numeroPatrimonio: String(formData.numeroPatrimonio || '').trim(),
        registroAnvisa: String(formData.registroAnvisa || '').trim(),
        observacoes: String(formData.observacoes || '').trim(),
      });
    } catch (apiError) {
      setError(getErrorMessage(apiError, 'Erro ao salvar equipamento.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelClick = () => {
    if (onCancel) {
      onCancel();
      return;
    }

    navigate('/equipamentos');
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleInternalSubmit();
      }}
      className="space-y-6"
    >
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <PageSection
        title="Informações gerais"
        description="Dados principais de identificação e localização do equipamento."
      >
        <div className="mb-5 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <FontAwesomeIcon icon={faCircleInfo} />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Cadastro principal do ativo
            </p>
            <p className="text-sm text-slate-500">
              Preencha os dados obrigatórios para registrar o equipamento.
            </p>
          </div>
        </div>

        <ResponsiveGrid preset="form">
          <FormField label="Tag" required hint="Identificação principal do ativo">
            <TextInput
              name="tag"
              value={formData.tag}
              onChange={handleChange}
              placeholder="Ex.: RM-01"
              disabled={isSubmitting}
            />
          </FormField>

          <FormField label="Modelo" required>
            <TextInput
              name="modelo"
              value={formData.modelo}
              onChange={handleChange}
              placeholder="Ex.: Achieva 1.5T"
              disabled={isSubmitting}
            />
          </FormField>

          <FormField label="Tipo" required>
            <SelectInput
              name="tipo"
              value={formData.tipo}
              onChange={handleChange}
              disabled={isSubmitting}
            >
              <option value="">Selecione um tipo</option>
              {LISTA_TIPOS.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </SelectInput>
          </FormField>

          <FormField label="Setor">
            <TextInput
              name="setor"
              value={formData.setor}
              onChange={handleChange}
              placeholder="Ex.: Diagnóstico por imagem"
              disabled={isSubmitting}
            />
          </FormField>

          <FormField
            label="Unidade"
            required
            hint={loadingUnidades ? 'Carregando unidades...' : ''}
          >
            <SelectInput
              name="unidadeId"
              value={formData.unidadeId}
              onChange={handleChange}
              disabled={isSubmitting || loadingUnidades}
            >
              <option value="">Selecione uma unidade</option>
              {unidadesDisponiveis.map((unidade) => (
                <option key={unidade.id} value={unidade.id}>
                  {unidade.nomeSistema}
                </option>
              ))}
            </SelectInput>
          </FormField>

          <FormField label="Fabricante">
            <TextInput
              name="fabricante"
              value={formData.fabricante}
              onChange={handleChange}
              placeholder="Ex.: Philips"
              disabled={isSubmitting}
            />
          </FormField>

          <FormField label="Ano de fabricação">
            <TextInput
              type="number"
              name="anoFabricacao"
              value={formData.anoFabricacao}
              onChange={handleChange}
              placeholder="Ex.: 2020"
              disabled={isSubmitting}
            />
          </FormField>

          <FormField label="Data de instalação">
            <DateField
              name="dataInstalacao"
              value={formData.dataInstalacao}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </FormField>

          <FormField label="Status">
            <SelectInput
              name="status"
              value={formData.status}
              onChange={handleChange}
              disabled={isSubmitting}
            >
              {OPCOES_STATUS.map((status) => (
                <option key={status.valor} value={status.valor}>
                  {status.rotulo}
                </option>
              ))}
            </SelectInput>
          </FormField>
        </ResponsiveGrid>
      </PageSection>

      <PageSection
        title="Controle patrimonial e regulatório"
        description="Informações de patrimônio, registro e observações."
      >
        <div className="mb-5 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <FontAwesomeIcon icon={faScrewdriverWrench} />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Dados administrativos
            </p>
            <p className="text-sm text-slate-500">
              Controle interno, patrimônio e informações regulatórias.
            </p>
          </div>
        </div>

        <ResponsiveGrid preset="twoCols">
          <FormField label="Número de patrimônio">
            <TextInput
              name="numeroPatrimonio"
              value={formData.numeroPatrimonio}
              onChange={handleChange}
              placeholder="Ex.: PAT-12345"
              disabled={isSubmitting || semPatrimonio}
            />
          </FormField>

          <FormField label="Registro ANVISA">
            <TextInput
              name="registroAnvisa"
              value={formData.registroAnvisa}
              onChange={handleChange}
              placeholder="Ex.: 12345678901"
              disabled={isSubmitting}
            />
          </FormField>
        </ResponsiveGrid>

        <div className="mt-4">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={semPatrimonio}
              onChange={handleCheckboxChange}
              disabled={isSubmitting}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Marcar como “Sem Patrimônio”
          </label>
        </div>

        <div className="mt-4">
          <FormField label="Observações">
            <TextareaInput
              name="observacoes"
              value={formData.observacoes}
              onChange={handleChange}
              rows={5}
              placeholder="Informações adicionais sobre o equipamento..."
              disabled={isSubmitting}
            />
          </FormField>
        </div>
      </PageSection>

      <FormActions
        onSubmit={handleInternalSubmit}
        onCancel={handleCancelClick}
        loading={isSubmitting}
        submitLabel={isEditing ? 'Salvar alterações' : 'Cadastrar equipamento'}
        cancelLabel="Cancelar"
        align="right"
      />
    </form>
  );
}

EquipamentoForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func,
  initialData: PropTypes.object,
  isEditing: PropTypes.bool,
};

export default EquipamentoForm;