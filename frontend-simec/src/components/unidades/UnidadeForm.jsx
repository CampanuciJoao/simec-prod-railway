import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSave,
  faTimes,
  faSpinner,
  faBuilding,
  faMapLocationDot,
} from '@fortawesome/free-solid-svg-icons';

import PageSection from '../ui/PageSection';

const ESTADO_INICIAL_VAZIO = {
  nomeSistema: '',
  nomeFantasia: '',
  cnpj: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  cep: '',
};

const ESTADOS_BRASILEIROS = [
  { uf: 'AC', nome: 'Acre' },
  { uf: 'AL', nome: 'Alagoas' },
  { uf: 'AP', nome: 'Amapá' },
  { uf: 'AM', nome: 'Amazonas' },
  { uf: 'BA', nome: 'Bahia' },
  { uf: 'CE', nome: 'Ceará' },
  { uf: 'DF', nome: 'Distrito Federal' },
  { uf: 'ES', nome: 'Espírito Santo' },
  { uf: 'GO', nome: 'Goiás' },
  { uf: 'MA', nome: 'Maranhão' },
  { uf: 'MT', nome: 'Mato Grosso' },
  { uf: 'MS', nome: 'Mato Grosso do Sul' },
  { uf: 'MG', nome: 'Minas Gerais' },
  { uf: 'PA', nome: 'Pará' },
  { uf: 'PB', nome: 'Paraíba' },
  { uf: 'PR', nome: 'Paraná' },
  { uf: 'PE', nome: 'Pernambuco' },
  { uf: 'PI', nome: 'Piauí' },
  { uf: 'RJ', nome: 'Rio de Janeiro' },
  { uf: 'RN', nome: 'Rio Grande do Norte' },
  { uf: 'RS', nome: 'Rio Grande do Sul' },
  { uf: 'RO', nome: 'Rondônia' },
  { uf: 'RR', nome: 'Roraima' },
  { uf: 'SC', nome: 'Santa Catarina' },
  { uf: 'SP', nome: 'São Paulo' },
  { uf: 'SE', nome: 'Sergipe' },
  { uf: 'TO', nome: 'Tocantins' },
];

const formatarCNPJ = (value) => {
  if (!value) return '';
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

const formatarCEP = (value) => {
  if (!value) return '';
  return value
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1');
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

function UnidadeForm({
  onSubmit,
  initialData = null,
  isEditing = false,
  onCancel,
}) {
  const [formData, setFormData] = useState(ESTADO_INICIAL_VAZIO);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isEditing && initialData) {
      const dadosFormatados = {
        nomeSistema: initialData.nomeSistema || '',
        nomeFantasia: initialData.nomeFantasia || '',
        cnpj: initialData.cnpj ? formatarCNPJ(initialData.cnpj) : '',
        logradouro: initialData.logradouro || '',
        numero: initialData.numero || '',
        complemento: initialData.complemento || '',
        bairro: initialData.bairro || '',
        cidade: initialData.cidade || '',
        estado: initialData.estado || '',
        cep: initialData.cep ? formatarCEP(initialData.cep) : '',
      };

      setFormData(dadosFormatados);
    } else {
      setFormData(ESTADO_INICIAL_VAZIO);
    }
  }, [initialData, isEditing]);

  const handleChange = (e) => {
    let { name, value } = e.target;

    if (name === 'cnpj') value = formatarCNPJ(value);
    if (name === 'cep') value = formatarCEP(value);

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.nomeSistema || !formData.nomeFantasia) {
      setError('Nome da Unidade e Nome Fantasia são campos obrigatórios.');
      return;
    }

    setIsSubmitting(true);

    const dadosParaApi = {
      ...formData,
      cnpj: formData.cnpj.replace(/\D/g, ''),
      cep: formData.cep.replace(/\D/g, ''),
    };

    try {
      await onSubmit(dadosParaApi);
    } catch (apiError) {
      setError(
        apiError?.response?.data?.message ||
          apiError?.message ||
          `Erro ao ${isEditing ? 'atualizar' : 'adicionar'} unidade.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelClick = () => {
    if (onCancel) onCancel();
    else navigate('/cadastros/unidades');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <PageSection
        title="Informações da unidade"
        description="Dados principais de identificação da unidade."
      >
        <div className="mb-5 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <FontAwesomeIcon icon={faBuilding} />
          </span>

          <div>
            <p className="text-sm font-semibold text-slate-900">
              Cadastro principal da unidade
            </p>
            <p className="text-sm text-slate-500">
              Preencha os dados básicos para registrar a unidade no sistema.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <FormField label="Nome da unidade (apelido)" required>
            <TextInput
              type="text"
              name="nomeSistema"
              value={formData.nomeSistema}
              onChange={handleChange}
              placeholder="Ex.: Hospital Central"
              required
            />
          </FormField>

          <FormField label="Nome fantasia" required>
            <TextInput
              type="text"
              name="nomeFantasia"
              value={formData.nomeFantasia}
              onChange={handleChange}
              placeholder="Ex.: Hospital Central LTDA"
              required
            />
          </FormField>

          <FormField label="CNPJ">
            <TextInput
              type="text"
              name="cnpj"
              value={formData.cnpj}
              onChange={handleChange}
              maxLength={18}
              placeholder="00.000.000/0000-00"
            />
          </FormField>
        </div>
      </PageSection>

      <PageSection
        title="Endereço"
        description="Informações de localização da unidade."
      >
        <div className="mb-5 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <FontAwesomeIcon icon={faMapLocationDot} />
          </span>

          <div>
            <p className="text-sm font-semibold text-slate-900">
              Dados de localização
            </p>
            <p className="text-sm text-slate-500">
              Informe o endereço para facilitar rastreabilidade e gestão.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="md:col-span-2">
            <FormField label="Logradouro">
              <TextInput
                type="text"
                name="logradouro"
                value={formData.logradouro}
                onChange={handleChange}
                placeholder="Rua, avenida, travessa..."
              />
            </FormField>
          </div>

          <FormField label="Número">
            <TextInput
              type="text"
              name="numero"
              value={formData.numero}
              onChange={handleChange}
              placeholder="Nº"
            />
          </FormField>

          <FormField label="Complemento">
            <TextInput
              type="text"
              name="complemento"
              value={formData.complemento}
              onChange={handleChange}
              placeholder="Sala, bloco, andar..."
            />
          </FormField>

          <FormField label="Bairro">
            <TextInput
              type="text"
              name="bairro"
              value={formData.bairro}
              onChange={handleChange}
              placeholder="Digite o bairro"
            />
          </FormField>

          <FormField label="CEP">
            <TextInput
              type="text"
              name="cep"
              value={formData.cep}
              onChange={handleChange}
              maxLength={9}
              placeholder="00000-000"
            />
          </FormField>

          <FormField label="Cidade">
            <TextInput
              type="text"
              name="cidade"
              value={formData.cidade}
              onChange={handleChange}
              placeholder="Digite a cidade"
            />
          </FormField>

          <FormField label="Estado (UF)">
            <SelectInput
              name="estado"
              value={formData.estado}
              onChange={handleChange}
            >
              <option value="">Selecione um estado</option>
              {ESTADOS_BRASILEIROS.map((estado) => (
                <option key={estado.uf} value={estado.uf}>
                  {estado.nome}
                </option>
              ))}
            </SelectInput>
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
              : 'Adicionar unidade'}
        </button>
      </div>
    </form>
  );
}

UnidadeForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  initialData: PropTypes.object,
  isEditing: PropTypes.bool,
  onCancel: PropTypes.func,
};

export default UnidadeForm;