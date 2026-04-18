import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBan,
  faCalendarDays,
  faClock,
  faHashtag,
  faHospital,
  faSave,
  faWrench,
} from '@fortawesome/free-solid-svg-icons';

import {
  Button,
  DateInput,
  InfoCard,
  Input,
  PageSection,
  ResponsiveGrid,
  StatusBadge,
  Textarea,
  TimeInput,
} from '@/components/ui';

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
      title="Informacoes da manutencao"
      description="Edite os dados operacionais da OS sem quebrar o fluxo oficial de execucao."
    >
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
              <Link to={`/equipamentos/${manutencao?.equipamentoId || ''}`}>
                {manutencao?.equipamento?.modelo || '-'}
              </Link>

              <span>Tag: {manutencao?.equipamento?.tag || '-'}</span>
            </div>
          </InfoCard>

          <InfoCard icon={faCalendarDays} label="Inicio programado">
            <div className="flex flex-col gap-1">
              <span>{manutencao?.agendamentoLocal?.dataInicio || '-'}</span>
              <span>{manutencao?.agendamentoLocal?.horaInicio || '--:--'}</span>
            </div>
          </InfoCard>

          <InfoCard icon={faClock} label="Fim programado">
            <div className="flex flex-col gap-1">
              <span>{manutencao?.agendamentoLocal?.dataFim || '-'}</span>
              <span>{manutencao?.agendamentoLocal?.horaFim || '--:--'}</span>
            </div>
          </InfoCard>

          <InfoCard icon={faHashtag} label="Numero do chamado">
            {manutencao?.numeroChamado || '---'}
          </InfoCard>
        </ResponsiveGrid>
      </div>

      <div className="space-y-6">
        <Textarea
          label="Descricao do servico"
          name="descricaoProblemaServico"
          value={formData.descricaoProblemaServico}
          onChange={onFormChange}
          disabled={camposPrincipaisBloqueados || submitting}
          rows={4}
        />

        <ResponsiveGrid preset="form">
          <Input
            label="Tecnico responsavel"
            name="tecnicoResponsavel"
            value={formData.tecnicoResponsavel}
            onChange={onFormChange}
            disabled={camposPrincipaisBloqueados || submitting}
          />

          <Input
            label="Numero do chamado"
            name="numeroChamado"
            value={formData.numeroChamado}
            onChange={onFormChange}
            disabled={camposPrincipaisBloqueados || submitting}
          />
        </ResponsiveGrid>

        <ResponsiveGrid preset="form">
          <DateInput
            label="Data de inicio"
            name="agendamentoDataInicioLocal"
            value={formData.agendamentoDataInicioLocal}
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

          <DateInput
            label="Data de termino"
            name="agendamentoDataFimLocal"
            value={formData.agendamentoDataFimLocal}
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

        {!camposPrincipaisBloqueados ? (
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
                {submitting ? 'Salvando...' : 'Salvar alteracoes'}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </PageSection>
  );
}

InformacoesManutencaoSection.propTypes = {
  manutencao: PropTypes.object,
  formData: PropTypes.object,
  onFormChange: PropTypes.func.isRequired,
  onSalvarAlteracoes: PropTypes.func.isRequired,
  onAbrirCancelamento: PropTypes.func.isRequired,
  camposPrincipaisBloqueados: PropTypes.bool,
  isCancelavel: PropTypes.bool,
  submitting: PropTypes.bool,
};

export default InformacoesManutencaoSection;
