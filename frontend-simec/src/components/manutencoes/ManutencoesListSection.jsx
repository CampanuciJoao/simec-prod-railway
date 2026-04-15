import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClock,
  faCircleCheck,
  faCircleXmark,
  faTriangleExclamation,
  faEye,
  faTrashAlt,
} from '@fortawesome/free-solid-svg-icons';

import {
  Card,
  Badge,
  Button,
  ResponsiveGrid,
  PageSection,
} from '@/components/ui';
import GlobalFilterBar from '@/components/ui/filters/GlobalFilterBar';

import { formatarData } from '@/utils/timeUtils';

// Helpers simples
const getStatusVariant = (status) => {
  const s = String(status || '').toLowerCase();

  if (s === 'concluida') return 'green';
  if (s === 'cancelada') return 'red';
  if (s === 'emandamento') return 'yellow';
  if (s === 'aguardandoconfirmacao') return 'yellow';

  return 'blue';
};

const formatarLabel = (v) =>
  v ? String(v).replace(/([A-Z])/g, ' $1').trim() : '';

function ActiveFilters({ filters, onRemove, onClearAll }) {
  if (!filters?.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((f) => (
        <button
          key={`${f.key}-${f.value}`}
          type="button"
          onClick={() => onRemove(f.key)}
          className="rounded-full border bg-white px-3 py-1 text-xs hover:bg-slate-50"
        >
          {f.label} ✕
        </button>
      ))}

      <button
        type="button"
        onClick={onClearAll}
        className="text-xs text-blue-600 hover:underline"
      >
        Limpar tudo
      </button>
    </div>
  );
}

function KPI({ icon, label, value, onClick }) {
  return (
    <button type="button" onClick={onClick} className="w-full text-left">
      <Card>
        <div className="flex items-center gap-3">
          <FontAwesomeIcon icon={icon} />
          <div>
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-xl font-bold">{value}</p>
          </div>
        </div>
      </Card>
    </button>
  );
}

function ManutencaoCard({ manutencao, isAdmin, onDelete }) {
  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold">{manutencao.numeroOS}</h3>

          <div className="mt-1 flex gap-2">
            <Badge variant={getStatusVariant(manutencao.status)}>
              {formatarLabel(manutencao.status)}
            </Badge>

            <Badge variant="outline">
              {formatarLabel(manutencao.tipo)}
            </Badge>
          </div>
        </div>

        <div className="flex gap-2">
          <Link to={`/manutencoes/detalhes/${manutencao.id}`}>
            <Button size="icon">
              <FontAwesomeIcon icon={faEye} />
            </Button>
          </Link>

          {isAdmin && (
            <Button
              size="icon"
              variant="destructive"
              onClick={() => onDelete(manutencao)}
            >
              <FontAwesomeIcon icon={faTrashAlt} />
            </Button>
          )}
        </div>
      </div>

      <p className="text-sm text-slate-600">
        {manutencao.descricaoProblemaServico || 'Sem descrição'}
      </p>

      <div className="text-sm text-slate-500">
        <div>Equipamento: {manutencao.equipamento?.modelo || '---'}</div>
        <div>
          Unidade: {manutencao.equipamento?.unidade?.nomeSistema || '---'}
        </div>
        <div>Data: {formatarData(manutencao.dataHoraAgendamentoInicio)}</div>
      </div>
    </Card>
  );
}

function ManutencoesListSection({
  manutencoes,
  searchTerm,
  onSearchChange,
  selectFilters,
  activeFilters,
  onRemoveFilter,
  onClearAll,
  onDelete,
  isAdmin,
  metricas,
}) {
  return (
    <PageSection>
      <div className="space-y-6">
        <ResponsiveGrid preset="compact">
          <KPI
            icon={faClock}
            label="Total"
            value={metricas?.total ?? 0}
            onClick={onClearAll}
          />

          <KPI
            icon={faTriangleExclamation}
            label="Aguardando"
            value={metricas?.aguardando ?? 0}
          />

          <KPI
            icon={faCircleCheck}
            label="Concluídas"
            value={metricas?.concluidas ?? 0}
          />

          <KPI
            icon={faCircleXmark}
            label="Canceladas"
            value={metricas?.canceladas ?? 0}
          />
        </ResponsiveGrid>

        <GlobalFilterBar
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
          selectFilters={selectFilters}
        />

        <ActiveFilters
          filters={activeFilters}
          onRemove={onRemoveFilter}
          onClearAll={onClearAll}
        />

        <div className="space-y-4">
          {manutencoes.map((m) => (
            <ManutencaoCard
              key={m.id}
              manutencao={m}
              isAdmin={isAdmin}
              onDelete={onDelete}
            />
          ))}
        </div>
      </div>
    </PageSection>
  );
}

export default ManutencoesListSection;