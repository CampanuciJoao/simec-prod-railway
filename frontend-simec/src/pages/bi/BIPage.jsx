import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPrint,
  faClock,
  faExclamationTriangle,
  faHospital,
  faChartBar,
  faExternalLinkAlt,
  faMicrochip,
  faShieldHeart,
  faScrewdriverWrench,
  faTriangleExclamation,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons';

import { useBIPage } from '../../hooks/bi/useBIPage';

import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import PageState from '../../components/ui/PageState';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Drawer from '../../components/ui/Drawer';
import BarChart from '../../components/charts/BarChart';

function InteractiveKpiCard({
  icon,
  title,
  value,
  tone = 'slate',
  onClick,
}) {
  const toneMap = {
    slate: 'bg-slate-100 text-slate-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-emerald-100 text-emerald-600',
    red: 'bg-red-100 text-red-600',
    yellow: 'bg-amber-100 text-amber-600',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <Card className="h-full min-h-[150px]">
        <div className="flex h-full flex-col justify-between gap-5">
          <div className="flex items-start gap-4">
            <div
              className={[
                'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
                toneMap[tone] || toneMap.slate,
              ].join(' ')}
            >
              <FontAwesomeIcon icon={icon} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {title}
              </p>

              <p className="mt-3 break-words text-3xl font-bold leading-tight tracking-tight text-slate-900">
                {value}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600">
            <span>Ver detalhes</span>
            <FontAwesomeIcon icon={faArrowRight} />
          </div>
        </div>
      </Card>
    </button>
  );
}

function SectionTitle({ icon, title, subtitle }) {
  return (
    <div className="mb-4">
      <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
        <FontAwesomeIcon icon={icon} className="text-slate-500" />
        {title}
      </h3>
      {subtitle ? (
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      ) : null}
    </div>
  );
}

