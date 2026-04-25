import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRight,
  faChevronRight,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';

import { Drawer, StatusBadge } from '@/components/ui';
import { formatarDataHora } from '@/utils/timeUtils';

// ── atoms ──────────────────────────────────────────────────────────────────────

function StatGrid({ stats }) {
  return (
    <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {stats.map((stat, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200 bg-slate-50 p-4"
        >
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {stat.label}
          </div>
          <div className="mt-1.5 truncate text-xl font-bold text-slate-900">
            {stat.value ?? '—'}
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="mb-2 mt-5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
      {children}
    </div>
  );
}

function CardList({ children }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="divide-y divide-slate-100">{children}</div>
    </div>
  );
}

function EmptyCard({ message }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function SpinnerRow() {
  return (
    <div className="flex items-center justify-center py-10 text-slate-400">
      <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xl" />
    </div>
  );
}

function LoadMoreBtn({ onClick, loading }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="mt-3 w-full rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
    >
      {loading ? (
        <FontAwesomeIcon icon={faSpinner} className="mr-2 animate-spin" />
      ) : null}
      Carregar mais
    </button>
  );
}

function CtaButton({ label, onClick }) {
  if (!label || !onClick) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-5 flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
    >
      {label}
      <FontAwesomeIcon icon={faArrowRight} className="text-slate-400" />
    </button>
  );
}

// ── row components ─────────────────────────────────────────────────────────────

function EquipRow({ eq, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(eq)}
      className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-900">
          {eq.modelo || '—'}
          {eq.tag ? (
            <span className="ml-1.5 font-normal text-slate-500">· {eq.tag}</span>
          ) : null}
        </div>
        <div className="mt-0.5 text-xs text-slate-400">
          {eq.unidade?.nomeSistema || '—'}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <StatusBadge value={eq.status} />
        <FontAwesomeIcon icon={faChevronRight} className="text-xs text-slate-400" />
      </div>
    </button>
  );
}

