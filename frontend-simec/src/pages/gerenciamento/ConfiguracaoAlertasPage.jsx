import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBan,
  faBell,
  faCircleCheck,
  faCircleXmark,
  faClock,
  faDroplet,
  faFan,
  faGaugeHigh,
  faMagnet,
  faPenToSquare,
  faPlus,
  faRotateLeft,
  faSpinner,
  faThermometerHalf,
  faTrash,
  faWind,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

import {
  Button,
  InlineEmptyState,
  LoadingState,
  PageSection,
} from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { formatarDataHora } from '@/utils/timeUtils';
import {
  getGehcStatus,
  getGehcSuspensoes,
  postGehcSuspensao,
  deleteGehcSuspensao,
} from '@/services/api/gehcApi';
import {
  getAlertConfig,
  putAlertConfig,
  resetAlertConfig,
} from '@/services/api/alertConfigApi';

/* ─── Catálogo visual dos campos de cada módulo ────────────────────────────
 *
 * Mapeia o schema técnico do backend (chave → tipo/range) para a apresentação:
 * ícone, cor, label legível, sufixo (% / °C / PSI / GPM) e descrição.
 *
 * Para adicionar um novo módulo (ex: MAINTENANCE), basta declarar aqui
 * MODULE_CATALOG.MAINTENANCE com a mesma forma.
 */
const MODULE_CATALOG = {
  GEHC: {
    titulo: 'GE Healthcare',
    descricao: 'Saúde dos equipamentos GE (ressonância magnética) via integração GE InSite.',
    grupos: [
      {
        icon: faDroplet,
        cor: '#3b82f6',
        metrica: 'Nível de hélio',
        contexto: 'Quench (perda repentina de supercondutividade) ocorre abaixo de ~20%.',
        campos: [
          { key: 'heliumWarn',     label: 'Aviso (média)',    suffix: '%', operador: '<' },
          { key: 'heliumCritical', label: 'Crítico (alta)',   suffix: '%', operador: '<' },
        ],
      },
      {
        icon: faThermometerHalf,
        cor: '#f59e0b',
        metrica: 'Temperatura do resfriador',
        contexto: 'Temperatura elevada indica problema no sistema de resfriamento.',
        campos: [
          { key: 'tempWarn',     label: 'Aviso (média)',  suffix: '°C', operador: '>' },
          { key: 'tempCritical', label: 'Crítico (alta)', suffix: '°C', operador: '>' },
        ],
      },
      {
        icon: faGaugeHigh,
        cor: '#8b5cf6',
        metrica: 'Pressão do hélio',
        contexto: 'Faixa operacional segura entre mínimo e máximo.',
        campos: [
          { key: 'pressureMin',         label: 'Mínima segura',           suffix: 'PSI', operador: '<' },
          { key: 'pressureMax',         label: 'Máxima aviso',            suffix: 'PSI', operador: '>' },
          { key: 'pressureCriticalMax', label: 'Máxima crítica',          suffix: 'PSI', operador: '>' },
        ],
      },
      {
        icon: faWind,
        cor: '#06b6d4',
        metrica: 'Fluxo do resfriador',
        contexto: 'Fluxo mínimo para refrigeração adequada do sistema.',
        campos: [
          { key: 'flowMin', label: 'Aviso (mínimo)', suffix: 'GPM', operador: '<' },
        ],
      },
    ],
    fixos: [
      {
        icon: faFan,
        cor: '#10b981',
        metrica: 'Compressor',
        regra: 'Status ≠ ON',
        contexto: 'Compressor desligado requer verificação imediata.',
      },
      {
        icon: faMagnet,
        cor: '#ef4444',
        metrica: 'Magneto',
        regra: 'Offline',
        contexto: 'Perda de conexão com GE InSite pode indicar falha de rede ou do equipamento.',
      },
    ],
  },
};

