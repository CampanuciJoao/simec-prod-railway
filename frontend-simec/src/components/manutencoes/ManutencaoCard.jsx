import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEye,
  faHourglassEnd,
  faHourglassStart,
  faHospital,
  faHashtag,
  faRobot,
  faTrashAlt,
  faUser,
  faWrench,
} from '@fortawesome/free-solid-svg-icons';

import {
  Button,
  Card,
  InfoCard,
  StatusBadge,
} from '@/components/ui';
import { formatarDataHora } from '@/utils/timeUtils';

function getTipoLabel(tipo) {
  return tipo ? String(tipo).replace(/([A-Z])/g, ' $1').trim() : '-';
}

const STATUS_BORDER = {
  Concluida:             'var(--color-success)',
  Cancelada:             'var(--text-muted)',
  EmAndamento:           'var(--color-info)',
  AguardandoConfirmacao: 'var(--color-warning)',
  Agendada:              'var(--brand-primary)',
  Pendente:              'var(--color-warning)',
};

function AbertoPorChip({ abertoPor }) {
  if (!abertoPor?.label) return null;
  const isAgente = abertoPor.tipo === 'agente';
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium"
      style={{
        borderColor: 'var(--border-soft)',
        backgroundColor: 'var(--bg-surface-soft)',
        color: isAgente ? 'var(--color-info)' : 'var(--text-secondary)',
      }}
      title={isAgente ? 'Aberta pelo Agente IA' : `Aberta por ${abertoPor.label}`}
    >
      <FontAwesomeIcon icon={isAgente ? faRobot : faUser} className="text-[10px]" />
      <span className="truncate max-w-[140px]">{abertoPor.label}</span>
    </span>
  );
}

function ManutencaoCard({ manutencao, isAdmin = false, onDelete }) {
  return (
    <Card
      className="rounded-2xl p-5"
      style={{
        borderLeftWidth: '4px',
        borderLeftColor: STATUS_BORDER[manutencao.status] || 'var(--border-soft)',
      }}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                  }}
                >
                  OS
                </span>
                <h3
                  className="text-xl font-bold tracking-tight stat-value"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {manutencao.numeroOS}
                </h3>

                <StatusBadge value={manutencao.status} />
                <StatusBadge value={getTipoLabel(manutencao.tipo)} />
                <AbertoPorChip abertoPor={manutencao.abertoPor} />
              </div>

              <p
                className="mt-3 text-sm leading-6"
                style={{ color: 'var(--text-secondary)' }}
              >
                {manutencao.descricaoProblemaServico || 'Sem descrição informada.'}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Link to={`/manutencoes/detalhes/${manutencao.id}`}>
                <Button type="button" variant="primary">
                  <FontAwesomeIcon icon={faEye} />
                  Ver detalhes
                </Button>
              </Link>

              {isAdmin ? (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => onDelete(manutencao)}
                >
                  <FontAwesomeIcon icon={faTrashAlt} />
                  Excluir
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <InfoCard
              icon={faWrench}
              label="Equipamento"
              value={manutencao.equipamento?.modelo || '---'}
            />

            <InfoCard
              icon={faHospital}
              label="Unidade"
              value={manutencao.equipamento?.unidade?.nomeSistema || '---'}
            />

            <InfoCard
              icon={faHourglassStart}
              label="Início agendado"
              value={formatarDataHora(manutencao.dataHoraAgendamentoInicio)}
            />

            <InfoCard
              icon={faHourglassEnd}
              label="Fim agendado"
              value={formatarDataHora(manutencao.dataHoraAgendamentoFim)}
            />

            <InfoCard
              icon={faHashtag}
              label="Chamado"
              value={manutencao.numeroChamado || '---'}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

ManutencaoCard.propTypes = {
  manutencao: PropTypes.object.isRequired,
  isAdmin: PropTypes.bool,
  onDelete: PropTypes.func.isRequired,
};

export default ManutencaoCard;
