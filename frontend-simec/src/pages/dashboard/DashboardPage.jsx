import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRight,
  faBell,
  faChartPie,
  faFileContract,
  faHospital,
  faRotateRight,
  faScrewdriverWrench,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';

import { useDashboard } from '@/hooks/dashboard/useDashboard';
import {
  Button,
  InlineEmptyState,
  PageHeader,
  PageLayout,
  PageSection,
  PageState,
} from '@/components/ui';
import { AlertListItem } from '@/components/dashboard';
import BarChart from '@/components/charts/BarChart';
import DonutChart from '@/components/charts/DonutChart';

function DashboardMiniStat({ icon, label, value, helper, tone = 'default' }) {
  const toneMap = {
    default: {
      iconSurface: 'var(--brand-primary-soft)',
      iconText: 'var(--brand-primary)',
    },
    success: {
      iconSurface: 'var(--color-success-soft)',
      iconText: 'var(--color-success)',
    },
    warning: {
      iconSurface: 'var(--color-warning-soft)',
      iconText: 'var(--color-warning)',
    },
    danger: {
      iconSurface: 'var(--color-danger-soft)',
      iconText: 'var(--color-danger)',
    },
  };

  const resolvedTone = toneMap[tone] || toneMap.default;

  return (
    <div
      className="rounded-2xl border px-4 py-4"
      style={{
        backgroundColor: 'var(--bg-surface-soft)',
        borderColor: 'var(--border-soft)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: resolvedTone.iconSurface,
            color: resolvedTone.iconText,
          }}
        >
          <FontAwesomeIcon icon={icon} />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {label}
          </p>
          <p
            className="mt-2 text-2xl font-bold leading-none"
            style={{ color: 'var(--text-primary)' }}
          >
            {value}
          </p>
          <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-muted)' }}>
            {helper}
          </p>
        </div>
      </div>
    </div>
  );
}

function DashboardStatusList({ items = [] }) {
  if (!items.length) {
    return <InlineEmptyState message="Sem consolidacao de status disponivel." />;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.name}
          className="flex items-center justify-between gap-4 rounded-2xl border px-4 py-3"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-soft)',
          }}
        >
          <div className="min-w-0">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {item.name}
            </p>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              {item.value === 1 ? '1 equipamento' : `${item.value} equipamentos`}
            </p>
          </div>
          <span
            className="text-2xl font-bold leading-none"
            style={{ color: 'var(--text-primary)' }}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

const GRAVIDADE_TONE = { alta: 'danger', media: 'warning', baixa: 'default' };
const GRAVIDADE_LABEL = { alta: 'Alta', media: 'Media', baixa: 'Baixa' };
const GRAVIDADE_ORDEM = { alta: 0, media: 1, baixa: 2 };
const MAX_OCORRENCIAS_VISIVEIS = 5;

function ordenarOcorrencias(lista) {
  return [...lista].sort(
    (a, b) =>
      (GRAVIDADE_ORDEM[a.gravidade] ?? 3) - (GRAVIDADE_ORDEM[b.gravidade] ?? 3)
  );
}

function OcorrenciaPendenteItem({ ocorrencia }) {
  const tone = GRAVIDADE_TONE[ocorrencia.gravidade] || 'default';

  const toneColors = {
    danger: { bg: 'var(--color-danger-soft)', text: 'var(--color-danger)' },
    warning: { bg: 'var(--color-warning-soft)', text: 'var(--color-warning)' },
    default: { bg: 'var(--bg-surface-soft)', text: 'var(--text-muted)' },
  };

  const colors = toneColors[tone];

  return (
    <Link
      to={`/equipamentos/ficha-tecnica/${ocorrencia.equipamento?.id}`}
      className="flex items-start gap-3 rounded-2xl border px-4 py-3 transition hover:opacity-80"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-soft)',
      }}
    >
      <div
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs"
        style={{ backgroundColor: colors.bg, color: colors.text }}
      >
        <FontAwesomeIcon icon={faTriangleExclamation} />
      </div>

      <div className="min-w-0 flex-1">
        <p
          className="truncate text-sm font-medium"
          style={{ color: 'var(--text-primary)' }}
        >
          {ocorrencia.titulo}
        </p>
        <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--text-muted)' }}>
          {ocorrencia.equipamento?.modelo} · {ocorrencia.equipamento?.tag}
        </p>
      </div>

      <span
        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
        style={{ backgroundColor: colors.bg, color: colors.text }}
      >
        {GRAVIDADE_LABEL[ocorrencia.gravidade] || ocorrencia.gravidade}
      </span>
    </Link>
  );
}

