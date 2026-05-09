import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faUser, faHashtag, faXmark, faBell } from '@fortawesome/free-solid-svg-icons';

import { Button, Card, Input } from '@/components/ui';

const ESTADO_INICIAL = {
  nome: '',
  chatId: '',
  ativo: true,
  recebeAlertasContrato:     true,
  recebeAlertasManutencao:   true,
  recebeAlertasSeguro:       true,
  recebeAlertasGehc:         true,
  recebeAlertasOsCorretiva:  false,
  recebeAlertasRecomendacao: false,
};

const TOGGLES = [
  { key: 'recebeAlertasContrato',     label: 'Alertas de contratos',      desc: 'Vencimentos e eventos de contratos.' },
  { key: 'recebeAlertasManutencao',   label: 'Alertas de manutenções',    desc: 'Manutenções programadas, pendentes ou críticas.' },
  { key: 'recebeAlertasSeguro',       label: 'Alertas de seguros',        desc: 'Vigência e vencimento de apólices.' },
  { key: 'recebeAlertasGehc',         label: 'Saúde GEHC',                desc: 'Hélio, compressor, temperatura e conectividade das RMs.' },
  { key: 'recebeAlertasOsCorretiva',  label: 'OS Corretiva',              desc: 'Visitas e ordens de serviço corretivo.' },
  { key: 'recebeAlertasRecomendacao', label: 'Recomendações',             desc: 'Sugestões geradas automaticamente pelo sistema.' },
];

function ToggleField({ checked, onChange, label, description }) {
  return (
    <label
      className="flex cursor-pointer items-start justify-between gap-4 rounded-xl p-4 transition"
      style={{ backgroundColor: 'var(--bg-surface-soft)', border: '1px solid var(--border-soft)' }}
    >
      <div className="min-w-0">
        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</div>
        {description && <div className="mt-1 text-xs leading-5" style={{ color: 'var(--text-muted)' }}>{description}</div>}
      </div>
      <span className={['relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition', checked ? 'bg-blue-600' : 'bg-slate-300'].join(' ')}>
        <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
        <span className={['inline-block h-5 w-5 transform rounded-full bg-white shadow transition', checked ? 'translate-x-5' : 'translate-x-1'].join(' ')} />
      </span>
    </label>
  );
}

function TelegramForm({ initialData = null, onSubmit, onCancel, isSubmitting = false }) {
  const [formData, setFormData] = useState(ESTADO_INICIAL);
  const [error, setError] = useState('');
  const isEditing = Boolean(initialData?.id);

  useEffect(() => {
    if (initialData) {
      setFormData({ ...ESTADO_INICIAL, ...initialData, nome: initialData.nome || '', chatId: initialData.chatId || '' });
      setError('');
      return;
    }
    setFormData(ESTADO_INICIAL);
    setError('');
  }, [initialData]);

  const set = (key) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData((prev) => ({ ...prev, [key]: val }));
    if (error) setError('');
  };

  const toggle = (key) => () => setFormData((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isEditing && !String(formData.chatId || '').trim()) {
      setError('O Chat ID é obrigatório.');
      return;
    }
    try {
      const payload = {
        nome: String(formData.nome || '').trim() || null,
        ativo: Boolean(formData.ativo),
        recebeAlertasContrato:     Boolean(formData.recebeAlertasContrato),
        recebeAlertasManutencao:   Boolean(formData.recebeAlertasManutencao),
        recebeAlertasSeguro:       Boolean(formData.recebeAlertasSeguro),
        recebeAlertasGehc:         Boolean(formData.recebeAlertasGehc),
        recebeAlertasOsCorretiva:  Boolean(formData.recebeAlertasOsCorretiva),
        recebeAlertasRecomendacao: Boolean(formData.recebeAlertasRecomendacao),
      };
      if (!isEditing) payload.chatId = String(formData.chatId).trim();
      await onSubmit(payload);
    } catch (err) {
      setError(err?.response?.data?.erro || err?.message || 'Erro ao salvar.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <Card>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Nome / Identificação</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <FontAwesomeIcon icon={faUser} />
              </span>
              <Input name="nome" value={formData.nome} onChange={set('nome')} placeholder="Ex.: Engenharia, Grupo Gestão" className="pl-10" />
            </div>
          </div>

          {isEditing ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Chat ID</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <FontAwesomeIcon icon={faHashtag} />
                </span>
                <Input value={formData.chatId} readOnly className="pl-10 bg-slate-50 text-slate-500 cursor-not-allowed" />
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>O Chat ID é definido na vinculação e não pode ser alterado.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Chat ID <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <FontAwesomeIcon icon={faHashtag} />
                </span>
                <Input name="chatId" value={formData.chatId} onChange={set('chatId')} placeholder="Ex.: -1001234567890" className="pl-10" />
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Para grupos: adicione o bot e use o ID negativo do grupo. Para chats privados, prefira vincular pelo código.</p>
            </div>
          )}

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Status</label>
            <ToggleField
              checked={formData.ativo}
              onChange={toggle('ativo')}
              label={formData.ativo ? 'Ativo' : 'Inativo'}
              description="Controla se este destinatário recebe notificações."
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
            <FontAwesomeIcon icon={faBell} />
          </span>
          <div>
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Tipos de alerta</h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Selecione o que este chat deve receber.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {TOGGLES.map(({ key, label, desc }) => (
            <ToggleField key={key} checked={Boolean(formData[key])} onChange={toggle(key)} label={label} description={desc} />
          ))}
        </div>
      </Card>

      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          <FontAwesomeIcon icon={faXmark} /> Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          <FontAwesomeIcon icon={faSave} /> {isSubmitting ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}

ToggleField.propTypes = { checked: PropTypes.bool.isRequired, onChange: PropTypes.func.isRequired, label: PropTypes.string.isRequired, description: PropTypes.string };
TelegramForm.propTypes = { initialData: PropTypes.object, onSubmit: PropTypes.func.isRequired, onCancel: PropTypes.func.isRequired, isSubmitting: PropTypes.bool };

export default TelegramForm;
