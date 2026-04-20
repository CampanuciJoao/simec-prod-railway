import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBan,
  faSave,
} from '@fortawesome/free-solid-svg-icons';

import {
  Button,
  DateInput,
  Input,
  PageSection,
  ResponsiveGrid,
  Textarea,
  TimeInput,
} from '@/components/ui';

function montarAgendamentoResumo(formData) {
  const inicio = [formData?.agendamentoDataInicioLocal, formData?.agendamentoHoraInicioLocal]
    .filter(Boolean)
    .join(' ');
  const fim = [formData?.agendamentoDataFimLocal, formData?.agendamentoHoraFimLocal]
    .filter(Boolean)
    .join(' ');

  if (!inicio && !fim) return null;
  if (inicio && fim) return `${inicio} ate ${fim}`;
  return inicio || fim;
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
  const resumoEquipamento = [
    manutencao?.equipamento?.modelo,
    manutencao?.equipamento?.tag ? `TAG ${manutencao.equipamento.tag}` : null,
    manutencao?.equipamento?.unidade?.nomeSistema,
  ]
    .filter(Boolean)
    .join(' • ');

  const resumoAgendamento = montarAgendamentoResumo(formData);
  const mostrarResumo = Boolean(resumoEquipamento || resumoAgendamento);
  const isCorretiva = manutencao?.tipo === 'Corretiva';

  return (
    <PageSection
      title="Informacoes da manutencao"
      description="Edite os dados operacionais da OS sem repetir informacoes que ja aparecem no cabecalho."
    >
      {mostrarResumo ? (
        <div
          className="mb-6 rounded-2xl border px-4 py-3 text-sm"
          style={{
            backgroundColor: 'var(--bg-surface-soft)',
            borderColor: 'var(--border-soft)',
            color: 'var(--text-secondary)',
          }}
        >
          {resumoEquipamento ? (
            <p>
              <strong style={{ color: 'var(--text-primary)' }}>Equipamento:</strong>{' '}
              {resumoEquipamento}
            </p>
          ) : null}

          {resumoAgendamento ? (
            <p className={resumoEquipamento ? 'mt-1' : ''}>
              <strong style={{ color: 'var(--text-primary)' }}>Agendamento:</strong>{' '}
              {resumoAgendamento}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-6">
        <Textarea
          label="Descricao do servico"
          name="descricaoProblemaServico"
          value={formData.descricaoProblemaServico}
          onChange={onFormChange}
          disabled={camposPrincipaisBloqueados || submitting}
          rows={4}
          required={isCorretiva}
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
            required={isCorretiva}
          />
        </ResponsiveGrid>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-4">
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
              required
            />
          </div>

          <div className="space-y-4">
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
              required
            />
          </div>
        </div>

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
