import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDays,
  faEye,
  faHospital,
  faHashtag,
  faTrashAlt,
  faWrench,
} from '@fortawesome/free-solid-svg-icons';

import {
  Button,
  Card,
  InfoCard,
  StatusBadge,
} from '@/components/ui';
import { formatarData } from '@/utils/timeUtils';

function getTipoLabel(tipo) {
  return tipo ? String(tipo).replace(/([A-Z])/g, ' $1').trim() : '-';
}

function ManutencaoCard({ manutencao, isAdmin = false, onDelete }) {
  return (
    <Card className="rounded-3xl p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  className="text-xl font-bold tracking-tight"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {manutencao.numeroOS}
                </h3>

                <StatusBadge value={manutencao.status} />
                <StatusBadge value={getTipoLabel(manutencao.tipo)} />
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
                <Button type="button" variant="secondary">
                  <FontAwesomeIcon icon={faEye} />
                  Visualizar
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

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
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
              icon={faCalendarDays}
              label="Data"
              value={formatarData(manutencao.dataHoraAgendamentoInicio)}
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