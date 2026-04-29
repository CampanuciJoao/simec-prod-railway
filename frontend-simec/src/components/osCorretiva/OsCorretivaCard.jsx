import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEye, faTrashAlt, faMicrochip, faHospital,
  faClock, faUser, faTruck,
} from '@fortawesome/free-solid-svg-icons';
import { Button, Card, InfoCard } from '@/components/ui';
import { formatarDataHora } from '@/utils/timeUtils';

const STATUS_BORDER = {
  Aberta: '#2563eb',
  EmAndamento: '#8b5cf6',
  AguardandoTerceiro: '#f97316',
  Concluida: '#16a34a',
};

const STATUS_LABELS = {
  Aberta: 'Aberta',
  EmAndamento: 'Em andamento',
  AguardandoTerceiro: 'Aguardando terceiro',
  Concluida: 'Concluída',
};

const EQ_STATUS_LABELS = {
  Operante: 'Operante',
  Inoperante: 'Inoperante',
  UsoLimitado: 'Uso limitado',
  EmManutencao: 'Em manutenção',
  Desativado: 'Desativado',
};

const TIPO_COLORS = {
  Ocorrencia: { bg: '#6366f1', label: 'Ocorrência' },
  Corretiva: { bg: '#dc2626', label: 'Corretiva' },
};

function OsCorretivaCard({ os, isAdmin, onDelete }) {
  const statusColor = STATUS_BORDER[os.status] || 'var(--border-soft)';
  const statusLabel = STATUS_LABELS[os.status] || os.status;
  const tipoConfig = TIPO_COLORS[os.tipo] || { bg: '#6b7280', label: os.tipo || 'Ocorrência' };

  return (
    <Card
      className="rounded-3xl p-5"
      style={{ borderLeftWidth: '4px', borderLeftColor: statusColor }}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  {os.numeroOS}
                </h3>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                  style={{ backgroundColor: tipoConfig.bg }}
                >
                  {tipoConfig.label}
                </span>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                  style={{ backgroundColor: statusColor }}
                >
                  {statusLabel}
                </span>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{ backgroundColor: 'var(--bg-soft)', color: 'var(--text-secondary)' }}
                >
                  {EQ_STATUS_LABELS[os.statusEquipamentoAbertura] || os.statusEquipamentoAbertura}
                </span>
              </div>

              <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                {os.descricaoProblema || 'Sem descrição informada.'}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Link to={`/manutencoes/ocorrencia/${os.id}`}>
                <Button type="button" variant="primary">
                  <FontAwesomeIcon icon={faEye} />
                  Ver detalhes
                </Button>
              </Link>
              {isAdmin && (
                <Button type="button" variant="danger" onClick={() => onDelete(os)}>
                  <FontAwesomeIcon icon={faTrashAlt} />
                </Button>
              )}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <InfoCard icon={faMicrochip} label="Equipamento" value={os.equipamento?.modelo || '---'} />
            <InfoCard icon={faHospital} label="Unidade" value={os.equipamento?.unidade?.nomeSistema || '---'} />
            <InfoCard icon={faUser} label="Solicitante" value={os.solicitante || '---'} />
            <InfoCard icon={faClock} label="Abertura" value={formatarDataHora(os.dataHoraAbertura)} />
          </div>

          {os.ultimaVisita && (
            <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <FontAwesomeIcon icon={faTruck} />
              <span>Última visita: {os.ultimaVisita.prestadorNome} — {os.ultimaVisita.statusLabel || os.ultimaVisita.status}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

OsCorretivaCard.propTypes = {
  os: PropTypes.object.isRequired,
  isAdmin: PropTypes.bool,
  onDelete: PropTypes.func.isRequired,
};

OsCorretivaCard.defaultProps = { isAdmin: false };

export default OsCorretivaCard;
