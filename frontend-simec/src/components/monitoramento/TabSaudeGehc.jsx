import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHeartPulse, faCircleCheck, faCircleXmark, faTriangleExclamation,
  faArrowsRotate, faGear,
} from '@fortawesome/free-solid-svg-icons';

import { Card, Button, PageSection, InlineEmptyState, LoadingState } from '@/components/ui';
import SaudeRMsList from './SaudeRMsList';
import { getAlertas } from '@/services/api/alertasApi';
import { getGehcCronDiagnostico, postGehcCronReagendar } from '@/services/api/gehcApi';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatarDataHora } from '@/utils/timeUtils';

// Pequeno card KPI com icone + label + valor.
function KpiCard({ icon, label, value, cor = 'var(--text-primary)' }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: cor + '22', color: cor }}
        >
          <FontAwesomeIcon icon={icon} />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {label}
          </p>
          <p className="text-2xl font-bold" style={{ color: cor }}>
            {value}
          </p>
        </div>
      </div>
    </Card>
  );
}

// Lista de alertas abertos da categoria GEHC_SAUDE.
function AlertasGehcAbertos() {
  const [alertas, setAlertas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Backend filtra por `tipo` (string = ALERT_CATEGORIAS).
    getAlertas({ pageSize: 50, tipo: 'GEHC_SAUDE' })
      .then((res) => {
        if (cancelled) return;
        const lista = Array.isArray(res) ? res : (res?.data || res?.items || []);
        setAlertas(lista);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setCarregando(false); });
    return () => { cancelled = true; };
  }, []);

  if (carregando) return <LoadingState message="Carregando alertas..." />;

  if (!alertas.length) {
    return <InlineEmptyState message="Nenhum alerta aberto de saúde GE." />;
  }

  // Badge por prioridade
  const corPrioridade = (p) => {
    if (p === 'Alta') return 'var(--color-danger)';
    if (p === 'Media') return 'var(--color-warning)';
    return 'var(--text-muted)';
  };

  return (
    <div className="space-y-2">
      {alertas.map((a) => (
        <div
          key={a.id}
          className="flex flex-wrap items-start justify-between gap-2 rounded-lg border px-3 py-2"
          style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface-soft)' }}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                style={{
                  backgroundColor: corPrioridade(a.prioridade) + '22',
                  color: corPrioridade(a.prioridade),
                }}
              >
                {a.prioridade}
              </span>
              <p className="truncate text-sm font-semibold">{a.titulo}</p>
            </div>
            {a.subtitulo && (
              <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{a.subtitulo}</p>
            )}
          </div>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {formatarDataHora(a.data || a.createdAt)}
          </p>
        </div>
      ))}
    </div>
  );
}

// Card admin pra gerenciar o cron do monitor automatico (reusa o fluxo
// que ja existe em Gerenciamento > Integracoes, mas numa posicao mais
// acessivel pro operador que notar algo estranho).
function AcoesCronAdmin() {
  const { addToast } = useToast();
  const { usuario } = useAuth();
  const [diag, setDiag] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [reagendando, setReagendando] = useState(false);

  const isAdmin = usuario?.role === 'admin' || usuario?.role === 'superadmin';

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await getGehcCronDiagnostico();
      setDiag(r);
    } catch {
      setDiag(null);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const reagendar = async () => {
    setReagendando(true);
    try {
      const r = await postGehcCronReagendar();
      addToast(
        r?.ok
          ? `Monitor reagendado. ${r.recriados ?? 0} jobs recriados.`
          : `Reagendamento retornou sem sucesso.`,
        r?.ok ? 'success' : 'error'
      );
      await carregar();
    } catch (err) {
      addToast(err?.response?.data?.error || 'Erro ao reagendar.', 'error');
    } finally {
      setReagendando(false);
    }
  };

  if (!isAdmin) return null;

  const mins = diag?.minutosDesdeUltimoSnapshot;
  const corMins = mins == null ? 'var(--text-muted)'
    : mins > 180 ? 'var(--color-danger)'
    : mins > 90  ? 'var(--color-warning)'
    : 'var(--color-success)';

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Monitor automático GE
          </p>
          <p className="mt-1 text-sm">
            Última captura: <span className="font-semibold" style={{ color: corMins }}>
              {carregando ? '...' : mins != null ? `${mins} min atrás` : 'nunca'}
            </span>
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Jobs registrados: {diag?.jobsRegistrados?.length ?? 0}
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={reagendar}
          disabled={reagendando || carregando}
        >
          <FontAwesomeIcon icon={faArrowsRotate} className="mr-1" />
          {reagendando ? 'Reagendando...' : 'Reiniciar monitor automático'}
        </Button>
      </div>
    </Card>
  );
}

function TabSaudeGehc() {
  const [kpis, setKpis] = useState({ total: 0, online: 0, offline: 0 });

  return (
    <div className="space-y-5">
      {/* KPIs no topo */}
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard
          icon={faHeartPulse}
          label="Equipamentos monitorados"
          value={kpis.total}
          cor="var(--brand-primary)"
        />
        <KpiCard
          icon={faCircleCheck}
          label="Online"
          value={kpis.online}
          cor="var(--color-success)"
        />
        <KpiCard
          icon={faCircleXmark}
          label="Offline"
          value={kpis.offline}
          cor={kpis.offline > 0 ? 'var(--color-danger)' : 'var(--text-muted)'}
        />
      </div>

      {/* Acoes admin — reiniciar cron */}
      <AcoesCronAdmin />

      {/* Lista das RMs */}
      <PageSection
        title="Saúde das RMs GE"
        description="Última leitura de hélio, pressão, compressor e temperatura de cada equipamento."
        actions={
          <Link
            to="/gerenciamento/integracoes"
            className="inline-flex items-center gap-1 text-xs"
            style={{ color: 'var(--brand-primary)' }}
          >
            <FontAwesomeIcon icon={faGear} />
            Configuração
          </Link>
        }
      >
        <SaudeRMsList onLoad={setKpis} />
      </PageSection>

      {/* Alertas abertos */}
      <PageSection
        title="Alertas de saúde abertos"
        description="Alertas gerados automaticamente a partir da telemetria GE."
      >
        <AlertasGehcAbertos />
      </PageSection>
    </div>
  );
}

export default TabSaudeGehc;
