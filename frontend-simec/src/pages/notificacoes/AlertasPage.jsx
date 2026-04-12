import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBell,
  faCheck,
  faEye,
  faEyeSlash,
  faBellSlash,
  faClock,
  faExclamationTriangle,
  faInfoCircle,
  faTriangleExclamation,
  faCircleCheck,
  faList,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

import { useAlertasPage } from '../hooks/alertas/useAlertasPage';

import GlobalFilterBar from '../components/ui/GlobalFilterBar';
import PageLayout from '../components/ui/PageLayout';
import PageHeader from '../components/ui/PageHeader';
import PageState from '../components/ui/PageState';
import Card from '../components/ui/Card';

function KpiCard({ icon, title, value, tone = 'slate', onClick }) {
  const toneMap = {
    slate: 'bg-slate-100 text-slate-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-emerald-100 text-emerald-600',
    yellow: 'bg-amber-100 text-amber-600',
    red: 'bg-red-100 text-red-600',
  };

  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={[
        'w-full text-left',
        onClick ? 'transition hover:-translate-y-0.5 hover:shadow-md' : '',
      ].join(' ')}
    >
      <Card className="h-full">
        <div className="flex items-center gap-4">
          <div
            className={[
              'inline-flex h-12 w-12 items-center justify-center rounded-2xl',
              toneMap[tone] || toneMap.slate,
            ].join(' ')}
          >
            <FontAwesomeIcon icon={icon} />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {title}
            </p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              {value}
            </p>
          </div>
        </div>
      </Card>
    </Wrapper>
  );
}

function ActiveFiltersBar({ filters = [], onRemove, onClearAll }) {
  if (!filters.length) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      {filters.map((filter) => (
        <button
          key={`${filter.key}-${filter.value}`}
          type="button"
          onClick={() => onRemove(filter.key)}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <span>{filter.label}</span>
          <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
        </button>
      ))}

      <button
        type="button"
        onClick={onClearAll}
        className="ml-1 inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold text-blue-600 hover:underline"
      >
        Limpar tudo
      </button>
    </div>
  );
}