function DashboardActionQueue({ resumo }) {
  const items = [
    {
      icon: faBell,
      label: 'Alertas ativos',
      value: resumo.alertasAtivos,
      helper:
        resumo.alertasCriticos > 0
          ? `${resumo.alertasCriticos} em prioridade alta`
          : 'Nenhum alerta critico no momento',
      tone: resumo.alertasCriticos > 0 ? 'danger' : 'default',
    },
    {
      icon: faScrewdriverWrench,
      label: 'OS em andamento',
      value: resumo.emManutencao,
      helper: 'Ordens abertas que pressionam a disponibilidade do parque.',
      tone: resumo.emManutencao > 0 ? 'warning' : 'default',
    },
    {
      icon: faFileContract,
      label: 'Cobertura em atencao',
      value: resumo.contratosVencendo,
      helper: 'Contratos que pedem acompanhamento de vigencia.',
      tone: resumo.contratosVencendo > 0 ? 'warning' : 'default',
    },
    {
      icon: faHospital,
      label: 'Ativos restritos',
      value: resumo.inativos,
      helper: 'Equipamentos fora de operacao ou em uso limitado.',
      tone: resumo.inativos > 0 ? 'danger' : 'success',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <DashboardMiniStat key={item.label} {...item} />
      ))}
    </div>
  );
}

