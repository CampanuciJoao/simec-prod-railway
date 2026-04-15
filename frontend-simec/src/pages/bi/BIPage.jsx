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
} from '@fortawesome/free-solid-svg-icons';

import { useBIPage } from '@/hooks/bi/useBIPage';

import PageLayout from '@/components/ui/layout/PageLayout';
import PageHeader from '@/components/ui/layout/PageHeader';
import PageSection from '@/components/ui/layout/PageSection';
import PageState from '@/components/ui/layout/PageState';
import ResponsiveGrid from '@/components/ui/layout/ResponsiveGrid';
import EmptyState from '@/components/ui/layout/EmptyState';

import Button from '@/components/ui/primitives/Button';

import Drawer from '@/components/ui/overlays/Drawer';
import DrawerList from '@/components/ui/overlays/DrawerList';

import BarChart from '@/components/charts/BarChart';
import { InteractiveKpiCard } from '@/components/bi';

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
        <div className="space-y-6">
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

          <ResponsiveGrid cols={{ base: 1, sm: 2, xl: 5 }}>
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
          </ResponsiveGrid>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
            <PageSection
              title="Downtime por unidade"
              description="Tempo acumulado de indisponibilidade"
            >
              <div className="h-[320px]">
                {page.downtimePorUnidadeChartData.length > 0 ? (
                  <BarChart data={page.downtimePorUnidadeChartData} />
                ) : (
                  <EmptyState message="Sem dados válidos para o gráfico." />
                )}
              </div>
            </PageSection>

            <PageSection
              title="Reincidência de falhas"
              description="Equipamentos com maior volume de corretivas"
            >
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
                <EmptyState message="Sem dados de corretivas." />
              )}
            </PageSection>
          </div>

          <PageSection
            title="Ranking de downtime"
            description="Equipamentos com maior tempo parado no período"
          >
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
              <EmptyState message="Nenhum equipamento parado registrado." />
            )}
          </PageSection>
        </div>
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

        <DrawerList
          items={page.drawerContent.items}
          emptyMessage="Nenhum dado disponível para esta visualização."
        />
      </Drawer>
    </>
  );
}

export default BIPage;