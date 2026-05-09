import React, { useCallback, useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBan,
  faBell,
  faCircleCheck,
  faCircleXmark,
  faClock,
  faDroplet,
  faFan,
  faFireFlameCurved,
  faGaugeHigh,
  faMagnet,
  faPlus,
  faSpinner,
  faThermometerHalf,
  faTrash,
  faWind,
} from '@fortawesome/free-solid-svg-icons';

import {
  Button,
  InlineEmptyState,
  LoadingState,
  PageSection,
} from '@/components/ui';
import { formatarDataHora } from '@/utils/timeUtils';
import {
  getGehcStatus,
  getGehcSuspensoes,
  postGehcSuspensao,
  deleteGehcSuspensao,
} from '@/services/api/gehcApi';

// ─── Thresholds (espelha o backend) ──────────────────────────────────────────

const THRESHOLDS_INFO = [
  {
    icon: faDroplet,
    cor: '#3b82f6',
    metrica: 'Nível de hélio',
    aviso: '< 70%',
    critico: '< 30%',
    descricao: 'Quench (perda repentina de supercondutividade) ocorre abaixo de ~20%.',
  },
  {
    icon: faThermometerHalf,
    cor: '#f59e0b',
    metrica: 'Temperatura do resfriador',
    aviso: '> 18 °C',
    critico: '> 25 °C',
    descricao: 'Temperatura elevada indica problema no sistema de resfriamento.',
  },
  {
    icon: faGaugeHigh,
    cor: '#8b5cf6',
    metrica: 'Pressão do hélio',
    aviso: '> 1.5 PSI',
    critico: '< 0.8 ou > 2.0 PSI',
    descricao: 'Faixa operacional segura: 0.8 – 1.5 PSI.',
  },
  {
    icon: faWind,
    cor: '#06b6d4',
    metrica: 'Fluxo do resfriador',
    aviso: '< 1.5 GPM',
    critico: '—',
    descricao: 'Fluxo mínimo para refrigeração adequada do sistema.',
  },
  {
    icon: faFan,
    cor: '#10b981',
    metrica: 'Compressor',
    aviso: '—',
    critico: 'Status ≠ ON',
    descricao: 'Compressor desligado requer verificação imediata.',
  },
  {
    icon: faMagnet,
    cor: '#ef4444',
    metrica: 'Magneto',
    aviso: '—',
    critico: 'Offline',
    descricao: 'Perda de conexão com GE InSite pode indicar falha de rede ou do equipamento.',
  },
];

const EVENTOS = [
  { value: '',                    label: 'Todos os eventos' },
  { value: 'GEHC_HELIO_BAIXO',   label: 'Hélio baixo (< 70%)' },
  { value: 'GEHC_HELIO_CRITICO', label: 'Hélio crítico (< 30%)' },
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Seção: thresholds ────────────────────────────────────────────────────────

function TabelaThresholds() {
  return (
    <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--border-soft)' }}>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border-soft)', backgroundColor: 'var(--bg-surface-soft)' }}>
            {['Métrica', 'Aviso (média)', 'Crítico (alta)', 'Contexto'].map(h => (
              <th key={h} className="px-4 py-2 text-left text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {THRESHOLDS_INFO.map((t, i) => (
            <tr key={t.metrica} style={{ borderBottom: '1px solid var(--border-soft)', backgroundColor: i % 2 === 0 ? 'var(--bg-surface-soft)' : 'transparent' }}>
              <td className="px-4 py-2 font-medium text-xs whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                <FontAwesomeIcon icon={t.icon} className="mr-2" style={{ color: t.cor }} />
                {t.metrica}
              </td>
              <td className="px-4 py-2 text-xs" style={{ color: 'var(--color-warning)' }}>{t.aviso}</td>
              <td className="px-4 py-2 text-xs font-semibold" style={{ color: 'var(--color-danger)' }}>{t.critico}</td>
              <td className="px-4 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>{t.descricao}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Seção: suspensões ────────────────────────────────────────────────────────

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

// ─── Formulário: nova suspensão ───────────────────────────────────────────────

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

// ─── Página principal ─────────────────────────────────────────────────────────

function AlertasGePage() {
  const [suspensoes,    setSuspensoes]    = useState(null);
  const [equipamentos,  setEquipamentos]  = useState([]);
  const [loadingSusp,   setLoadingSusp]   = useState(true);
  const [salvando,      setSalvando]      = useState(false);
  const [removendoId,   setRemovendoId]   = useState(null);
  const [feedback,      setFeedback]      = useState(null); // { ok, msg }

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
      // silencioso — lista será atualizada ou não
    } finally {
      setRemovendoId(null);
    }
  }, [carregarDados]);

  return (
    <div className="space-y-6">

      {/* ── Thresholds ── */}
      <PageSection
        title="Limites de alerta"
        description="Thresholds atualmente configurados para gerar alertas de saúde GEHC. Os alertas se auto-resolvem quando as métricas voltam ao normal."
      >
        <TabelaThresholds />
        <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          <FontAwesomeIcon icon={faCircleCheck} className="mr-1" style={{ color: 'var(--color-success)' }} />
          Auto-resolução ativa — alertas são removidos automaticamente quando a leitura seguinte retorna à faixa segura.
        </p>
      </PageSection>

      {/* ── Suspensões ativas ── */}
      <PageSection
        title="Suspensões ativas"
        description="Alertas pausados temporariamente. Ao expirar o prazo, os alertas voltam a ser gerados automaticamente."
      >
        {loadingSusp
          ? <LoadingState message="Carregando suspensões..." />
          : <ListaSuspensoes suspensoes={suspensoes} onRemover={handleRemover} removendoId={removendoId} />
        }
      </PageSection>

      {/* ── Nova suspensão ── */}
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
          Selecionar <strong>Todos os equipamentos</strong> pausa alertas GEHC de todo o tenant.
          Selecionar <strong>Todos os eventos</strong> pausa qualquer tipo de alerta daquele equipamento.
        </p>
      </PageSection>

    </div>
  );
}

export default AlertasGePage;
