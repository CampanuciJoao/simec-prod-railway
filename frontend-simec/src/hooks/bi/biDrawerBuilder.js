import { formatarDowntime } from '@/utils/bi';

export function buildDrawerContent({
  type,
  resumoCards,
  rankingFrequencia,
  rankingDowntime,
  rankingUnidades,
  handlers,
}) {
  if (!type) {
    return {
      title: '',
      subtitle: '',
      actionLabel: '',
      onAction: null,
      items: [],
      stats: [],
    };
  }

  switch (type) {
    case 'ativos':
      return {
        title: 'Ativos no sistema',
        subtitle: 'Resumo do parque cadastrado',
        actionLabel: 'Abrir equipamentos',
        onAction: handlers.goToAtivos,
        items: [],
        stats: [
          { label: 'Total de ativos', value: resumoCards.totalAtivos },
        ],
      };

    case 'corretivas':
      return {
        title: 'Falhas corretivas',
        subtitle: 'Equipamentos com reincidência',
        actionLabel: 'Abrir corretivas',
        onAction: handlers.goToCorretivas,
        items: rankingFrequencia.slice(0, 10).map((item) => ({
          title: item.modelo,
          subtitle: `Tag: ${item.tag || '—'}`,
          value: `${item.corretivas}`,
          onClick: () => handlers.drillDown(item.id),
        })),
        stats: [
          { label: 'Total de corretivas', value: resumoCards.corretivas },
        ],
      };

    case 'downtime':
      return {
        title: 'Downtime acumulado',
        subtitle: 'Tempo total de indisponibilidade',
        actionLabel: 'Abrir manutenção',
        onAction: handlers.goToDowntime,
        items: rankingDowntime.slice(0, 10).map((item) => ({
          title: item.modelo,
          subtitle: `${item.unidade}`,
          value: item.downtimeFormatado,
        })),
        stats: [
          {
            label: 'Downtime acumulado',
            value: resumoCards.downtimeAcumulado,
          },
        ],
      };

    case 'unidadeCritica':
      return {
        title: 'Unidade mais crítica',
        subtitle: 'Maior downtime',
        actionLabel: 'Abrir unidade',
        onAction: handlers.goToUnidadeCritica,
        items: rankingUnidades.slice(0, 10).map((item) => ({
          title: item.nome,
          value: formatarDowntime(item.horasParado),
        })),
        stats: [
          {
            label: 'Unidade crítica',
            value: resumoCards.unidadeCritica?.nome || '—',
          },
        ],
      };

    default:
      return {};
  }
}