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

import { Badge, Button, Card } from '@/components/ui';
import { formatarData } from '@/utils/timeUtils';

function getStatusVariant(status) {
  const s = String(status || '').toLowerCase();

  if (s === 'concluida') return 'green';
  if (s === 'cancelada') return 'red';
  if (s === 'emandamento') return 'yellow';
  if (s === 'aguardandoconfirmacao') return 'yellow';

  return 'blue';
}

function formatarLabel(value) {
  return value ? String(value).replace(/([A-Z])/g, ' $1').trim() : '-';
}

function InfoPill({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
        <FontAwesomeIcon icon={icon} />
        <span>{label}</span>
      </div>

      <div className="mt-1 text-sm font-medium text-slate-800">
        {value || '---'}
      </div>
    </div>
  );
}

InfoPill.propTypes = {
  icon: PropTypes.object.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.node,
};

function ManutencaoCard({ manutencao, isAdmin = false, onDelete }) {
  return (
    <Card className="rounded-3xl border border-slate-200 p-5 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-bold tracking-tight text-slate-900">
                  {manutencao.numeroOS}
                </h3>

                <Badge variant={getStatusVariant(manutencao.status)}>
                  {formatarLabel(manutencao.status)}
                </Badge>

                <Badge variant="outline">
                  {formatarLabel(manutencao.tipo)}
                </Badge>
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-600">
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
            <InfoPill
              icon={faWrench}
              label="Equipamento"
              value={manutencao.equipamento?.modelo || '---'}
            />

            <InfoPill
              icon={faHospital}
              label="Unidade"
              value={manutencao.equipamento?.unidade?.nomeSistema || '---'}
            />

            <InfoPill
              icon={faCalendarDays}
              label="Data"
              value={formatarData(manutencao.dataHoraAgendamentoInicio)}
            />

            <InfoPill
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