function DashboardPage() {
  const { data, loading, error, recarregar } = useDashboard();
  const navigate = useNavigate();

  const resumo = useMemo(() => {
    const totalEquipamentos = Number(data.totalEquipamentos || 0);
    const ativos = Number(data.ativos || 0);
    const inativos = Number(data.inativos || 0);
    const emManutencao = Number(data.emManutencao || 0);
    const contratosVencendo = Number(data.contratosVencendo || 0);
    const alertasAtivos = Number(data.alertasAtivos || 0);
    const manutencoesPeriodo = (data.manutencoesPorTipo || []).reduce(
      (total, item) => total + Number(item?.value || 0),
      0
    );
    const alertasCriticos = (data.alertas || []).filter(
      (item) => item?.prioridade === 'Alta'
    ).length;
    const disponibilidade =
      totalEquipamentos > 0
        ? Math.round((ativos / totalEquipamentos) * 100)
        : 0;
    const principalStatus = [...(data.statusEquipamentos || [])]
      .sort((a, b) => Number(b?.value || 0) - Number(a?.value || 0))
      .slice(0, 4);
    const manutencaoMedia =
      data.manutencoesPorTipo?.length > 0
        ? Math.round(manutencoesPeriodo / data.manutencoesPorTipo.length)
        : 0;

    return {
      totalEquipamentos,
      ativos,
      inativos,
      emManutencao,
      contratosVencendo,
      alertasAtivos,
      manutencoesPeriodo,
      manutencaoMedia,
      alertasCriticos,
      disponibilidade,
      principalStatus,
    };
  }, [data]);

  const isEmpty =
    !loading &&
    !error &&
    resumo.totalEquipamentos === 0 &&
    resumo.emManutencao === 0 &&
    resumo.contratosVencendo === 0 &&
    resumo.alertasAtivos === 0 &&
    (data.alertas || []).length === 0 &&
    (data.statusEquipamentos || []).length === 0 &&
    (data.manutencoesPorTipo || []).length === 0;

  if (loading || error || isEmpty) {
    return (
      <PageLayout padded fullHeight>
        <div className="space-y-6">
          <PageHeader
            title="Dashboard"
            subtitle="Resumo operacional do parque, manutencoes e alertas."
            icon={faChartPie}
            actions={
              <Button type="button" variant="secondary" onClick={recarregar}>
                <FontAwesomeIcon icon={faRotateRight} />
                Atualizar
              </Button>
            }
          />

          <PageState
            loading={loading}
            error={error}
            isEmpty={isEmpty}
            emptyMessage="Nenhum dado disponivel para o dashboard."
          />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout padded fullHeight>
      <div className="space-y-6 lg:space-y-8">
        <PageHeader
          title="Dashboard"
          subtitle="Leitura rapida do que exige atencao operacional agora."
          icon={faChartPie}
          actions={
            <Button type="button" variant="secondary" onClick={recarregar}>
              <FontAwesomeIcon icon={faRotateRight} />
              Atualizar
            </Button>
          }
        />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <PageSection
            title="Ocorrencias pendentes"
            description="Registros abertos que ainda nao receberam resolucao e precisam de atencao."
            headerRight={
              data.ocorrenciasPendentes.length > 0 ? (
                <span
                  className="rounded-full px-2.5 py-1 text-xs font-bold"
                  style={{
                    backgroundColor: 'var(--color-danger-soft)',
                    color: 'var(--color-danger)',
                  }}
                >
                  {data.ocorrenciasPendentes.length} abertas
                </span>
              ) : null
            }
          >
            {data.ocorrenciasPendentes.length > 0 ? (() => {
              const ordenadas = ordenarOcorrencias(data.ocorrenciasPendentes);
              const visiveis = ordenadas.slice(0, MAX_OCORRENCIAS_VISIVEIS);
              const restantes = ordenadas.length - visiveis.length;

              return (
                <div className="space-y-2">
                  {visiveis.map((oc) => (
                    <OcorrenciaPendenteItem key={oc.id} ocorrencia={oc} />
                  ))}
                  {restantes > 0 ? (
                    <p
                      className="pt-1 text-center text-xs"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      e mais{' '}
                      <strong style={{ color: 'var(--color-danger)' }}>
                        {restantes}
                      </strong>{' '}
                      ocorrencia(s) pendente(s) — acesse cada equipamento para ver.
                    </p>
                  ) : null}
                </div>
              );
            })() : (
              <InlineEmptyState message="Nenhuma ocorrencia pendente. Parque sem registros em aberto." />
            )}
          </PageSection>

          <PageSection
            title="Alertas recentes"
            description="Acompanhamento rapido dos avisos mais recentes do sistema."
            headerRight={
              <Link
                to="/alertas"
                className="inline-flex items-center gap-2 text-sm font-medium transition hover:opacity-80"
                style={{ color: 'var(--brand-primary)' }}
              >
                Ver todos
                <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
              </Link>
            }
          >
            {(data.alertas || []).length > 0 ? (
              <div className="space-y-3">
                {data.alertas.slice(0, 8).map((alerta) => (
                  <AlertListItem key={alerta.id} alerta={alerta} />
                ))}
              </div>
            ) : (
              <InlineEmptyState message="Nenhum alerta recente para acompanhamento." />
            )}
          </PageSection>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <PageSection
            title="Fila de atencao"
            description="Itens que ajudam a priorizar a operacao sem repetir o mesmo indicador em varios cards."
          >
            <DashboardActionQueue resumo={resumo} />
          </PageSection>

          <PageSection
            title="Leitura do parque"
            description="Distribuicao atual por status operacional e peso relativo no momento."
          >
            <div
              className="flex min-h-[320px] items-center justify-center rounded-3xl border p-5 sm:min-h-[360px] sm:p-6"
              style={{
                borderColor: 'var(--border-soft)',
                backgroundColor: 'var(--bg-surface-soft)',
              }}
            >
              <div className="h-[260px] w-full max-w-[340px] sm:h-[300px] sm:max-w-[380px]">
                <DonutChart
                  data={data.statusEquipamentos}
                  onClickSegment={(label) =>
                    navigate('/equipamentos', { state: { filtroStatus: label } })
                  }
                />
              </div>
            </div>
          </PageSection>
        </div>

        <PageSection
          title="Historico de manutencoes"
          description="Volume consolidado por periodo para leitura de tendencia e pressao operacional."
        >
          <div
            className="rounded-3xl border p-3 sm:p-4"
            style={{
              borderColor: 'var(--border-soft)',
              backgroundColor: 'var(--bg-surface-soft)',
            }}
          >
            <div className="h-[260px] sm:h-[300px]">
              <BarChart
                data={data.manutencoesPorTipo}
                datasetLabel="Ordens"
                emptyMessage="Sem manutencoes consolidadas para o periodo."
              />
            </div>
          </div>
        </PageSection>

      </div>
    </PageLayout>
  );
}

export default DashboardPage;