const EVENTOS = [
  { value: '',                    label: 'Todos os eventos' },
  { value: 'GEHC_HELIO_BAIXO',   label: 'Hélio baixo' },
  { value: 'GEHC_HELIO_CRITICO', label: 'Hélio crítico' },
  { value: 'GEHC_COMPRESSOR_OFF',label: 'Compressor desligado' },
  { value: 'GEHC_TEMPERATURA_ALTA', label: 'Temperatura elevada' },
  { value: 'GEHC_FLUXO_BAIXO',   label: 'Fluxo baixo' },
  { value: 'GEHC_PRESSAO_ANORMAL', label: 'Pressão anormal' },
  { value: 'GEHC_MAGNETO_OFFLINE', label: 'Magneto offline' },
];

const DURACOES = [
  { label: '1 hora',    horas: 1 },
  { label: '6 horas',   horas: 6 },
  { label: '12 horas',  horas: 12 },
  { label: '24 horas',  horas: 24 },
  { label: '48 horas',  horas: 48 },
  { label: '7 dias',    horas: 168 },
];

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function countdownLabel(suspensoAte) {
  const diff = new Date(suspensoAte) - Date.now();
  if (diff <= 0) return 'Expirada';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0)   return `${h}h ${m}min`;
  return `${m}min`;
}

function nomeEquipamento(s) {
  if (!s.equipamento) return 'Todos os equipamentos';
  const e = s.equipamento;
  return e.apelido || e.modelo || e.tag;
}

function nomeEvento(tipoEvento) {
  return EVENTOS.find(e => e.value === tipoEvento)?.label ?? tipoEvento ?? 'Todos os eventos';
}

function formatRange(campo, valor) {
  if (valor === null || valor === undefined) return '—';
  return `${campo.operador} ${valor}${campo.suffix ? ' ' + campo.suffix : ''}`;
}

/* ─── Seção: módulo configurável (GEHC hoje) ──────────────────────────────── */