function EmptyPanel({ message }) {
  return (
    <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function DrawerList({ items = [] }) {
  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
        Nenhum dado disponível.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="divide-y divide-slate-100">
        {items.map((item, index) => {
          const Wrapper = item.onClick ? 'button' : 'div';

          return (
            <Wrapper
              key={`${item.title}-${index}`}
              type={item.onClick ? 'button' : undefined}
              onClick={item.onClick}
              className={[
                'w-full px-4 py-3 text-left',
                item.onClick ? 'transition hover:bg-slate-50' : 'bg-white',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-800">{item.title}</div>
                  {item.subtitle ? (
                    <div className="mt-1 text-xs text-slate-500">{item.subtitle}</div>
                  ) : null}
                </div>

                <div className="shrink-0 text-right text-sm font-bold text-slate-900">
                  {item.value}
                </div>
              </div>
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}

function BIPage() {
  const page = useBIPage();

  const isEmpty =
    !page.loading &&
    !page.error &&
    (!page.dados ||
      (!page.rankingDowntime.length &&
        !page.rankingFrequencia.length &&
        !page.downtimePorUnidadeChartData.length));

  if (page.loading || page.error || isEmpty) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader
          title={`Business Intelligence${page.dados?.ano ? ` - ${page.dados.ano}` : ''}`}
          subtitle="Painel executivo para acompanhamento gerencial"
          icon={faChartBar}
          actions={
            <Button onClick={page.handlePrint} disabled={!page.dados}>
              <FontAwesomeIcon icon={faPrint} />
              Imprimir relatório executivo
            </Button>
          }
        />

        <PageState
          loading={page.loading}
          error={page.error}
          isEmpty={isEmpty}
          emptyMessage="Dados de BI não disponíveis para o período."
        />
      </PageLayout>
    );
  }

  return (
    <>
      <PageLayout background="slate" padded fullHeight>
        <PageHeader
          title={`Business Intelligence - ${page.dados?.ano || ''}`}
          subtitle="Painel executivo para acompanhamento gerencial"
          icon={faChartBar}
          actions={
            <Button onClick={page.handlePrint}>
              <FontAwesomeIcon icon={faPrint} />
              Imprimir relatório executivo
            </Button>
          }
        />

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          <InteractiveKpiCard
            icon={faMicrochip}
            title="Ativos no sistema"
            value={page.resumoCards.totalAtivos}
            tone="blue"
            onClick={() => page.openDrawer('ativos')}
          />

          <InteractiveKpiCard
            icon={faShieldHeart}
            title="Preventivas realizadas"
            value={page.resumoCards.preventivas}
            tone="green"
            onClick={() => page.openDrawer('preventivas')}
          />

          <InteractiveKpiCard
            icon={faTriangleExclamation}
            title="Falhas corretivas"
            value={page.resumoCards.corretivas}
            tone="red"
            onClick={() => page.openDrawer('corretivas')}
          />

          <InteractiveKpiCard
            icon={faClock}
            title="Downtime acumulado"
            value={page.resumoCards.downtimeAcumulado}
            tone="yellow"
            onClick={() => page.openDrawer('downtime')}
          />

          <InteractiveKpiCard
            icon={faHospital}
            title="Unidade mais crítica"
            value={page.resumoCards.unidadeCritica?.nome || '—'}
            tone="slate"
            onClick={() => page.openDrawer('unidadeCritica')}
          />
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
          <Card>
            <SectionTitle
              icon={faHospital}
              title="Downtime por unidade"
              subtitle="Tempo acumulado de indisponibilidade"
            />

            <div className="h-[320px]">
              {page.downtimePorUnidadeChartData.length > 0 ? (
                <BarChart data={page.downtimePorUnidadeChartData} />
              ) : (
                <EmptyPanel message="Sem dados válidos para o gráfico." />
              )}
            </div>
          </Card>

          <Card>
            <SectionTitle
              icon={faExclamationTriangle}
              title="Reincidência de falhas"
              subtitle="Equipamentos com maior volume de corretivas"
            />

            {page.rankingFrequencia.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="grid grid-cols-[1fr_120px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <span>Equipamento</span>
                  <span className="text-center">Qtd. corretivas</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {page.rankingFrequencia.map((e, index) => (
                    <button
                      key={`${e.tag}-${index}`}
                      type="button"
                      onClick={() => page.handleDrillDownEquipamento(e.id)}
                      className="grid w-full grid-cols-[1fr_120px] items-center px-4 py-3 text-left transition hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-blue-700">
                          {e.modelo}
                          <FontAwesomeIcon
                            icon={faExternalLinkAlt}
                            size="xs"
                            className="ml-2 opacity-60"
                          />
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Tag: {e.tag}
                        </div>
                      </div>

                      <div className="text-center text-xl font-bold text-red-500">
                        {e.corretivas}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyPanel message="Sem dados de corretivas." />
            )}
          </Card>
        </div>

        <Card>
          <SectionTitle
            icon={faScrewdriverWrench}
            title="Ranking de downtime"
            subtitle="Equipamentos com maior tempo parado no período"
          />

          {page.rankingDowntime.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Equipamento</th>
                    <th className="px-4 py-3">Nº Série / Tag</th>
                    <th className="px-4 py-3">Unidade</th>
                    <th className="px-4 py-3 text-center">Total parado</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {page.rankingDowntime.map((e, index) => (
                    <tr key={`${e.tag}-${index}`} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {e.modelo}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">
                        {e.tag}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{e.unidade}</td>
                      <td className="px-4 py-3 text-center font-bold text-amber-600">
                        {e.downtimeFormatado}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyPanel message="Nenhum equipamento parado registrado." />
          )}
        </Card>
      </PageLayout>

      <Drawer
        open={page.drawer.open}
        onClose={page.closeDrawer}
        title={page.drawerContent.title}
        subtitle={page.drawerContent.subtitle}
      >
        {page.drawerContent.stats?.length > 0 ? (
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {page.drawerContent.stats.map((stat, index) => (
              <div
                key={`${stat.label}-${index}`}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {stat.label}
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {page.drawerContent.actionLabel ? (
          <div className="mb-5">
            <Button onClick={page.drawerContent.onAction}>
              {page.drawerContent.actionLabel}
            </Button>
          </div>
        ) : null}

        <DrawerList items={page.drawerContent.items} />
      </Drawer>
    </>
  );
}

export default BIPage;