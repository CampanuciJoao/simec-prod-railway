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
  getStatusVinculacaoUsuario,
  getUsuariosTenant,
} from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import ModalVincularTelegram from './ModalVincularTelegram';

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
    canalTelegramGrupo: false,
    canalEmail: false,
    alertasAntes: [], // minutos antes do horario
    entidadeTipo: '',
    entidadeId: '',
    entidadeLabel: '',
  });
  const [usuarios, setUsuarios] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [vinculoModalOpen, setVinculoModalOpen] = useState(false);
  const [telegramVinculado, setTelegramVinculado] = useState(null); // null=nao sabe, true/false

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
        canalTelegramGrupo: canais.includes('TELEGRAM_GRUPO'),
        canalEmail: canais.includes('EMAIL'),
        alertasAntes: Array.isArray(lembreteInicial.alertasAntes) ? lembreteInicial.alertasAntes : [],
        entidadeTipo: lembreteInicial.entidadeTipo || '',
        entidadeId: lembreteInicial.entidadeId || '',
        entidadeLabel: lembreteInicial.entidadeLabel || '',
      });
    } else {
      // Default: HOJE + 15 minutos. Pequeno horizonte adiante do agora,
      // suficiente pra o usuario editar antes do dispatch mas perto o
      // bastante pro caso mais comum (lembrete "pra daqui a pouco").
      const quandoDefault = new Date(Date.now() + 15 * 60 * 1000);
      const { data, hora } = dividirDataHora(quandoDefault.toISOString());
      setForm({
        titulo: '',
        descricao: '',
        data,
        hora,
        recorrencia: 'UNICA',
        destinatarioId: usuarioAtual?.id || '',
        canalTelegram: true,
        canalTelegramGrupo: false,
        canalEmail: false,
        alertasAntes: [],
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

  // Checa vinculacao Telegram do USUARIO ATUAL quando o modal abre.
  // Usado pra mostrar aviso quando o destinatario e ele mesmo e nao vinculou.
  // Simplificacao: so testa o usuario atual — se ele atribui pra outro, o
  // backend decide se tem canal privado e devolve motivo no retorno.
  useEffect(() => {
    if (!open) return;
    getStatusVinculacaoUsuario()
      .then((r) => setTelegramVinculado(r?.status === 'vinculado'))
      .catch(() => setTelegramVinculado(null));
  }, [open, vinculoModalOpen]);

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
      if (form.canalTelegram)      canais.push('TELEGRAM');
      if (form.canalTelegramGrupo) canais.push('TELEGRAM_GRUPO');
      if (form.canalEmail)         canais.push('EMAIL');

      const payload = {
        titulo: form.titulo.trim(),
        descricao: form.descricao?.trim() || null,
        lembrarEm,
        recorrencia: form.recorrencia,
        canais,
        alertasAntes: Array.from(new Set(form.alertasAntes || [])),
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
                label="Telegram (privado do destinatário)"
                checked={form.canalTelegram}
                onChange={(e) => handleChange('canalTelegram', e.target.checked)}
              />
              <Checkbox
                label="Avisar também no grupo"
                checked={form.canalTelegramGrupo}
                onChange={(e) => handleChange('canalTelegramGrupo', e.target.checked)}
                disabled={!form.canalTelegram}
              />
              <Checkbox
                label="E-mail"
                checked={form.canalEmail}
                onChange={(e) => handleChange('canalEmail', e.target.checked)}
              />
            </div>

            {/* Alertas antecipados — avisos extra antes do horario marcado */}
            <AlertasAntesPicker
              valor={form.alertasAntes}
              onChange={(v) => handleChange('alertasAntes', v)}
            />

            {/* Aviso quando o proprio usuario e o destinatario e nao vinculou
                o Telegram privado — oferece o modal de vinculacao na hora. */}
            {form.canalTelegram
              && telegramVinculado === false
              && form.destinatarioId === usuarioAtual?.id
              && !form.canalTelegramGrupo && (
                <div
                  className="mt-3 flex flex-col gap-2 rounded-lg border px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between"
                  style={{
                    borderColor: 'var(--color-warning-soft)',
                    backgroundColor: 'var(--color-warning-surface)',
                    color: 'var(--color-warning)',
                  }}
                >
                  <span>
                    Você ainda não vinculou seu Telegram — este lembrete não vai chegar por lá.
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setVinculoModalOpen(true)}
                  >
                    Vincular agora
                  </Button>
                </div>
            )}
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

      <ModalVincularTelegram
        open={vinculoModalOpen}
        onClose={() => setVinculoModalOpen(false)}
        onChange={() => setVinculoModalOpen(false)}
      />
    </div>
  );
}

/**
 * Picker de "avisar antes" — toggles de minutos. Usuario marca quantos
 * quiser. Lista fechada pra corresponder ao backend (ALERTAS_ANTES_VALIDOS).
 */
const OPCOES_ALERTAS_ANTES = [
  { valor: 5,     label: '5 min' },
  { valor: 15,    label: '15 min' },
  { valor: 30,    label: '30 min' },
  { valor: 60,    label: '1 hora' },
  { valor: 120,   label: '2 horas' },
  { valor: 360,   label: '6 horas' },
  { valor: 720,   label: '12 horas' },
  { valor: 1440,  label: '1 dia' },
  { valor: 2880,  label: '2 dias' },
  { valor: 10080, label: '1 semana' },
];

function AlertasAntesPicker({ valor, onChange }) {
  const selecionados = new Set(Array.isArray(valor) ? valor : []);
  const toggle = (v) => {
    const novo = new Set(selecionados);
    if (novo.has(v)) novo.delete(v);
    else novo.add(v);
    onChange(Array.from(novo).sort((a, b) => b - a));
  };

  return (
    <div
      className="rounded-xl border p-3"
      style={{ borderColor: 'var(--border-soft)' }}
    >
      <p
        className="mb-2 text-xs font-semibold uppercase tracking-wider"
        style={{ color: 'var(--text-muted)' }}
      >
        Avisar antes (opcional)
      </p>
      <p className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        Além da notificação no horário, você pode receber lembretes antecipados
        pelos mesmos canais marcados acima.
      </p>
      <div className="flex flex-wrap gap-2">
        {OPCOES_ALERTAS_ANTES.map((op) => {
          const ativo = selecionados.has(op.valor);
          return (
            <button
              key={op.valor}
              type="button"
              onClick={() => toggle(op.valor)}
              className="rounded-full px-3 py-1.5 text-xs font-semibold transition"
              style={{
                backgroundColor: ativo ? 'var(--brand-primary)' : 'var(--bg-surface-subtle)',
                color: ativo ? '#ffffff' : 'var(--text-secondary)',
                border: `1px solid ${ativo ? 'var(--brand-primary)' : 'var(--border-soft)'}`,
              }}
            >
              {op.label}
            </button>
          );
        })}
      </div>
      {selecionados.size > 0 && (
        <p className="mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {selecionados.size} aviso(s) antecipado(s) selecionado(s).
        </p>
      )}
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