function ManutencaoRow({ m, onClick }) {
  const equipLabel = m.equipamento?.modelo || m.equipamento?.tag || '—';
  const unidadeLabel = m.equipamento?.unidade?.nomeSistema;
  const dataLabel = formatarDataHora(m.dataHoraAgendamentoInicio);

  return (
    <button
      type="button"
      onClick={() => onClick(m)}
      className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-900">
          {equipLabel}
          {m.numeroOS ? (
            <span className="ml-1.5 font-normal text-slate-500">
              · OS {m.numeroOS}
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 text-xs text-slate-400">
          {[dataLabel, unidadeLabel].filter(Boolean).join(' · ')}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <StatusBadge value={m.status} />
        <FontAwesomeIcon icon={faChevronRight} className="text-xs text-slate-400" />
      </div>
    </button>
  );
}

function RankRow({ index, nome, sub, value, meta }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
        {index + 1}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-900">{nome}</div>
        {sub ? (
          <div className="mt-0.5 text-xs text-slate-400">{sub}</div>
        ) : null}
      </div>
      <div className="shrink-0 text-right">
        <div className="text-sm font-bold text-slate-900">{value}</div>
        {meta != null ? (
          <div className="text-[10px] text-slate-400">{meta}</div>
        ) : null}
      </div>
    </div>
  );
}

// ── paginated list helper ──────────────────────────────────────────────────────

function LiveList({ items, loading, hasMore, onLoadMore, emptyMessage, renderRow }) {
  if (loading && !items.length) return <SpinnerRow />;

  if (!items.length) return <EmptyCard message={emptyMessage} />;

  return (
    <>
      <CardList>{items.map(renderRow)}</CardList>
      {hasMore ? <LoadMoreBtn onClick={onLoadMore} loading={loading} /> : null}
    </>
  );
}

// ── content panels per drawer type ────────────────────────────────────────────

function AtivosPanel({ resumoCards, items, loading, hasMore, onLoadMore, navigate }) {
  return (
    <>
      <StatGrid
        stats={[{ label: 'Total de ativos', value: resumoCards?.totalAtivos }]}
      />
      <SectionLabel>Equipamentos cadastrados</SectionLabel>
      <LiveList
        items={items}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={onLoadMore}
        emptyMessage="Nenhum ativo cadastrado."
        renderRow={(eq) => (
          <EquipRow
            key={eq.id}
            eq={eq}
            onClick={() => navigate(`/equipamentos/detalhes/${eq.id}`)}
          />
        )}
      />
      <CtaButton
        label="Ver todos os ativos"
        onClick={() => navigate('/equipamentos')}
      />
    </>
  );
}

function PreventivasPanel({ resumoCards, items, loading, hasMore, onLoadMore, navigate }) {
  return (
    <>
      <StatGrid
        stats={[{ label: 'Preventivas realizadas', value: resumoCards?.preventivas }]}
      />
      <SectionLabel>Registros de preventivas</SectionLabel>
      <LiveList
        items={items}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={onLoadMore}
        emptyMessage="Nenhuma preventiva encontrada."
        renderRow={(m) => (
          <ManutencaoRow
            key={m.id}
            m={m}
            onClick={() => navigate(`/manutencoes/detalhes/${m.id}`)}
          />
        )}
      />
      <CtaButton
        label="Ver todas as preventivas"
        onClick={() => navigate('/manutencoes', { filtroTipoInicial: 'Preventiva' })}
      />
    </>
  );
}

function CorretivasPanel({ resumoCards, items, loading, hasMore, onLoadMore, navigate }) {
  return (
    <>
      <StatGrid
        stats={[{ label: 'Falhas corretivas', value: resumoCards?.corretivas }]}
      />
      <SectionLabel>Registros de corretivas</SectionLabel>
      <LiveList
        items={items}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={onLoadMore}
        emptyMessage="Nenhuma corretiva encontrada."
        renderRow={(m) => (
          <ManutencaoRow
            key={m.id}
            m={m}
            onClick={() => navigate(`/manutencoes/detalhes/${m.id}`)}
          />
        )}
      />
      <CtaButton
        label="Ver todas as corretivas"
        onClick={() => navigate('/manutencoes', { filtroTipoInicial: 'Corretiva' })}
      />
    </>
  );
}

function DowntimePanel({ rankingUnidades, rankingDowntime, navigate }) {
  return (
    <>
      <SectionLabel>Ranking de unidades por parada</SectionLabel>
      {rankingUnidades?.length ? (
        <CardList>
          {rankingUnidades.map((u, i) => (
            <RankRow
              key={u.unidadeId}
              index={i}
              nome={u.nome}
              value={u.downtimeFormatado}
            />
          ))}
        </CardList>
      ) : (
        <EmptyCard message="Sem dados de downtime por unidade." />
      )}

      <SectionLabel>Equipamentos com maior parada</SectionLabel>
      {rankingDowntime?.length ? (
        <CardList>
          {rankingDowntime.map((eq, i) => (
            <RankRow
              key={eq.equipamentoId}
              index={i}
              nome={eq.modelo || eq.tag || '—'}
              sub={eq.unidade}
              value={eq.downtimeFormatado}
              meta={`${eq.corretivas} corretiva${eq.corretivas !== 1 ? 's' : ''}`}
            />
          ))}
        </CardList>
      ) : (
        <EmptyCard message="Sem dados de downtime por equipamento." />
      )}

      <CtaButton
        label="Ver manutenções"
        onClick={() => navigate('/manutencoes')}
      />
    </>
  );
}

function UnidadeCriticaPanel({
  rankingUnidades,
  items,
  loading,
  hasMore,
  onLoadMore,
  navigate,
}) {
  const top = rankingUnidades?.[0];

  if (!top) {
    return <EmptyCard message="Nenhuma unidade com dados de criticidade." />;
  }

  return (
    <>
      <StatGrid
        stats={[
          { label: 'Unidade', value: top.nome },
          { label: 'Downtime total', value: top.downtimeFormatado },
        ]}
      />
      <SectionLabel>Corretivas que geraram parada</SectionLabel>
      <LiveList
        items={items}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={onLoadMore}
        emptyMessage="Nenhuma corretiva registrada para esta unidade."
        renderRow={(m) => (
          <ManutencaoRow
            key={m.id}
            m={m}
            onClick={() => navigate(`/manutencoes/detalhes/${m.id}`)}
          />
        )}
      />
      <CtaButton
        label="Ver equipamentos da unidade"
        onClick={() =>
          navigate('/equipamentos', { filtroUnidadeNomeInicial: top.nome })
        }
      />
    </>
  );
}

// ── drawer meta ────────────────────────────────────────────────────────────────

const DRAWER_META = {
  ativos: {
    title: 'Ativos monitorados',
    subtitle: 'Equipamentos cadastrados no sistema.',
  },
  preventivas: {
    title: 'Manutenções preventivas',
    subtitle: 'Preventivas registradas no período analisado.',
  },
  corretivas: {
    title: 'Manutenções corretivas',
    subtitle: 'Corretivas registradas no período analisado.',
  },
  downtime: {
    title: 'Downtime acumulado',
    subtitle: 'Ranking de paradas por unidade e equipamento.',
  },
  unidadeCritica: {
    title: 'Unidade mais crítica',
    subtitle: 'Eventos que impactaram a disponibilidade operacional.',
  },
};

// ── main component ─────────────────────────────────────────────────────────────

function BIDetalhesDrawer({
  open,
  onClose,
  drawerType,
  resumoCards,
  rankingUnidades,
  rankingDowntime,
  liveItems,
  liveLoading,
  liveHasMore,
  onLoadMore,
}) {
  const navigate = useNavigate();
  const meta = DRAWER_META[drawerType] || { title: 'Detalhes', subtitle: '' };

  const handleNavigate = useCallback(
    (path, routeState) => {
      onClose();
      navigate(path, routeState ? { state: routeState } : undefined);
    },
    [onClose, navigate]
  );

  function renderContent() {
    const shared = {
      items: liveItems,
      loading: liveLoading,
      hasMore: liveHasMore,
      onLoadMore,
      navigate: handleNavigate,
    };

    switch (drawerType) {
      case 'ativos':
        return <AtivosPanel resumoCards={resumoCards} {...shared} />;
      case 'preventivas':
        return <PreventivasPanel resumoCards={resumoCards} {...shared} />;
      case 'corretivas':
        return <CorretivasPanel resumoCards={resumoCards} {...shared} />;
      case 'downtime':
        return (
          <DowntimePanel
            rankingUnidades={rankingUnidades}
            rankingDowntime={rankingDowntime}
            navigate={handleNavigate}
          />
        );
      case 'unidadeCritica':
        return (
          <UnidadeCriticaPanel
            rankingUnidades={rankingUnidades}
            {...shared}
          />
        );
      default:
        return null;
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={meta.title}
      subtitle={meta.subtitle}
      widthClass="w-full sm:w-[500px] lg:w-[620px]"
    >
      {renderContent()}
    </Drawer>
  );
}

export default BIDetalhesDrawer;
