import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSave,
  faEnvelope,
  faUser,
  faClock,
  faXmark,
  faBell,
} from '@fortawesome/free-solid-svg-icons';

import Button from '@/components/ui/primitives/Button';
import Card from '@/components/ui/primitives/Card';
import Input from '@/components/ui/primitives/Input';

const ESTADO_INICIAL = {
  nome: '',
  email: '',
  diasAntecedencia: 30,
  recebeAlertasContrato: true,
  recebeAlertasManutencao: false,
  recebeAlertasSeguro: false,
  ativo: true,
};

function FormField({ label, required = false, children, hint = '' }) {
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

function ToggleField({ checked, onChange, label, description }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300">
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-800">{label}</div>
        {description ? (
          <div className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </div>
        ) : null}
      </div>

      <span
        className={[
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition',
          checked ? 'bg-blue-600' : 'bg-slate-300',
        ].join(' ')}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="peer sr-only"
        />
        <span
          className={[
            'inline-block h-5 w-5 transform rounded-full bg-white shadow transition',
            checked ? 'translate-x-5' : 'translate-x-1',
          ].join(' ')}
        />
      </span>
    </label>
  );
}

function EmailForm({
  initialData = null,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) {
  const [formData, setFormData] = useState(ESTADO_INICIAL);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...ESTADO_INICIAL,
        ...initialData,
        nome: initialData.nome || '',
        email: initialData.email || '',
        diasAntecedencia: Number(initialData.diasAntecedencia ?? 30),
        recebeAlertasContrato: Boolean(initialData.recebeAlertasContrato),
        recebeAlertasManutencao: Boolean(initialData.recebeAlertasManutencao),
        recebeAlertasSeguro: Boolean(initialData.recebeAlertasSeguro),
        ativo:
          typeof initialData.ativo === 'boolean'
            ? initialData.ativo
            : true,
      });
      setError('');
      return;
    }

    setFormData(ESTADO_INICIAL);
    setError('');
  }, [initialData]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? checked
          : type === 'number'
            ? Number(value || 0)
            : value,
    }));

    if (error) {
      setError('');
    }
  };

  const validate = () => {
    if (!String(formData.email || '').trim()) {
      return 'O e-mail é obrigatório.';
    }

    const email = String(formData.email || '').trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return 'Informe um e-mail válido.';
    }

    if (!Number.isFinite(Number(formData.diasAntecedencia))) {
      return 'Dias de antecedência precisa ser um número válido.';
    }

    if (Number(formData.diasAntecedencia) < 0) {
      return 'Dias de antecedência não pode ser negativo.';
    }

    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await onSubmit({
        nome: String(formData.nome || '').trim(),
        email: String(formData.email || '').trim(),
        diasAntecedencia: Number(formData.diasAntecedencia || 0),
        recebeAlertasContrato: Boolean(formData.recebeAlertasContrato),
        recebeAlertasManutencao: Boolean(formData.recebeAlertasManutencao),
        recebeAlertasSeguro: Boolean(formData.recebeAlertasSeguro),
        ativo: Boolean(formData.ativo),
      });
    } catch (submitError) {
      setError(
        submitError?.response?.data?.message ||
          submitError?.message ||
          'Não foi possível salvar o e-mail.'
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <Card>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Nome">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <FontAwesomeIcon icon={faUser} />
              </span>
              <Input
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                placeholder="Ex.: Financeiro"
                className="pl-10"
              />
            </div>
          </FormField>

          <FormField label="E-mail" required>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <FontAwesomeIcon icon={faEnvelope} />
              </span>
              <Input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="email@empresa.com"
                className="pl-10"
              />
            </div>
          </FormField>

          <FormField
            label="Dias de antecedência"
            hint="Número de dias antes do vencimento para enviar alertas."
          >
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <FontAwesomeIcon icon={faClock} />
              </span>
              <Input
                name="diasAntecedencia"
                type="number"
                min="0"
                value={formData.diasAntecedencia}
                onChange={handleChange}
                className="pl-10"
              />
            </div>
          </FormField>

          <FormField
            label="Status"
            hint="Desative para manter o cadastro sem enviar notificações."
          >
            <ToggleField
              checked={formData.ativo}
              onChange={() =>
                setFormData((prev) => ({ ...prev, ativo: !prev.ativo }))
              }
              label={formData.ativo ? 'Ativo' : 'Inativo'}
              description="Controla se esse destinatário participa dos envios."
            />
          </FormField>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
            <FontAwesomeIcon icon={faBell} />
          </span>
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Tipos de alerta
            </h3>
            <p className="text-sm text-slate-500">
              Selecione quais notificações esse e-mail deve receber.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <ToggleField
            checked={formData.recebeAlertasContrato}
            onChange={() =>
              setFormData((prev) => ({
                ...prev,
                recebeAlertasContrato: !prev.recebeAlertasContrato,
              }))
            }
            label="Alertas de contratos"
            description="Recebe avisos relacionados a vencimentos e eventos de contratos."
          />

          <ToggleField
            checked={formData.recebeAlertasManutencao}
            onChange={() =>
              setFormData((prev) => ({
                ...prev,
                recebeAlertasManutencao: !prev.recebeAlertasManutencao,
              }))
            }
            label="Alertas de manutenções"
            description="Recebe avisos de manutenções programadas, pendentes ou críticas."
          />

          <ToggleField
            checked={formData.recebeAlertasSeguro}
            onChange={() =>
              setFormData((prev) => ({
                ...prev,
                recebeAlertasSeguro: !prev.recebeAlertasSeguro,
              }))
            }
            label="Alertas de seguros"
            description="Recebe notificações sobre vigência e vencimento de apólices."
          />
        </div>
      </Card>

      <div className="flex flex-wrap justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          <FontAwesomeIcon icon={faXmark} />
          Cancelar
        </Button>

        <Button type="submit" disabled={isSubmitting}>
          <FontAwesomeIcon icon={faSave} />
          {isSubmitting ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}

FormField.propTypes = {
  label: PropTypes.string.isRequired,
  required: PropTypes.bool,
  children: PropTypes.node.isRequired,
  hint: PropTypes.string,
};

ToggleField.propTypes = {
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
  description: PropTypes.string,
};

EmailForm.propTypes = {
  initialData: PropTypes.object,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool,
};

export default EmailForm;