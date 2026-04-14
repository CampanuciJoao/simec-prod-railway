import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDays,
  faClock,
  faHashtag,
  faHospital,
  faSave,
  faBan,
  faWrench,
} from '@fortawesome/free-solid-svg-icons';

import {
  Badge,
  Button,
  DateInput,
  Input,
  PageSection,
  ResponsiveGrid,
  Select,
  TimeInput,
} from '../ui';

const STATUS_OPTIONS = [
  'Agendada',
  'EmAndamento',
  'AguardandoConfirmacao',
  'Concluida',
  'Cancelada',
];

function formatarStatusLabel(status) {
  return String(status || '').replace(/([A-Z])/g, ' $1').trim();
}

function getStatusVariant(status) {
  const normalized = String(status || '').toLowerCase();

  if (normalized === 'agendada') return 'blue';
  if (normalized === 'emandamento') return 'yellow';
  if (normalized === 'aguardandoconfirmacao') return 'yellow';
  if (normalized === 'concluida') return 'green';
  if (normalized === 'cancelada') return 'red';

  return 'slate';
}

function InfoCard({ icon, label, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
        <FontAwesomeIcon icon={icon} />
        <span>{label}</span>
      </div>
      <div className="text-sm font-medium text-slate-800">{children}</div>
    </div>
  );
}

InfoCard.propTypes = {
  icon: PropTypes.object.isRequired,
  label: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

function InformacoesManutencaoSection({
  manutencao,
  formData,
  onFormChange,
  onSalvarAlteracoes,
  onAbrirCancelamento,
  camposPrincipaisBloqueados,
  isCancelavel,
  submitting,
}) {
  return (
    <PageSection
      title="Informações da manutenção"
      description="Edite os dados operacionais da OS respeitando o contrato local-first do backend."
    >
      <div className="mb-6">
        <ResponsiveGrid preset="cards">
          <InfoCard icon={faWrench} label="OS / Status">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-lg font-bold text-slate-900">
                {manutencao?.numeroOS || '-'}
              </span>
              <Badge variant={getStatusVariant(manutencao?.status)}>
                {formatarStatusLabel(manutencao?.status)}
              </Badge>
            </div>
          </InfoCard>

          <InfoCard icon={faHospital} label="Unidade">
            {manutencao?.equipamento?.unidade?.nomeSistema || '-'}
          </InfoCard>

          <InfoCard icon={faHashtag} label="Equipamento">
            <div className="flex flex-col gap-1">
              <Link
                to={`/equipamentos/${manutencao?.equipamentoId || ''}`}
                className="font-semibold text-blue-600 hover:underline"
              >
                {manutencao?.equipamento?.modelo || '-'}
              </Link>
              <span className="text-xs text-slate-500">
                Tag: {manutencao?.equipamento?.tag || '-'}
              </span>
            </div>
          </InfoCard>

          <InfoCard icon={faCalendarDays} label="Agendamento local">
            <div className="flex flex-col gap-1">
              <span>{manutencao?.agendamentoLocal?.data || '-'}</span>
              <span className="text-xs text-slate-500">
                {manutencao?.agendamentoLocal?.horaInicio || '--:--'}
                {manutencao?.agendamentoLocal?.horaFim
                  ? ` até ${manutencao.agendamentoLocal.horaFim}`
                  : ''}
              </span>
            </div>
          </InfoCard>

          <InfoCard icon={faClock} label="Timezone operacional">
            {manutencao?.agendamentoLocal?.timezone || '-'}
          </InfoCard>

          <InfoCard icon={faHashtag} label="Nº do chamado">
            {manutencao?.numeroChamado || '---'}
          </InfoCard>
        </ResponsiveGrid>
      </div>

      <div className="space-y-6">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Descrição do serviço
          </label>
          <textarea
            name="descricaoProblemaServico"
            value={formData.descricaoProblemaServico}
            onChange={onFormChange}
            disabled={camposPrincipaisBloqueados || submitting}
            rows={4}
            className="min-h-[120px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Descreva o problema encontrado ou o serviço executado."
          />
        </div>

        <ResponsiveGrid preset="form">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Técnico responsável
            </label>
            <Input
              name="tecnicoResponsavel"
              value={formData.tecnicoResponsavel}
              onChange={onFormChange}
              disabled={camposPrincipaisBloqueados || submitting}
              placeholder="Ex.: Equipe técnica interna"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Número do chamado
            </label>
            <Input
              name="numeroChamado"
              value={formData.numeroChamado}
              onChange={onFormChange}
              disabled={camposPrincipaisBloqueados || submitting}
              placeholder="Ex.: CH-2026-001"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Status
            </label>
            <Select
              name="status"
              value={formData.status}
              onChange={onFormChange}
              disabled={camposPrincipaisBloqueados || submitting}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {formatarStatusLabel(status)}
                </option>
              ))}
            </Select>
          </div>
        </ResponsiveGrid>

        <ResponsiveGrid preset="form">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Data do agendamento
            </label>
            <DateInput
              name="agendamentoDataLocal"
              value={formData.agendamentoDataLocal}
              onChange={onFormChange}
              disabled={camposPrincipaisBloqueados || submitting}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Hora inicial
            </label>
            <TimeInput
              name="agendamentoHoraInicioLocal"
              value={formData.agendamentoHoraInicioLocal}
              onChange={onFormChange}
              disabled={camposPrincipaisBloqueados || submitting}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Hora final
            </label>
            <TimeInput
              name="agendamentoHoraFimLocal"
              value={formData.agendamentoHoraFimLocal}
              onChange={onFormChange}
              disabled={camposPrincipaisBloqueados || submitting}
            />
          </div>
        </ResponsiveGrid>

        {!camposPrincipaisBloqueados && (
          <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {isCancelavel ? (
                <Button
                  type="button"
                  variant="danger"
                  onClick={onAbrirCancelamento}
                  disabled={submitting}
                >
                  <FontAwesomeIcon icon={faBan} />
                  Cancelar OS
                </Button>
              ) : null}
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={onSalvarAlteracoes}
                disabled={submitting}
              >
                <FontAwesomeIcon icon={faSave} />
                {submitting ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </PageSection>
  );
}

InformacoesManutencaoSection.propTypes = {
  manutencao: PropTypes.object,
  formData: PropTypes.object.isRequired,
  onFormChange: PropTypes.func.isRequired,
  onSalvarAlteracoes: PropTypes.func.isRequired,
  onAbrirCancelamento: PropTypes.func.isRequired,
  camposPrincipaisBloqueados: PropTypes.bool,
  isCancelavel: PropTypes.bool,
  submitting: PropTypes.bool,
};

export default InformacoesManutencaoSection;