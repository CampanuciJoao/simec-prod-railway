import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFolderOpen, faStickyNote, faTruck, faClipboardCheck, faCheckCircle, faBan,
} from '@fortawesome/free-solid-svg-icons';
import { Card } from '@/components/ui';
import { formatarDataHora } from '@/utils/timeUtils';
import { useUnidadeTimezone } from '@/hooks/useTenantTimezone';

const TIPO_CONFIG = {
  abertura: { icon: faFolderOpen, color: '#2563eb', label: 'Abertura' },
  nota: { icon: faStickyNote, color: '#334155', label: 'Nota de andamento' },
  promovida_corretiva: { icon: faClipboardCheck, color: '#dc2626', label: 'Promovida a Corretiva' },
  visita_agendada: { icon: faTruck, color: '#7c3aed', label: 'Visita agendada' },
  resultado_visita: { icon: faClipboardCheck, color: '#059669', label: 'Resultado da visita' },
  conclusao: { icon: faCheckCircle, color: '#16a34a', label: 'Conclusão' },
  cancelamento: { icon: faBan, color: '#6b7280', label: 'Cancelamento' },
};

function TimelineItem({ evento, timezone }) {
  const cfg = TIPO_CONFIG[evento.tipo] || TIPO_CONFIG.nota;
  const fmt = (iso) => formatarDataHora(iso, { timeZone: timezone });

  const descricaoTexto = (() => {
    if (evento.tipo === 'visita_agendada' && evento.meta?.dataHoraInicioPrevista) {
      return `Previsão: ${fmt(evento.meta.dataHoraInicioPrevista)} até ${fmt(evento.meta.dataHoraFimPrevista)}`;
    }
    return evento.descricao || null;
  })();

  const resumoOs =
    evento.meta?.isConclusive && evento.meta?.dataHoraAberturaOs
      ? `OS aberta em ${fmt(evento.meta.dataHoraAberturaOs)} — encerrada em ${fmt(evento.meta.dataHoraConclusaoOs)}`
      : null;

  return (
    <div className="flex gap-4">
      {/* Ícone */}
      <div className="flex flex-col items-center">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: cfg.color }}
        >
          <FontAwesomeIcon icon={cfg.icon} className="text-sm" />
        </div>
        <div className="mt-1 flex-1 border-l" style={{ borderColor: 'var(--border-soft)' }} />
      </div>

      {/* Conteúdo */}
      <div className="pb-6 min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2 mb-0.5">
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            {fmt(evento.dataHora)}
          </p>
          {evento.meta?.registroRetroativo && (
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={{
                backgroundColor: 'var(--color-warning-surface)',
                color: 'var(--color-warning)',
                border: '1px solid var(--color-warning-soft)',
              }}
              title={`Registrado no sistema em ${fmt(evento.meta.dataHoraRegistro)}`}
            >
              Registro retroativo
            </span>
          )}
        </div>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {evento.titulo}
        </p>
        {descricaoTexto && (
          <p className="mt-1 text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
            {descricaoTexto}
          </p>
        )}
        {evento.meta?.registroRetroativo && evento.meta?.dataHoraRegistro && (
          <p className="mt-1 text-xs italic" style={{ color: 'var(--text-muted)' }}>
            Registrado no sistema em {fmt(evento.meta.dataHoraRegistro)}.
          </p>
        )}
        {resumoOs && (
          <p className="mt-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            {resumoOs}
          </p>
        )}
      </div>
    </div>
  );
}

function OsCorretivaTimeline({ timeline, timezone: tzProp }) {
  const tz = useUnidadeTimezone({ timezone: tzProp });

  if (!timeline || timeline.length === 0) {
    return (
      <Card className="rounded-3xl p-6">
        <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
          Nenhum evento registrado ainda.
        </p>
      </Card>
    );
  }

  return (
    <Card className="rounded-3xl p-6">
      <h2 className="mb-5 text-base font-bold" style={{ color: 'var(--text-primary)' }}>
        Timeline da OS
      </h2>
      <div>
        {timeline.map((evento, idx) => (
          <TimelineItem key={idx} evento={evento} timezone={tz} />
        ))}
      </div>
    </Card>
  );
}

OsCorretivaTimeline.propTypes = {
  timeline: PropTypes.array.isRequired,
  timezone: PropTypes.string,
};

export default OsCorretivaTimeline;
