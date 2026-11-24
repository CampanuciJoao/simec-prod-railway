import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

import {
  Button,
  Checkbox,
  DateInput,
  Input,
  SelectMenu,
  Textarea,
  TimeInput,
} from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import {
  atualizarLembrete,
  criarLembrete,
  getUsuariosTenant,
} from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

const RECORRENCIA_OPTIONS = [
  { value: 'UNICA',   label: 'Uma vez (sem repetir)' },
  { value: 'DIARIA',  label: 'Diariamente' },
  { value: 'SEMANAL', label: 'Semanalmente' },
  { value: 'MENSAL',  label: 'Mensalmente' },
];

const ENTIDADE_TIPO_OPTIONS = [
  { value: '',             label: 'Nenhum' },
  { value: 'OS_CORRETIVA', label: 'OS Corretiva' },
  { value: 'EQUIPAMENTO',  label: 'Equipamento' },
  { value: 'UNIDADE',      label: 'Unidade' },
  { value: 'SEGURO',       label: 'Seguro' },
  { value: 'CONTRATO',     label: 'Contrato' },
];

// Divide ISO em partes locais (YYYY-MM-DD, HH:MM) pra alimentar os inputs
// separados sem mexer no timezone do navegador.
function dividirDataHora(iso) {
  if (!iso) return { data: '', hora: '' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { data: '', hora: '' };
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  const hh   = String(d.getHours()).padStart(2, '0');
  const mi   = String(d.getMinutes()).padStart(2, '0');
  return { data: `${yyyy}-${mm}-${dd}`, hora: `${hh}:${mi}` };
}

function unirDataHora(data, hora) {
  if (!data || !hora) return null;
  const [yyyy, mm, dd] = data.split('-').map(Number);
  const [hh, mi]       = hora.split(':').map(Number);
  const d = new Date(yyyy, (mm || 1) - 1, dd || 1, hh || 0, mi || 0, 0, 0);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function ModalLembrete({
  open,
  onClose,
  onSaved,
  lembreteInicial = null,
  entidadeVinculo = null, // { tipo, id, label }
}) {
  const toast = useToast();
  const auth = useAuth?.();
  const usuarioAtual = auth?.usuario || auth?.user || null;

  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    data: '',
    hora: '',
    recorrencia: 'UNICA',
    destinatarioId: '',
    canalTelegram: true,
    canalEmail: false,
    entidadeTipo: '',
    entidadeId: '',
    entidadeLabel: '',
  });
  const [usuarios, setUsuarios] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const modoEdicao = Boolean(lembreteInicial?.id);

  // Reseta / carrega inicial sempre que abre
  useEffect(() => {
    if (!open) return;

    if (modoEdicao) {
      const { data, hora } = dividirDataHora(lembreteInicial.lembrarEm);
      const canais = Array.isArray(lembreteInicial.canais) ? lembreteInicial.canais : [];
      setForm({
        titulo: lembreteInicial.titulo || '',
        descricao: lembreteInicial.descricao || '',
        data,
        hora,
        recorrencia: lembreteInicial.recorrencia || 'UNICA',
        destinatarioId: lembreteInicial.destinatarioId || '',
        canalTelegram: canais.includes('TELEGRAM'),
        canalEmail: canais.includes('EMAIL'),
        entidadeTipo: lembreteInicial.entidadeTipo || '',
        entidadeId: lembreteInicial.entidadeId || '',
        entidadeLabel: lembreteInicial.entidadeLabel || '',
      });
    } else {
      // Default: amanha nesse mesmo horario, atribuido pra mim mesmo,
      // Telegram ligado por padrao (canal mais eficaz pro usuario).
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      const { data, hora } = dividirDataHora(amanha.toISOString());
      setForm({
        titulo: '',
        descricao: '',
        data,
        hora,
        recorrencia: 'UNICA',
        destinatarioId: usuarioAtual?.id || '',
        canalTelegram: true,
        canalEmail: false,
        entidadeTipo: entidadeVinculo?.tipo || '',
        entidadeId: entidadeVinculo?.id || '',
        entidadeLabel: entidadeVinculo?.label || '',
      });
    }
  }, [open, modoEdicao, lembreteInicial, entidadeVinculo, usuarioAtual?.id]);

  // Carrega lista de usuarios do tenant 1x quando o modal abre
  useEffect(() => {
    if (!open || usuarios.length > 0) return;
    getUsuariosTenant()
      .then((list) => setUsuarios(Array.isArray(list) ? list : []))
      .catch(() => setUsuarios([]));
  }, [open, usuarios.length]);

  const usuariosOptions = useMemo(
    () =>
      usuarios.map((u) => ({
        value: u.id,
        label: u.id === usuarioAtual?.id ? `${u.nome} (eu)` : u.nome,
      })),
    [usuarios, usuarioAtual?.id]
  );

  const handleChange = useCallback((name, value) => {
    setForm((p) => ({ ...p, [name]: value }));
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (submitting) return;

      if (!form.titulo?.trim()) {
        toast?.addToast?.('Informe o título.', 'warning');
        return;
      }
      const lembrarEm = unirDataHora(form.data, form.hora);
      if (!lembrarEm) {
        toast?.addToast?.('Informe data e hora.', 'warning');
        return;
      }

      const canais = ['PAINEL'];
      if (form.canalTelegram) canais.push('TELEGRAM');
      if (form.canalEmail)    canais.push('EMAIL');

      const payload = {
        titulo: form.titulo.trim(),
        descricao: form.descricao?.trim() || null,
        lembrarEm,
        recorrencia: form.recorrencia,
        canais,
        destinatarioId: form.destinatarioId || usuarioAtual?.id,
        entidadeTipo: form.entidadeTipo || null,
        entidadeId: form.entidadeTipo ? form.entidadeId : null,
        entidadeLabel: form.entidadeTipo ? form.entidadeLabel : null,
      };

      setSubmitting(true);
      try {
        if (modoEdicao) {
          await atualizarLembrete(lembreteInicial.id, payload);
          toast?.addToast?.('Lembrete atualizado.', 'success');
        } else {
          await criarLembrete(payload);
          toast?.addToast?.('Lembrete criado.', 'success');
        }
        onSaved?.();
      } catch (err) {
        toast?.addToast?.(
          err?.response?.data?.message || 'Erro ao salvar lembrete.',
          'error'
        );
      } finally {
        setSubmitting(false);
      }
    },
    [form, submitting, modoEdicao, lembreteInicial, usuarioAtual, toast, onSaved]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-[2px]"
      style={{ backgroundColor: 'rgba(2, 6, 23, 0.55)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border shadow-2xl"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-soft)',
          color: 'var(--text-primary)',
        }}
        onClick={(ev) => ev.stopPropagation()}
      >
        <div
          className="flex items-center justify-between gap-4 px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-soft)' }}
        >
          <h3 className="text-lg font-semibold">
            {modoEdicao ? 'Editar lembrete' : 'Novo lembrete'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border transition"
            style={{ borderColor: 'var(--border-soft)', color: 'var(--text-muted)' }}
            aria-label="Fechar"
            title="Fechar"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto px-5 py-5 space-y-4">
          <Input
            label="Título"
            name="titulo"
            value={form.titulo}
            onChange={(e) => handleChange('titulo', e.target.value)}
            placeholder="Ex: Ligar para a seguradora"
            required
          />

          <Textarea
            label="Descrição (opcional)"
            name="descricao"
            value={form.descricao}
            onChange={(e) => handleChange('descricao', e.target.value)}
            rows={2}
            placeholder="Detalhes ou contexto do lembrete"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DateInput
              label="Data"
              name="data"
              value={form.data}
              onChange={(e) => handleChange('data', e.target.value)}
              required
            />
            <TimeInput
              label="Hora"
              name="hora"
              value={form.hora}
              onChange={(e) => handleChange('hora', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectMenu
              label="Repetir"
              value={form.recorrencia}
              onChange={(v) => handleChange('recorrencia', v)}
              options={RECORRENCIA_OPTIONS}
            />
            <SelectMenu
              label="Para quem"
              value={form.destinatarioId}
              onChange={(v) => handleChange('destinatarioId', v)}
              options={usuariosOptions}
              placeholder={usuariosOptions.length ? 'Selecione' : 'Carregando...'}
            />
          </div>

          <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border-soft)' }}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Canais de entrega
            </p>
            <div className="flex flex-wrap gap-4">
              <Checkbox label="Painel (no sino)" checked disabled />
              <Checkbox
                label="Telegram"
                checked={form.canalTelegram}
                onChange={(e) => handleChange('canalTelegram', e.target.checked)}
              />
              <Checkbox
                label="E-mail"
                checked={form.canalEmail}
                onChange={(e) => handleChange('canalEmail', e.target.checked)}
              />
            </div>
          </div>

          <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border-soft)' }}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Vínculo (opcional)
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <SelectMenu
                label="Referente a"
                value={form.entidadeTipo}
                onChange={(v) => handleChange('entidadeTipo', v)}
                options={ENTIDADE_TIPO_OPTIONS}
              />
              {form.entidadeTipo && (
                <>
                  <Input
                    label="ID da entidade"
                    name="entidadeId"
                    value={form.entidadeId}
                    onChange={(e) => handleChange('entidadeId', e.target.value)}
                    placeholder="UUID"
                  />
                  <Input
                    label="Rótulo visível"
                    name="entidadeLabel"
                    value={form.entidadeLabel}
                    onChange={(e) => handleChange('entidadeLabel', e.target.value)}
                    placeholder="Ex: OS #12345"
                  />
                </>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Salvando...' : modoEdicao ? 'Salvar alterações' : 'Criar lembrete'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

ModalLembrete.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func,
  lembreteInicial: PropTypes.object,
  entidadeVinculo: PropTypes.shape({
    tipo: PropTypes.string,
    id: PropTypes.string,
    label: PropTypes.string,
  }),
};

export default ModalLembrete;
