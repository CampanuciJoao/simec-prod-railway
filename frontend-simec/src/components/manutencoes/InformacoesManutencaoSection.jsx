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
  Button,
  DateInput,
  Input,
  PageSection,
  ResponsiveGrid,
  Select,
  TimeInput,
  Textarea,
  InfoCard,
  StatusBadge,
} from '@/components/ui';

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
      {/* HEADER INFO */}
      <div className="mb-6">
        <ResponsiveGrid preset="cards">
          <InfoCard icon={faWrench} label="OS / Status">
            <div className="flex flex-wrap items-center gap-3">
              <span style={{ fontWeight: 700 }}>
                {manutencao?.numeroOS || '-'}
              </span>

              <StatusBadge value={manutencao?.status} />
            </div>
          </InfoCard>

          <InfoCard icon={faHospital} label="Unidade">
            {manutencao?.equipamento?.unidade?.nomeSistema || '-'}
          </InfoCard>

          <InfoCard icon={faHashtag} label="Equipamento">
            <div className="flex flex-col gap-1">
              <Link
                to={`/equipamentos/${manutencao?.equipamentoId || ''}`}
              >
                {manutencao?.equipamento?.modelo || '-'}
              </Link>

              <span>
                Tag: {manutencao?.equipamento?.tag || '-'}
              </span>
            </div>
          </InfoCard>

          <InfoCard icon={faCalendarDays} label="Agendamento local">
            <div className="flex flex-col gap-1">
              <span>{manutencao?.agendamentoLocal?.data || '-'}</span>
              <span>
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

      {/* FORM */}
      <div className="space-y-6">
        <Textarea
          label="Descrição do serviço"
          name="descricaoProblemaServico"
          value={formData.descricaoProblemaServico}
          onChange={onFormChange}
          disabled={camposPrincipaisBloqueados || submitting}
          rows={4}
        />

        <ResponsiveGrid preset="form">
          <Input
            label="Técnico responsável"
            name="tecnicoResponsavel"
            value={formData.tecnicoResponsavel}
            onChange={onFormChange}
            disabled={camposPrincipaisBloqueados || submitting}
          />

          <Input
            label="Número do chamado"
            name="numeroChamado"
            value={formData.numeroChamado}
            onChange={onFormChange}
            disabled={camposPrincipaisBloqueados || submitting}
          />

          <Select
            label="Status"
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
        </ResponsiveGrid>

        <ResponsiveGrid preset="form">
          <DateInput
            label="Data do agendamento"
            name="agendamentoDataLocal"
            value={formData.agendamentoDataLocal}
            onChange={onFormChange}
            disabled={camposPrincipaisBloqueados || submitting}
          />

          <TimeInput
            label="Hora inicial"
            name="agendamentoHoraInicioLocal"
            value={formData.agendamentoHoraInicioLocal}
            onChange={onFormChange}
            disabled={camposPrincipaisBloqueados || submitting}
          />

          <TimeInput
            label="Hora final"
            name="agendamentoHoraFimLocal"
            value={formData.agendamentoHoraFimLocal}
            onChange={onFormChange}
            disabled={camposPrincipaisBloqueados || submitting}
          />
        </ResponsiveGrid>

        {!camposPrincipaisBloqueados && (
          <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
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

export default InformacoesManutencaoSection;