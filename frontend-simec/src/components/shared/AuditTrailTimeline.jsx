import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCirclePlus,
  faPen,
  faCheck,
  faBan,
  faCalendarDays,
  faWrench,
  faClockRotateLeft,
} from '@fortawesome/free-solid-svg-icons';
import { Card } from '@/components/ui';
import { formatarDataHora } from '@/utils/timeUtils';

const TIPO_CONFIG = {
  manutencao_registrada:   { icon: faCirclePlus,      color: '#2563eb' },
  manutencao_atualizada:   { icon: faPen,             color: '#7c3aed' },
  manutencao_concluir:     { icon: faCheck,           color: '#16a34a' },
  manutencao_cancelar:     { icon: faBan,             color: '#dc2626' },
  manutencao_agendar_visita: { icon: faCalendarDays,  color: '#f97316' },
  STATUS_BASE_EQUIPAMENTO: { icon: faWrench,          color: '#64748b' },
};

function getConfig(tipoEvento) {
  return TIPO_CONFIG[tipoEvento] || { icon: faClockRotateLeft, color: '#64748b' };
}

function parseMetadata(metadataJson) {
  try { return metadataJson ? JSON.parse(metadataJson) : null; } catch { return null; }
}

function EventoItem({ evento }) {
  const cfg = getConfig(evento.tipoEvento);
  const meta = parseMetadata(evento.metadataJson);
  const data = evento.dataEvento || evento.createdAt;

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: cfg.color }}
        >
          <FontAwesomeIcon icon={cfg.icon} className="text-sm" />
        </div>
        <div className="mt-1 flex-1 border-l" style={{ borderColor: 'var(--border-soft)' }} />
      </div>

      <div className="pb-6 min-w-0 flex-1">
        <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>
          {formatarDataHora(data)}
          {evento.origem && evento.origem !== 'sistema' && (
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs">
              {evento.origem}
            </span>
          )}
        </p>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {evento.titulo}
        </p>
        {evento.descricao && (
          <p className="mt-1 text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
            {evento.descricao}
          </p>
        )}
        {meta?.acao && (
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Ação: {meta.acao}
          </p>
        )}
      </div>
    </div>
  );
}

function AuditTrailTimeline({ eventos = [], loading = false, titulo = 'Log de auditoria' }) {
  return (
    <Card className="p-6">
      <h2 className="mb-5 text-base font-bold" style={{ color: 'var(--text-primary)' }}>
        {titulo}
      </h2>

      {loading ? (
        <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
          Carregando...
        </p>
      ) : eventos.length === 0 ? (
        <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
          Nenhum evento de auditoria registrado.
        </p>
      ) : (
        <div>
          {eventos.map((evento) => (
            <EventoItem key={evento.id} evento={evento} />
          ))}
        </div>
      )}
    </Card>
  );
}

export default AuditTrailTimeline;
