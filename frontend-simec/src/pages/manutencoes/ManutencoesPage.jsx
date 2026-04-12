import React from 'react';
import { Link } from 'react-router-dom';
import { formatarData } from '../../utils/timeUtils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEye,
  faTrashAlt,
  faClock,
  faHospital,
  faHashtag,
  faPlus,
  faWrench,
  faCircleCheck,
  faTriangleExclamation,
  faCircleXmark,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

import { useAuth } from '../../contexts/AuthContext';
import { useManutencoesPage } from '../../hooks/manutencoes/useManutencoesPage';

import Button from '../../components/ui/Button';
import GlobalFilterBar from '../../components/ui/GlobalFilterBar';
import ModalConfirmacao from '../../components/ui/ModalConfirmacao';

import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import PageState from '../../components/ui/PageState';
import Card from '../../components/ui/Card';

const getStatusStyles = (status) => {
  const s = status?.toLowerCase() || '';
  if (s === 'agendada') return 'bg-blue-100 text-blue-800 border-blue-200';
  if (s === 'emandamento') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  if (s === 'aguardandoconfirmacao') {
    return 'bg-orange-100 text-orange-800 border-orange-200 animate-pulse';
  }
  if (s === 'concluida') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (s === 'cancelada') return 'bg-red-100 text-red-800 border-red-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

const getTipoStyles = (tipo) => {
  const t = tipo?.toLowerCase() || '';
  if (t === 'corretiva') return 'bg-rose-100 text-rose-700 border-rose-300';
  if (t === 'preventiva') return 'bg-emerald-100 text-emerald-700 border-emerald-300';
  if (t === 'calibracao') return 'bg-indigo-100 text-indigo-700 border-indigo-300';
  if (t === 'inspecao') return 'bg-sky-100 text-sky-700 border-sky-300';
  return 'bg-slate-100 text-slate-600 border-slate-300';
};

const getRowBorder = (status) => {
  const s = status?.toLowerCase() || '';
  if (s === 'agendada') return 'border-l-blue-500';
  if (s === 'emandamento') return 'border-l-yellow-500';
  if (s === 'aguardandoconfirmacao') return 'border-l-orange-500';
  if (s === 'concluida') return 'border-l-emerald-500';
  if (s === 'cancelada') return 'border-l-red-500';
  return 'border-l-slate-300';
};

const formatarIntervaloHorario = (dataInicioISO, dataFimISO) => {
  if (!dataInicioISO) return '-';

  try {
    const options = { hour: '2-digit', minute: '2-digit' };
    const inicio = new Date(dataInicioISO).toLocaleTimeString('pt-BR', options);

    if (!dataFimISO) return inicio;

    const fim = new Date(dataFimISO).toLocaleTimeString('pt-BR', options);
    return `${inicio} - ${fim}`;
  } catch {
    return 'Inválido';
  }
};

function KpiCard({ icon, title, value, tone = 'slate', onClick }) {
  const toneMap = {
    slate: 'bg-slate-100 text-slate-600',
    blue: 'bg-blue-100 text-blue-600',
    yellow: 'bg-amber-100 text-amber-600',
    green: 'bg-emerald-100 text-emerald-600',
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

function ManutencoesPage() {
  const { user } = useAuth();
  const page = useManutencoesPage();

  const isInitialLoading = page.loading && page.manutencoes.length === 0;
  const hasError = !!page.error;
  const isEmpty = !page.loading && !page.error && page.manutencoes.length === 0;

  return (
    <>
      <ModalConfirmacao
        isOpen={page.deleteModal.isOpen}
        onClose={page.deleteModal.closeModal}
        onConfirm={page.handleConfirmDelete}
        title="Excluir OS"
        message={`Deseja apagar a OS nº ${page.deleteModal.modalData?.numeroOS}?`}
        isDestructive
      />

      <PageLayout className="pb-20" background="slate" padded fullHeight>
        <PageHeader
          title="Gerenciamento de Manutenções"
          subtitle="Acompanhe, filtre e gerencie as ordens de serviço"
          icon={faWrench}
          actions={
            <Button onClick={page.goToCreate}>
              <FontAwesomeIcon icon={faPlus} />
              Agendar nova
            </Button>
          }
        />

        {/* KPIs */}
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
          <KpiCard
            icon={faWrench}
            title="Total"
            value={page.metricas?.total ?? 0}
            tone="slate"
            onClick={page.clearAllFilters}
          />

          <KpiCard
            icon={faClock}
            title="Em andamento"
            value={page.metricas?.emAndamento ?? 0}
            tone="yellow"
            onClick={() => {
              page.clearAllFilters();
              page.selectFiltersConfig
                ?.find((f) => f.id === 'status')
                ?.onChange('EmAndamento');
            }}
          />

          <KpiCard
            icon={faTriangleExclamation}
            title="Aguardando"
            value={page.metricas?.aguardando ?? 0}
            tone="blue"
            onClick={() => {
              page.clearAllFilters();
              page.selectFiltersConfig
                ?.find((f) => f.id === 'status')
                ?.onChange('AguardandoConfirmacao');
            }}
          />

          <KpiCard
            icon={faCircleCheck}
            title="Concluídas"
            value={page.metricas?.concluidas ?? 0}
            tone="green"
            onClick={() => {
              page.clearAllFilters();
              page.selectFiltersConfig
                ?.find((f) => f.id === 'status')
                ?.onChange('Concluida');
            }}
          />

          <KpiCard
            icon={faCircleXmark}
            title="Canceladas"
            value={page.metricas?.canceladas ?? 0}
            tone="red"
            onClick={() => {
              page.clearAllFilters();
              page.selectFiltersConfig
                ?.find((f) => f.id === 'status')
                ?.onChange('Cancelada');
            }}
          />
        </div>

        {/* Filtros */}
        <div className="mb-6">
          <GlobalFilterBar
            searchTerm={page.searchTerm}
            onSearchChange={page.onSearchChange}
            searchPlaceholder="Buscar por OS ou descrição..."
            selectFilters={page.selectFiltersConfig}
          />
        </div>

        {/* Chips de filtros */}
        <ActiveFiltersBar
          filters={page.activeFilters || []}
          onRemove={page.clearFilter}
          onClearAll={page.clearAllFilters}
        />

        {isInitialLoading || hasError || isEmpty ? (
          <PageState
            loading={isInitialLoading}
            error={page.error?.message || page.error || ''}
            isEmpty={isEmpty}
            emptyMessage="Nenhuma manutenção encontrada."
          />
        ) : (
          <div className="flex flex-col gap-3 px-1">
            {page.manutencoes.map((m) => (
              <div
                key={m.id}
                className={`overflow-hidden rounded-xl border-y border-r border-slate-200 border-l-[8px] bg-white shadow-sm transition-all hover:shadow-md ${getRowBorder(m.status)}`}
              >
                <div className="flex items-center justify-between p-4">
                  <div className="flex flex-1 items-center gap-6">
                    <div className="grid flex-1 grid-cols-2 items-start gap-6 md:grid-cols-6">
                      <div className="flex min-w-0 flex-col">
                        <span className="mb-1 text-[10px] font-black uppercase tracking-tighter text-slate-600">
                          OS / Status
                        </span>
                        <span className="text-sm font-black leading-none text-slate-900">
                          {m.numeroOS}
                        </span>
                        <span
                          className={`mt-2 w-fit rounded border px-1.5 py-0.5 text-[9px] font-black uppercase ${getStatusStyles(m.status)}`}
                        >
                          {m.status.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      </div>

                      <div className="flex min-w-0 flex-col">
                        <span className="mb-1 text-[10px] font-black uppercase tracking-tighter text-slate-600">
                          Equipamento
                        </span>
                        <span className="truncate text-sm font-black leading-tight text-slate-900">
                          {m.equipamento?.modelo}
                        </span>
                        <span className="mt-1 text-[10px] font-medium text-slate-500">
                          Nº de Série:{' '}
                          <span className="font-bold text-slate-600">
                            {m.equipamento?.tag}
                          </span>
                        </span>
                      </div>

                      <div className="flex min-w-0 flex-col">
                        <span className="mb-1 text-[10px] font-black uppercase tracking-tighter text-slate-600">
                          Nº Chamado
                        </span>
                        <span className="mt-0.5 text-sm font-black text-slate-900">
                          {m.numeroChamado ? (
                            <>
                              <FontAwesomeIcon
                                icon={faHashtag}
                                className="mr-1 text-slate-400"
                              />
                              {m.numeroChamado}
                            </>
                          ) : (
                            '---'
                          )}
                        </span>
                      </div>

                      <div className="hidden min-w-0 flex-col md:flex">
                        <span className="mb-1 text-[10px] font-black uppercase tracking-tighter text-slate-600">
                          Agendamento
                        </span>
                        <span className="flex items-center gap-1 text-xs font-black text-slate-900">
                          <FontAwesomeIcon
                            icon={faClock}
                            className="text-[9px] text-slate-400"
                          />
                          {formatarData(m.dataHoraAgendamentoInicio)}
                        </span>
                        <span className="mt-0.5 text-[10px] font-medium text-slate-500">
                          {formatarIntervaloHorario(
                            m.dataHoraAgendamentoInicio,
                            m.dataHoraAgendamentoFim
                          )}
                        </span>
                      </div>

                      <div className="hidden min-w-0 flex-col md:flex">
                        <span className="mb-1 text-[10px] font-black uppercase tracking-tighter text-slate-600">
                          Unidade
                        </span>
                        <span className="mt-0.5 truncate text-xs font-bold text-slate-700">
                          <FontAwesomeIcon
                            icon={faHospital}
                            className="mr-1 text-[9px] text-slate-400"
                          />
                          {m.equipamento?.unidade?.nomeSistema ||
                            m.equipamento?.unidade?.nome ||
                            '---'}
                        </span>
                      </div>

                      <div className="flex min-w-0 flex-col">
                        <span className="mb-1 text-[10px] font-black uppercase tracking-tighter text-slate-600">
                          Tipo
                        </span>
                        <span
                          className={`mt-0.5 w-fit rounded-full border px-2.5 py-1 text-[9px] font-black uppercase shadow-sm ${getTipoStyles(m.tipo)}`}
                        >
                          {m.tipo}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="ml-4 flex shrink-0 items-center gap-2">
                    <Link
                      to={`/manutencoes/detalhes/${m.id}`}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-600 shadow-sm transition-all hover:bg-blue-600 hover:text-white"
                      title="Ver Detalhes"
                    >
                      <FontAwesomeIcon icon={faEye} />
                    </Link>

                    {user?.role === 'admin' && (
                      <button
                        type="button"
                        onClick={() => page.deleteModal.openModal(m)}
                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600 shadow-sm transition-all hover:bg-red-600 hover:text-white"
                        title="Excluir"
                      >
                        <FontAwesomeIcon icon={faTrashAlt} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageLayout>
    </>
  );
}

export default ManutencoesPage;