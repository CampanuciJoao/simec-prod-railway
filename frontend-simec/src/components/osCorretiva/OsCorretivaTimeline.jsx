import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFolderOpen, faStickyNote, faTruck, faClipboardCheck, faCheckCircle,
} from '@fortawesome/free-solid-svg-icons';
import { Card } from '@/components/ui';
import { formatarDataHora } from '@/utils/timeUtils';

const TIPO_CONFIG = {
  abertura: { icon: faFolderOpen, color: '#2563eb', label: 'Abertura' },
  nota: { icon: faStickyNote, color: '#334155', label: 'Nota de andamento' },
  promovida_corretiva: { icon: faClipboardCheck, color: '#dc2626', label: 'Promovida a Corretiva' },
  visita_agendada: { icon: faTruck, color: '#7c3aed', label: 'Visita agendada' },
  resultado_visita: { icon: faClipboardCheck, color: '#059669', label: 'Resultado da visita' },
  conclusao: { icon: faCheckCircle, color: '#16a34a', label: 'Conclusão' },
};

function TimelineItem({ evento }) {
  const cfg = TIPO_CONFIG[evento.tipo] || TIPO_CONFIG.nota;

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
        <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>
          {formatarDataHora(evento.dataHora)}
        </p>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {evento.titulo}
        </p>
        {evento.descricao && (
          <p className="mt-1 text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
            {evento.descricao}
          </p>
        )}
      </div>
    </div>
  );
}

function OsCorretivaTimeline({ timeline }) {
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
          <TimelineItem key={idx} evento={evento} />
        ))}
      </div>
    </Card>
  );
}

OsCorretivaTimeline.propTypes = {
  timeline: PropTypes.array.isRequired,
};

export default OsCorretivaTimeline;
