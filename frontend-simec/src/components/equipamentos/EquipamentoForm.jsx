import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSave,
  faTimes,
  faSpinner,
  faCircleInfo,
  faScrewdriverWrench,
  faCalendarDays,
} from '@fortawesome/free-solid-svg-icons';

import PageSection from '../ui/PageSection';
import { getUnidades } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

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

FormField.propTypes = {
  label: PropTypes.string.isRequired,
  required: PropTypes.bool,
  hint: PropTypes.string,
  children: PropTypes.node.isRequired,
};

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

TextInput.propTypes = {
  className: PropTypes.string,
};

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

SelectInput.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

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

TextareaInput.propTypes = {
  className: PropTypes.string,
};

function DateField({ name, value, onChange }) {
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
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 pl-10 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleHoje}
          className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
        >
          <FontAwesomeIcon icon={faCalendarDays} />
          Hoje
        </button>

        {!!value && (
          <button
            type="button"
            onClick={handleLimpar}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <FontAwesomeIcon icon={faTimes} />
            Limpar
          </button>
        )}
      </div>
    </div>
  );
}

DateField.propTypes = {
  name: PropTypes.string.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};

function EquipamentoForm({
  onSubmit,
  onCancel,
  initialData = null,
  isEditing = false,
}) {
  const [formData, setFormData] = useState(ESTADO_INICIAL_VAZIO);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unidadesDisponiveis, setUnidadesDisponiveis] = useState([]);
  const [error, setError] = useState('');
  const [semPatrimonio, setSemPatrimonio] = useState(false);

  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    getUnidades()
      .then((data) =>
        setUnidadesDisponiveis(
          (data || []).sort((a, b) =>
            (a.nomeSistema || '').localeCompare(b.nomeSistema || '')
          )
        )
      )
      .catch(() => addToast('Erro ao carregar lista de unidades.', 'error'));
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
          ? initialData.dataInstalacao.split('T')[0]
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        setor: formData.setor.trim(),
        fabricante: formData.fabricante.trim(),
        anoFabricacao: String(formData.anoFabricacao || '').trim(),
        numeroPatrimonio: String(formData.numeroPatrimonio || '').trim(),
        registroAnvisa: String(formData.registroAnvisa || '').trim(),
        observacoes: String(formData.observacoes || '').trim(),
      });
    } catch (apiError) {
      setError(
        apiError?.response?.data?.message ||
          apiError?.message ||
          'Erro ao salvar equipamento.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelClick = () => {
    if (onCancel) onCancel();
    else navigate('/equipamentos');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <FormField label="Nº Série (Tag)" required>
            <TextInput
              type="text"
              name="tag"
              value={formData.tag}
              onChange={handleChange}
              placeholder="Digite a tag do equipamento"
              required
              disabled={isEditing}
            />
          </FormField>

          <FormField label="Modelo" required>
            <TextInput
              type="text"
              name="modelo"
              value={formData.modelo}
              onChange={handleChange}
              placeholder="Digite o modelo"
              required
            />
          </FormField>

          <FormField label="Tipo de equipamento" required>
            <SelectInput
              name="tipo"
              value={formData.tipo}
              onChange={handleChange}
              required
            >
              <option value="">Selecione...</option>
              {LISTA_TIPOS.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </SelectInput>
          </FormField>

          <FormField label="Unidade / Hospital" required>
            <SelectInput
              name="unidadeId"
              value={formData.unidadeId}
              onChange={handleChange}
              required
            >
              <option value="">Selecione uma unidade</option>
              {unidadesDisponiveis.map((unidade) => (
                <option key={unidade.id} value={unidade.id}>
                  {unidade.nomeSistema}
                </option>
              ))}
            </SelectInput>
          </FormField>

          <FormField label="Localização / Setor">
            <TextInput
              type="text"
              name="setor"
              value={formData.setor}
              onChange={handleChange}
              placeholder="Ex.: Sala 2, Bloco A"
            />
          </FormField>

          <FormField label="Status inicial">
            <SelectInput
              name="status"
              value={formData.status}
              onChange={handleChange}
            >
              {OPCOES_STATUS.map((opt) => (
                <option key={opt.valor} value={opt.valor}>
                  {opt.rotulo}
                </option>
              ))}
            </SelectInput>
          </FormField>
        </div>
      </PageSection>

      <PageSection
        title="Detalhes técnicos e controle"
        description="Informações complementares para rastreabilidade e gestão do ativo."
      >
        <div className="mb-5 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <FontAwesomeIcon icon={faScrewdriverWrench} />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Dados técnicos e patrimoniais
            </p>
            <p className="text-sm text-slate-500">
              Esses dados ajudam no inventário, manutenção e auditoria.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <FormField label="Fabricante">
            <TextInput
              type="text"
              name="fabricante"
              value={formData.fabricante}
              onChange={handleChange}
              placeholder="Digite o fabricante"
            />
          </FormField>

          <FormField
            label="Ano de fabricação"
            hint="Use 4 dígitos. Ex.: 2024"
          >
            <TextInput
              type="number"
              name="anoFabricacao"
              value={formData.anoFabricacao}
              onChange={handleChange}
              placeholder="Ex.: 2024"
              min="1900"
              max="2100"
            />
          </FormField>

          <FormField
            label="Data de instalação"
            hint="Você pode selecionar no calendário ou digitar."
          >
            <DateField
              name="dataInstalacao"
              value={formData.dataInstalacao}
              onChange={handleChange}
            />
          </FormField>

          <div className="md:col-span-2 xl:col-span-1">
            <FormField label="Número de patrimônio">
              <div className="space-y-2">
                <TextInput
                  type="text"
                  name="numeroPatrimonio"
                  value={formData.numeroPatrimonio}
                  onChange={handleChange}
                  disabled={semPatrimonio}
                  placeholder={semPatrimonio ? '' : 'Digite o número'}
                />

                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={semPatrimonio}
                    onChange={handleCheckboxChange}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Equipamento sem etiqueta de patrimônio
                </label>
              </div>
            </FormField>
          </div>

          <FormField label="Registro ANVISA">
            <TextInput
              type="text"
              name="registroAnvisa"
              value={formData.registroAnvisa}
              onChange={handleChange}
              placeholder="Digite o registro"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Observações">
            <TextareaInput
              name="observacoes"
              rows={4}
              value={formData.observacoes}
              onChange={handleChange}
              placeholder="Adicione observações relevantes sobre o equipamento"
            />
          </FormField>
        </div>
      </PageSection>

      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleCancelClick}
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
              : 'Adicionar equipamento'}
        </button>
      </div>
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