function AlertaItem({ alerta, onUpdateStatus, onDismiss }) {
  const prioridadeMap = {
    Alta: {
      border: 'border-red-500',
      bg: 'bg-red-50',
      text: 'text-red-700',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      badge: 'bg-red-100 text-red-700',
    },
    Media: {
      border: 'border-amber-500',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      badge: 'bg-amber-100 text-amber-700',
    },
    Baixa: {
      border: 'border-blue-500',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      badge: 'bg-blue-100 text-blue-700',
    },
  };

  const style = prioridadeMap[alerta.prioridade] || {
    border: 'border-slate-300',
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-500',
    badge: 'bg-slate-100 text-slate-700',
  };

  const dataFormatada = alerta.data
    ? new Date(alerta.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
    : '-';

  const handleViewDetails = () => {
    if (alerta.status === 'NaoVisto') {
      onUpdateStatus(alerta.id, 'Visto');
    }
  };

  return (
    <div
      className={[
        'overflow-hidden rounded-xl border-y border-r border-slate-200 border-l-[8px] bg-white shadow-sm transition-all hover:shadow-md',
        style.border,
        alerta.status === 'Visto' ? 'opacity-70' : '',
      ].join(' ')}
    >
      <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div
            className={[
              'mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
              style.iconBg,
              style.iconColor,
            ].join(' ')}
          >
            <FontAwesomeIcon
              icon={alerta.prioridade === 'Alta' ? faExclamationTriangle : faInfoCircle}
            />
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="text-base font-bold leading-tight text-slate-800">
              {alerta.titulo}
            </h4>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
              {alerta.subtitulo ? (
                <span className="font-medium">{alerta.subtitulo}</span>
              ) : null}

              <span className="flex items-center gap-1 text-xs">
                <FontAwesomeIcon icon={faClock} />
                {dataFormatada}
              </span>

              {alerta.tipo ? (
                <span
                  className={`rounded-md px-2 py-1 text-[10px] font-black uppercase ${style.badge}`}
                >
                  {alerta.tipo}
                </span>
              ) : null}

              {alerta.prioridade ? (
                <span
                  className={`rounded-md px-2 py-1 text-[10px] font-black uppercase ${style.badge}`}
                >
                  {alerta.prioridade}
                </span>
              ) : null}

              <span
                className={[
                  'rounded-md px-2 py-1 text-[10px] font-black uppercase',
                  alerta.status === 'NaoVisto'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600',
                ].join(' ')}
              >
                {alerta.status === 'NaoVisto' ? 'Não visto' : 'Visto'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 md:border-l md:border-slate-100 md:pl-5">
          <Link
            to={alerta.link || '#'}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-600 no-underline transition-all hover:bg-blue-600 hover:text-white"
            onClick={handleViewDetails}
          >
            <FontAwesomeIcon icon={faEye} />
            Detalhes
          </Link>

          {alerta.status === 'Visto' ? (
            <button
              type="button"
              onClick={() => onUpdateStatus(alerta.id, 'NaoVisto')}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-amber-100 hover:text-amber-600"
              title="Marcar como não visto"
            >
              <FontAwesomeIcon icon={faEyeSlash} />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onUpdateStatus(alerta.id, 'Visto')}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-green-600 transition-colors hover:bg-green-600 hover:text-white"
                title="Marcar como visto"
              >
                <FontAwesomeIcon icon={faCheck} />
              </button>

              <button
                type="button"
                onClick={() => onDismiss(alerta.id)}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                title="Dispensar alerta"
              >
                <FontAwesomeIcon icon={faBellSlash} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AlertasPage() {
  const page = useAlertasPage();

  const isInitialLoading = page.loading && page.alertas.length === 0;
  const hasError = Boolean(page.error);
  const isEmpty = !page.loading && page.alertasFiltrados.length === 0;

  return (
    <PageLayout background="slate" padded fullHeight>
      <PageHeader
        title="Alertas do Sistema"
        subtitle="Acompanhe, filtre e trate as notificações operacionais"
        icon={faBell}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          icon={faList}
          title="Total"
          value={page.metricas.total}
          tone="slate"
          onClick={page.clearAllFilters}
        />

        <KpiCard
          icon={faBell}
          title="Não vistos"
          value={page.metricas.naoVistos}
          tone="blue"
          onClick={() => {
            page.clearAllFilters();
            page.selectFiltersConfig.find((f) => f.id === 'status')?.onChange('NaoVisto');
          }}
        />

        <KpiCard
          icon={faCircleCheck}
          title="Vistos"
          value={page.metricas.vistos}
          tone="green"
          onClick={() => {
            page.clearAllFilters();
            page.selectFiltersConfig.find((f) => f.id === 'status')?.onChange('Visto');
          }}
        />

        <KpiCard
          icon={faTriangleExclamation}
          title="Críticos"
          value={page.metricas.criticos}
          tone="red"
          onClick={() => {
            page.clearAllFilters();
            page.selectFiltersConfig
              .find((f) => f.id === 'prioridade')
              ?.onChange('Alta');
          }}
        />
      </div>

      <div className="mb-6">
        <GlobalFilterBar
          searchTerm={page.searchTerm}
          onSearchChange={page.onSearchChange}
          searchPlaceholder="Filtrar por título, subtítulo ou tipo..."
          selectFilters={page.selectFiltersConfig}
        />
      </div>

      <ActiveFiltersBar
        filters={page.activeFilters}
        onRemove={page.clearFilter}
        onClearAll={page.clearAllFilters}
      />

      {isInitialLoading ? (
        <PageState loading />
      ) : hasError ? (
        <PageState error="Erro ao carregar alertas." />
      ) : isEmpty ? (
        <PageState
          isEmpty
          emptyMessage="Nenhum alerta encontrado para os critérios selecionados."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {page.alertasFiltrados.map((alerta) => (
            <AlertaItem
              key={alerta.id}
              alerta={alerta}
              onUpdateStatus={page.updateStatus}
              onDismiss={page.dismissAlerta}
            />
          ))}
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-blue-800">
          <FontAwesomeIcon icon={faInfoCircle} />
          Instruções de gerenciamento
        </h4>

        <ul className="space-y-2 text-sm text-blue-700/90">
          <li>
            <strong>Filtro inicial:</strong> por padrão, exibimos os alertas não vistos.
          </li>
          <li>
            <strong>Dispensar:</strong> remove o alerta da sua lista atual e marca
            como tratado no sistema.
          </li>
          <li>
            <strong>Status "Visto":</strong> use o filtro de status para consultar
            alertas históricos ou já tratados.
          </li>
        </ul>
      </div>
    </PageLayout>
  );
}

export default AlertasPage;