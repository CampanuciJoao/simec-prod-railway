import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlugCircleBolt,
  faHashtag,
  faFileLines,
  faSave,
  faSpinner,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';

import PageSection from '../ui/PageSection';

const ESTADO_INICIAL_VAZIO = {
  nome: '',
  numeroSerie: '',
  descricao: '',
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

FormField.propTypes = {
  label: PropTypes.string.isRequired,
  required: PropTypes.bool,
  hint: PropTypes.string,
  children: PropTypes.node.isRequired,
};

function TextInput(props) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
    />
  );
}

function TextareaInput(props) {
  return (
    <textarea
      {...props}
      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
    />
  );
}

function AcessorioForm({
  onSubmit,
  onCancel,
  initialData = null,
  isEditing = false,
  isSubmitting = false,
  error = null,
}) {
  const [formData, setFormData] = useState(ESTADO_INICIAL_VAZIO);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (isEditing && initialData) {
      setFormData({
        nome: initialData.nome || '',
        numeroSerie: initialData.numeroSerie || '',
        descricao: initialData.descricao || '',
      });
    } else {
      setFormData(ESTADO_INICIAL_VAZIO);
    }

    setLocalError('');
  }, [initialData, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));

    if (localError) {
      setLocalError('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const nomeLimpo = formData.nome.trim();
    const numeroSerieLimpo = formData.numeroSerie.trim();
    const descricaoLimpa = formData.descricao.trim();

    if (!nomeLimpo) {
      setLocalError('O nome do acessório é obrigatório.');
      return;
    }

    onSubmit({
      nome: nomeLimpo,
      numeroSerie: numeroSerieLimpo,
      descricao: descricaoLimpa,
    });
  };

  const errorMessage = localError || error || '';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <PageSection
        title={isEditing ? 'Editar acessório' : 'Novo acessório'}
        description="Cadastre informações básicas do acessório vinculado ao equipamento."
      >
        <div className="mb-5 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <FontAwesomeIcon icon={faPlugCircleBolt} />
          </span>

          <div>
            <p className="text-sm font-semibold text-slate-900">
              Dados do acessório
            </p>
            <p className="text-sm text-slate-500">
              Preencha as informações principais para identificação e rastreabilidade.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            label="Nome do acessório"
            required
            hint="Ex.: Sonda Convexa, Cabo ECG, Transdutor"
          >
            <div className="relative">
              <FontAwesomeIcon
                icon={faPlugCircleBolt}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <TextInput
                type="text"
                id="nome-acessorio"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                required
                disabled={isSubmitting}
                placeholder="Digite o nome do acessório"
                className="pl-10"
              />
            </div>
          </FormField>

          <FormField
            label="Número de série"
            hint="Opcional, mas recomendado para controle"
          >
            <div className="relative">
              <FontAwesomeIcon
                icon={faHashtag}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <TextInput
                type="text"
                id="numeroSerie-acessorio"
                name="numeroSerie"
                value={formData.numeroSerie}
                onChange={handleChange}
                disabled={isSubmitting}
                placeholder="Ex.: SN-12345ABC"
                className="pl-10"
              />
            </div>
          </FormField>
        </div>

        <div className="mt-4">
          <FormField
            label="Descrição"
            hint="Use este campo para observações, especificações ou detalhes complementares"
          >
            <div className="relative">
              <FontAwesomeIcon
                icon={faFileLines}
                className="pointer-events-none absolute left-3 top-4 text-slate-400"
              />
              <TextareaInput
                id="descricao-acessorio"
                name="descricao"
                value={formData.descricao}
                onChange={handleChange}
                rows={4}
                disabled={isSubmitting}
                placeholder="Detalhes adicionais sobre o acessório"
                className="min-h-[110px] pl-10"
              />
            </div>
          </FormField>
        </div>
      </PageSection>

      <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-6">
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
              : 'Adicionar acessório'}
        </button>
      </div>
    </form>
  );
}

AcessorioForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  initialData: PropTypes.object,
  isEditing: PropTypes.bool,
  isSubmitting: PropTypes.bool,
  error: PropTypes.string,
};

export default AcessorioForm;