function ModuloAlertaCard({ moduleId, isAdmin, onAuditoria }) {
  const catalog = MODULE_CATALOG[moduleId];
  const [data, setData]       = useState(null);    // { config, defaults, meta }
  const [loading, setLoading] = useState(true);
  const [edit, setEdit]       = useState(false);
  const [draft, setDraft]     = useState({});
  const [saving, setSaving]   = useState(false);
  const [resetting, setReset] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [errors, setErrors]   = useState([]);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAlertConfig(moduleId);
      setData(res);
      setDraft(res.config);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [moduleId]);

  useEffect(() => { carregar(); }, [carregar]);

  const entrarEdicao = () => {
    setDraft({ ...data.config });
    setErrors([]);
    setFeedback(null);
    setEdit(true);
  };

  const cancelar = () => {
    setDraft({ ...data.config });
    setErrors([]);
    setEdit(false);
  };

  const handleChange = (key, valor) => {
    setDraft((d) => ({ ...d, [key]: valor === '' ? '' : Number(valor) }));
  };

  const salvar = async () => {
    setSaving(true);
    setErrors([]);
    setFeedback(null);
    // Manda só os campos que mudaram (mais barato e mais auditável)
    const diff = {};
    for (const [k, v] of Object.entries(draft)) {
      if (data.config[k] !== v && v !== '' && !Number.isNaN(Number(v))) {
        diff[k] = Number(v);
      }
    }
    if (Object.keys(diff).length === 0) {
      setEdit(false);
      setSaving(false);
      setFeedback({ ok: true, msg: 'Nenhuma alteração para salvar.' });
      return;
    }
    try {
      const res = await putAlertConfig(moduleId, diff);
      setData(res);
      setDraft(res.config);
      setEdit(false);
      setFeedback({ ok: true, msg: 'Configuração atualizada com sucesso.' });
      onAuditoria?.();
    } catch (err) {
      const apiErrors = err?.response?.data?.errors;
      if (Array.isArray(apiErrors)) {
        setErrors(apiErrors);
      } else {
        setFeedback({ ok: false, msg: err?.response?.data?.message ?? err.message });
      }
    } finally {
      setSaving(false);
    }
  };

  const restaurar = async () => {
    if (!window.confirm(`Restaurar os limites padrão de ${catalog.titulo}? Os valores atuais serão substituídos pelos defaults do sistema.`)) return;
    setReset(true);
    setErrors([]);
    setFeedback(null);
    try {
      const res = await resetAlertConfig(moduleId);
      setData(res);
      setDraft(res.config);
      setEdit(false);
      setFeedback({ ok: true, msg: 'Padrões restaurados.' });
      onAuditoria?.();
    } catch (err) {
      setFeedback({ ok: false, msg: err?.response?.data?.message ?? err.message });
    } finally {
      setReset(false);
    }
  };

  if (loading) return <LoadingState message={`Carregando configuração de ${catalog.titulo}...`} />;
  if (!data)   return <InlineEmptyState message="Falha ao carregar configuração." />;

  const customizado = data.meta && data.meta.updatedAt;

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface)' }}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b"
        style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface-soft)' }}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>{catalog.titulo}</p>
          <p className="mt-0.5 text-[11px] leading-snug" style={{ color: 'var(--text-muted)' }}>
            {catalog.descricao}
            {' · '}
            {customizado ? (
              <span style={{ color: 'var(--brand-primary)' }}>
                <FontAwesomeIcon icon={faPenToSquare} className="mr-1" />
                Customizado — última edição em {formatarDataHora(data.meta.updatedAt)}
              </span>
            ) : (
              <span style={{ color: 'var(--color-success)' }}>
                <FontAwesomeIcon icon={faCircleCheck} className="mr-1" />
                Usando padrões do sistema
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isAdmin && !edit && (
            <Button size="sm" variant="secondary" onClick={entrarEdicao}>
              <FontAwesomeIcon icon={faPenToSquare} className="mr-2" />
              Editar
            </Button>
          )}
          {isAdmin && edit && (
            <>
              <Button size="sm" variant="ghost" onClick={cancelar} disabled={saving}>
                <FontAwesomeIcon icon={faXmark} className="mr-2" />
                Cancelar
              </Button>
              <Button size="sm" variant="primary" onClick={salvar} disabled={saving}>
                <FontAwesomeIcon icon={saving ? faSpinner : faCircleCheck} spin={saving} className="mr-2" />
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </>
          )}
          {isAdmin && customizado && !edit && (
            <Button size="sm" variant="ghost" onClick={restaurar} disabled={resetting} title="Voltar aos padrões do sistema">
              <FontAwesomeIcon icon={resetting ? faSpinner : faRotateLeft} spin={resetting} className="mr-2" />
              Restaurar padrões
            </Button>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className="mx-5 mt-3 flex items-start gap-3 rounded-xl border px-3 py-2"
          style={{
            borderColor: feedback.ok ? 'var(--color-success)' : 'var(--color-danger)',
            backgroundColor: 'var(--bg-surface-soft)',
          }}
        >
          <FontAwesomeIcon
            icon={feedback.ok ? faCircleCheck : faCircleXmark}
            className="mt-0.5 shrink-0"
            style={{ color: feedback.ok ? 'var(--color-success)' : 'var(--color-danger)' }}
          />
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{feedback.msg}</p>
        </div>
      )}

      {errors.length > 0 && (
        <ul
          className="mx-5 mt-3 list-disc rounded-xl border px-6 py-2 text-sm"
          style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)', backgroundColor: 'var(--color-danger-surface)' }}
        >
          {errors.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      )}

      <div className="p-3 space-y-2">
        {catalog.grupos.map((grupo) => (
          <div
            key={grupo.metrica}
            className="rounded-lg border px-3 py-2.5"
            style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface-soft)' }}
          >
            <div className="flex items-start gap-2.5">
              <span
                className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs"
                style={{ backgroundColor: `${grupo.cor}1f`, color: grupo.cor }}
              >
                <FontAwesomeIcon icon={grupo.icon} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <p className="text-[13px] font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>{grupo.metrica}</p>
                  <p className="text-[11px] leading-snug" style={{ color: 'var(--text-muted)' }}>{grupo.contexto}</p>
                </div>

                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2">
                  {grupo.campos.map((campo) => {
                    const valorAtual = data.config[campo.key];
                    const valorDraft = draft[campo.key] ?? '';
                    return (
                      <div key={campo.key} className="min-w-0">
                        <p className="text-[9.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
                          {campo.label}
                        </p>
                        {edit ? (
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{campo.operador}</span>
                            <input
                              type="number"
                              step="any"
                              value={valorDraft}
                              onChange={(e) => handleChange(campo.key, e.target.value)}
                              style={{
                                width: '100%',
                                borderRadius: '0.375rem',
                                border: '1px solid var(--border-soft)',
                                backgroundColor: 'var(--bg-surface)',
                                color: 'var(--text-primary)',
                                padding: '0.25rem 0.5rem',
                                fontSize: '0.8125rem',
                                fontFamily: 'var(--font-mono)',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            />
                            {campo.suffix && (
                              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{campo.suffix}</span>
                            )}
                          </div>
                        ) : (
                          <p
                            className="stat-value mt-0.5 text-[13.5px] font-semibold leading-tight"
                            style={{ color: 'var(--color-danger)' }}
                          >
                            {formatRange(campo, valorAtual)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}

        {catalog.fixos?.map((fixo) => (
          <div
            key={fixo.metrica}
            className="rounded-lg border px-3 py-2 flex items-center gap-2.5"
            style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface-soft)' }}
          >
            <span
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs"
              style={{ backgroundColor: `${fixo.cor}1f`, color: fixo.cor }}
            >
              <FontAwesomeIcon icon={fixo.icon} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[13px] font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>{fixo.metrica}</p>
                <p className="text-[11.5px] font-semibold" style={{ color: 'var(--color-danger)' }}>{fixo.regra}</p>
              </div>
              <p className="mt-0.5 text-[11px] leading-snug" style={{ color: 'var(--text-muted)' }}>
                {fixo.contexto} <span style={{ fontStyle: 'italic' }}>(regra fixa — não customizável)</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Seção: suspensões ativas ────────────────────────────────────────────── */

function ListaSuspensoes({ suspensoes, onRemover, removendoId }) {
  if (!suspensoes?.length) {
    return <InlineEmptyState message="Nenhuma suspensão ativa. Todos os alertas estão operando normalmente." />;
  }

  return (
    <div className="space-y-2">
      {suspensoes.map(s => (
        <div
          key={s.id}
          className="flex items-start justify-between gap-4 rounded-2xl border px-4 py-3"
          style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface-soft)' }}
        >
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              <FontAwesomeIcon icon={faBan} className="mr-2" style={{ color: 'var(--color-warning)' }} />
              {nomeEquipamento(s)}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Evento suspenso: <strong>{nomeEvento(s.tipoEvento)}</strong>
            </p>
            {s.motivo && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Motivo: {s.motivo}</p>
            )}
            <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
              <FontAwesomeIcon icon={faClock} />
              Expira em <strong style={{ color: 'var(--color-warning)' }}>{countdownLabel(s.suspensoAte)}</strong>
              {' · '}{formatarDataHora(s.suspensoAte)}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            disabled={removendoId === s.id}
            onClick={() => onRemover(s.id)}
          >
            <FontAwesomeIcon icon={removendoId === s.id ? faSpinner : faTrash} spin={removendoId === s.id} />
          </Button>
        </div>
      ))}
    </div>
  );
}

/* ─── Formulário: nova suspensão ──────────────────────────────────────────── */

function FormNovaSuspensao({ equipamentos, onSalvar, salvando }) {
  const [equipamentoId, setEquipamentoId] = useState('');
  const [tipoEvento,    setTipoEvento]    = useState('');
  const [duracaoHoras,  setDuracaoHoras]  = useState(24);
  const [motivo,        setMotivo]        = useState('');
  const [custom,        setCustom]        = useState(false);
  const [horasCustom,   setHorasCustom]   = useState('');

  const horas = custom ? Number(horasCustom) : duracaoHoras;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!horas || horas <= 0) return;
    onSalvar({
      equipamentoId: equipamentoId || null,
      tipoEvento:    tipoEvento    || null,
      duracaoHoras:  horas,
      motivo:        motivo        || null,
    });
  };

  const inputStyle = {
    width: '100%',
    borderRadius: '0.75rem',
    border: '1px solid var(--border-soft)',
    backgroundColor: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    padding: '0.4rem 0.75rem',
    fontSize: '0.875rem',
    outline: 'none',
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border px-4 py-4" style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface-soft)' }}>
      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        <FontAwesomeIcon icon={faPlus} className="mr-2" style={{ color: 'var(--brand-primary)' }} />
        Nova suspensão temporária
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Equipamento</label>
          <select value={equipamentoId} onChange={e => setEquipamentoId(e.target.value)} style={inputStyle}>
            <option value="">Todos os equipamentos</option>
            {equipamentos.map(e => (
              <option key={e.equipamentoId} value={e.equipamentoId}>
                {e.equipamento}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Tipo de evento</label>
          <select value={tipoEvento} onChange={e => setTipoEvento(e.target.value)} style={inputStyle}>
            {EVENTOS.map(ev => (
              <option key={ev.value} value={ev.value}>{ev.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Duração</label>
          <div className="flex flex-wrap gap-1">
            {DURACOES.map(d => (
              <button
                key={d.horas}
                type="button"
                onClick={() => { setDuracaoHoras(d.horas); setCustom(false); }}
                style={{
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  border: '1px solid',
                  transition: 'all 0.15s',
                  backgroundColor: (!custom && duracaoHoras === d.horas) ? 'var(--brand-primary)' : 'var(--bg-surface)',
                  color:           (!custom && duracaoHoras === d.horas) ? '#fff' : 'var(--text-secondary)',
                  borderColor:     (!custom && duracaoHoras === d.horas) ? 'var(--brand-primary)' : 'var(--border-soft)',
                }}
              >
                {d.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCustom(true)}
              style={{
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: 500,
                cursor: 'pointer',
                border: '1px solid',
                transition: 'all 0.15s',
                backgroundColor: custom ? 'var(--brand-primary)' : 'var(--bg-surface)',
                color:           custom ? '#fff' : 'var(--text-secondary)',
                borderColor:     custom ? 'var(--brand-primary)' : 'var(--border-soft)',
              }}
            >
              Personalizado
            </button>
          </div>
          {custom && (
            <input
              type="number"
              min="1"
              max="8760"
              placeholder="Horas (ex: 72)"
              value={horasCustom}
              onChange={e => setHorasCustom(e.target.value)}
              style={{ ...inputStyle, marginTop: '0.5rem' }}
            />
          )}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Motivo (opcional)</label>
          <input
            type="text"
            maxLength={200}
            placeholder="Ex: manutenção programada"
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      <Button type="submit" variant="primary" size="sm" disabled={salvando || !horas || horas <= 0}>
        <FontAwesomeIcon icon={salvando ? faSpinner : faBan} spin={salvando} className="mr-2" />
        {salvando ? 'Salvando...' : 'Suspender alertas'}
      </Button>
    </form>
  );
}

/* ─── Página principal ────────────────────────────────────────────────────── */

function AlertasPage() {
  const { usuario } = useAuth();
  const isAdmin = useMemo(
    () => ['admin', 'superadmin'].includes(usuario?.role),
    [usuario?.role]
  );

  const [suspensoes,    setSuspensoes]    = useState(null);
  const [equipamentos,  setEquipamentos]  = useState([]);
  const [loadingSusp,   setLoadingSusp]   = useState(true);
  const [salvando,      setSalvando]      = useState(false);
  const [removendoId,   setRemovendoId]   = useState(null);
  const [feedback,      setFeedback]      = useState(null);

  const carregarDados = useCallback(async () => {
    setLoadingSusp(true);
    try {
      const [susp, status] = await Promise.all([
        getGehcSuspensoes(),
        getGehcStatus(),
      ]);
      setSuspensoes(susp);
      setEquipamentos(status?.ultimosSnapshots ?? []);
    } catch {
      setSuspensoes([]);
    } finally {
      setLoadingSusp(false);
    }
  }, []);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  const handleSalvar = useCallback(async (dados) => {
    setSalvando(true);
    setFeedback(null);
    try {
      await postGehcSuspensao(dados);
      setFeedback({ ok: true, msg: 'Suspensão criada. Os alertas deste equipamento/evento não serão gerados até o prazo.' });
      await carregarDados();
    } catch (err) {
      setFeedback({ ok: false, msg: err?.response?.data?.error ?? err.message });
    } finally {
      setSalvando(false);
    }
  }, [carregarDados]);

  const handleRemover = useCallback(async (id) => {
    setRemovendoId(id);
    try {
      await deleteGehcSuspensao(id);
      await carregarDados();
    } catch {
      // silencioso
    } finally {
      setRemovendoId(null);
    }
  }, [carregarDados]);

  return (
    <div className="space-y-6">

      <PageSection
        title="Limites de alerta"
        description={
          isAdmin
            ? 'Configuração dos thresholds que disparam alertas, por módulo. Os valores customizados aqui sobrescrevem os padrões do sistema apenas para este tenant. Alterações ficam registradas no Log de Auditoria.'
            : 'Thresholds atualmente configurados para gerar alertas. Apenas administradores podem editar.'
        }
      >
        <div className="space-y-4">
          {Object.keys(MODULE_CATALOG).map((moduleId) => (
            <ModuloAlertaCard
              key={moduleId}
              moduleId={moduleId}
              isAdmin={isAdmin}
              onAuditoria={() => { /* hook para refresh futuro */ }}
            />
          ))}
        </div>

        <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          <FontAwesomeIcon icon={faCircleCheck} className="mr-1" style={{ color: 'var(--color-success)' }} />
          Auto-resolução ativa — alertas são removidos automaticamente quando a leitura seguinte retorna à faixa segura.
        </p>
      </PageSection>

      <PageSection
        title="Suspender alertas"
        description="Pause alertas de um equipamento específico por um período determinado. Útil durante manutenções programadas para evitar notificações desnecessárias."
      >
        {feedback && (
          <div
            className="mb-4 flex items-start gap-3 rounded-2xl border px-4 py-3"
            style={{ borderColor: feedback.ok ? 'var(--color-success)' : 'var(--color-danger)', backgroundColor: 'var(--bg-surface-soft)' }}
          >
            <FontAwesomeIcon
              icon={feedback.ok ? faCircleCheck : faCircleXmark}
              className="mt-0.5 shrink-0"
              style={{ color: feedback.ok ? 'var(--color-success)' : 'var(--color-danger)' }}
            />
            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{feedback.msg}</p>
          </div>
        )}
        <FormNovaSuspensao
          equipamentos={equipamentos}
          onSalvar={handleSalvar}
          salvando={salvando}
        />
        <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          <FontAwesomeIcon icon={faBell} className="mr-1" />
          Selecionar <strong>Todos os equipamentos</strong> pausa alertas GE de todo o tenant.
          Selecionar <strong>Todos os eventos</strong> pausa qualquer tipo de alerta daquele equipamento.
        </p>
      </PageSection>

      <PageSection
        title="Suspensões ativas"
        description="Alertas pausados temporariamente. Ao expirar o prazo, os alertas voltam a ser gerados automaticamente."
      >
        {loadingSusp
          ? <LoadingState message="Carregando suspensões..." />
          : <ListaSuspensoes suspensoes={suspensoes} onRemover={handleRemover} removendoId={removendoId} />
        }
      </PageSection>

    </div>
  );
}

export default AlertasPage;
