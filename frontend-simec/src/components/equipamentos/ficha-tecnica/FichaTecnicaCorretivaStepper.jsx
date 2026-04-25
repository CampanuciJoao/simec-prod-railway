import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronDown,
  faChevronUp,
  faExternalLinkAlt,
  faFilePdf,
  faPaperPlane,
  faTools,
  faWrench,
} from '@fortawesome/free-solid-svg-icons';

import { Badge, Button, Card, PageState, PageSection, Textarea } from '@/components/ui';
import { formatarDataHora } from '@/utils/timeUtils';
import ConfirmacaoFinalManutencao from '@/components/manutencoes/ConfirmacaoFinalManutencao';
import AgendarVisitaModal from '@/components/manutencoes/AgendarVisitaModal';

const STATUS_LABEL = {
  Pendente: 'Em triagem',
  Agendada: 'Agendada',
  EmAndamento: 'Em andamento',
  AguardandoConfirmacao: 'Aguardando confirmacao',
  Concluida: 'Concluida',
  Cancelada: 'Cancelada',
};

const STATUS_VARIANT = {
  Pendente: 'yellow',
  Agendada: 'blue',
  EmAndamento: 'purple',
  AguardandoConfirmacao: 'orange',
  Concluida: 'green',
  Cancelada: 'slate',
};

function FichaTecnicaCorretivaItem({
  item,
  onAdicionarNota,
  onAgendarVisita,
  onResolverInternamente,
  onConcluirAcao,
  onImprimir,
  submittingId,
}) {
  const navigate = useNavigate();
  const [expandido, setExpandido] = useState(false);
  const [nota, setNota] = useState('');
  const [agendarOpen, setAgendarOpen] = useState(false);
  const [resolverOpen, setResolverOpen] = useState(false);
  const [resolucaoTexto, setResolucaoTexto] = useState('');

  // Estado para ConfirmacaoFinalManutencao
  const [confirmMode, setConfirmMode] = useState(null);
  const [manutencaoRealizada, setManutencaoRealizada] = useState(null);
  const [dataTerminoReal, setDataTerminoReal] = useState('');
  const [novaPrevisao, setNovaPrevisao] = useState('');
  const [observacaoDecisao, setObservacaoDecisao] = useState('');

  const isSubmitting = submittingId === item.id;
  const mostrarConfirmacaoFinal = ['EmAndamento', 'AguardandoConfirmacao'].includes(item.status);

  const canConfirm = (() => {
    if (!confirmMode) return false;
    if (confirmMode === 'cancelar') return !!observacaoDecisao.trim();
    if (confirmMode === 'concluir') {
      return (
        manutencaoRealizada !== null &&
        !!dataTerminoReal &&
        (manutencaoRealizada ? true : !!observacaoDecisao.trim())
      );
    }
    if (confirmMode === 'prorrogar') {
      return manutencaoRealizada !== null && !!novaPrevisao && !!observacaoDecisao.trim();
    }
    return false;
  })();

  async function handleEnviarNota() {
    if (!nota.trim()) return;
    const ok = await onAdicionarNota(item.id, nota.trim());
    if (ok) setNota('');
  }

  async function handleAgendarVisita(form) {
    const ok = await onAgendarVisita(item.id, form);
    if (ok) setAgendarOpen(false);
  }

  async function handleResolverInternamente() {
    if (!resolucaoTexto.trim()) return;
    const ok = await onResolverInternamente(item.id, resolucaoTexto.trim());
    if (ok) {
      setResolverOpen(false);
      setResolucaoTexto('');
    }
  }

  async function handleConfirmacaoFinal() {
    const ok = await onConcluirAcao(item.id, {
      acao: confirmMode,
      dataTerminoReal,
      novaPrevisao,
      observacao: observacaoDecisao,
      manutencaoRealizada,
      equipamentoOperante: confirmMode === 'concluir',
    });
    if (ok) {
      setConfirmMode(null);
      setManutencaoRealizada(null);
      setDataTerminoReal('');
      setNovaPrevisao('');
      setObservacaoDecisao('');
    }
  }

  return (
    <>
      <Card padded={false} className="overflow-hidden rounded-2xl" surface="default">
        <button
          type="button"
          className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left"
          onClick={() => setExpandido((prev) => !prev)}
        >
          <div className="flex min-w-0 items-start gap-3">
            <span
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{
                backgroundColor: item.status === 'Concluida'
                  ? 'var(--color-success-soft)'
                  : item.status === 'Cancelada'
                    ? 'var(--bg-surface-soft)'
                    : 'var(--color-warning-soft)',
                color: item.status === 'Concluida'
                  ? 'var(--color-success)'
                  : item.status === 'Cancelada'
                    ? 'var(--text-muted)'
                    : 'var(--color-warning)',
              }}
            >
              <FontAwesomeIcon icon={item.status === 'Concluida' ? faTools : faWrench} />
            </span>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {item.numeroOS}
                </p>

                <Badge variant={STATUS_VARIANT[item.status] || 'slate'}>
                  {STATUS_LABEL[item.status] || item.status}
                </Badge>

                {item.numeroChamado ? (
                  <Badge variant="blue">Chamado: {item.numeroChamado}</Badge>
                ) : null}
              </div>

              <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {item.descricaoProblemaServico || 'Sem descricao informada.'}
              </p>

              <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                Aberta em {formatarDataHora(item.createdAt)}
                {item.tecnicoResponsavel ? ` · Tecnico: ${item.tecnicoResponsavel}` : ''}
              </p>
            </div>
          </div>

          <span className="pt-1" style={{ color: 'var(--text-muted)' }}>
            <FontAwesomeIcon icon={expandido ? faChevronUp : faChevronDown} />
          </span>
        </button>

        {expandido ? (
          <div
            className="px-4 py-4 space-y-4"
            style={{
              borderTop: '1px solid var(--section-header-border)',
              backgroundColor: 'var(--bg-surface-soft)',
            }}
          >
            {/* Timeline de notas */}
            <div>
              <p
                className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em]"
                style={{ color: 'var(--text-muted)' }}
              >
                Andamento ({(item.notasAndamento || []).length} registros)
              </p>

              {(item.notasAndamento || []).length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Nenhum registro de andamento ainda.
                </p>
              ) : (
                <div className="space-y-2">
                  {(item.notasAndamento || []).map((nota) => (
                    <div
                      key={nota.id}
                      className="rounded-xl border px-3 py-3"
                      style={{
                        borderColor: 'var(--border-soft)',
                        backgroundColor: 'var(--bg-surface)',
                      }}
                    >
                      <p className="text-sm leading-6" style={{ color: 'var(--text-primary)' }}>
                        {nota.nota}
                      </p>
                      <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {formatarDataHora(nota.data)}
                        {nota.autor?.nome ? ` · ${nota.autor.nome}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Adicionar nota — disponivel em qualquer status exceto Concluida/Cancelada */}
            {!['Concluida', 'Cancelada'].includes(item.status) ? (
              <div className="space-y-2">
                <Textarea
                  label="Adicionar registro de andamento"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  rows={2}
                  placeholder='Ex.: "Entrei em contato com a colaboradora X, solicitei reiniciar o equipamento."'
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleEnviarNota}
                    disabled={!nota.trim() || isSubmitting}
                  >
                    <FontAwesomeIcon icon={faPaperPlane} />
                    {isSubmitting ? 'Salvando...' : 'Salvar registro'}
                  </Button>
                </div>
              </div>
            ) : null}

            {/* Acoes por status */}
            {item.status === 'Pendente' ? (
              <div className="flex flex-wrap gap-2 border-t pt-4" style={{ borderColor: 'var(--border-soft)' }}>
                <Button
                  type="button"
                  onClick={() => setAgendarOpen(true)}
                  disabled={isSubmitting}
                >
                  Agendar visita tecnica
                </Button>

                {!resolverOpen ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setResolverOpen(true)}
                    disabled={isSubmitting}
                  >
                    Resolver internamente
                  </Button>
                ) : (
                  <div className="w-full space-y-2">
                    <Textarea
                      label="Como foi resolvido?"
                      value={resolucaoTexto}
                      onChange={(e) => setResolucaoTexto(e.target.value)}
                      rows={2}
                      placeholder="Descreva como o problema foi resolvido sem necessidade de visita."
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setResolverOpen(false);
                          setResolucaoTexto('');
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        variant="success"
                        onClick={handleResolverInternamente}
                        disabled={!resolucaoTexto.trim() || isSubmitting}
                      >
                        {isSubmitting ? 'Salvando...' : 'Confirmar resolucao'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* ConfirmacaoFinal para OS com visita agendada */}
            {mostrarConfirmacaoFinal ? (
              <div className="border-t pt-4" style={{ borderColor: 'var(--border-soft)' }}>
                <ConfirmacaoFinalManutencao
                  visible
                  confirmMode={confirmMode}
                  setConfirmMode={setConfirmMode}
                  manutencaoRealizada={manutencaoRealizada}
                  setManutencaoRealizada={setManutencaoRealizada}
                  dataTerminoReal={dataTerminoReal}
                  setDataTerminoReal={setDataTerminoReal}
                  novaPrevisao={novaPrevisao}
                  setNovaPrevisao={setNovaPrevisao}
                  observacaoDecisao={observacaoDecisao}
                  setObservacaoDecisao={setObservacaoDecisao}
                  onConfirm={handleConfirmacaoFinal}
                  canConfirm={canConfirm}
                  submitting={isSubmitting}
                />
              </div>
            ) : null}

            {/* Acoes de Concluida */}
            {item.status === 'Concluida' ? (
              <div className="flex flex-wrap gap-2 border-t pt-4" style={{ borderColor: 'var(--border-soft)' }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onImprimir(item.id)}
                  disabled={isSubmitting}
                >
                  <FontAwesomeIcon icon={faFilePdf} />
                  Imprimir OS
                </Button>
              </div>
            ) : null}

            {/* Link detalhes completos */}
            <div className="flex justify-end border-t pt-3" style={{ borderColor: 'var(--border-soft)' }}>
              <button
                type="button"
                className="flex items-center gap-1 text-xs"
                style={{ color: 'var(--brand-primary)' }}
                onClick={() => navigate(`/manutencoes/${item.id}`)}
              >
                Ver detalhes completos
                <FontAwesomeIcon icon={faExternalLinkAlt} />
              </button>
            </div>
          </div>
        ) : null}
      </Card>

      <AgendarVisitaModal
        isOpen={agendarOpen}
        onClose={() => setAgendarOpen(false)}
        onConfirm={handleAgendarVisita}
        submitting={isSubmitting}
      />
    </>
  );
}

FichaTecnicaCorretivaItem.propTypes = {
  item: PropTypes.object.isRequired,
  onAdicionarNota: PropTypes.func.isRequired,
  onAgendarVisita: PropTypes.func.isRequired,
  onResolverInternamente: PropTypes.func.isRequired,
  onConcluirAcao: PropTypes.func.isRequired,
  onImprimir: PropTypes.func.isRequired,
  submittingId: PropTypes.string,
};

function FichaTecnicaCorretivaStepper({
  corretivas,
  onAdicionarNota,
  onAgendarVisita,
  onResolverInternamente,
  onConcluirAcao,
  onImprimir,
  submittingId,
  onRegistrarProblema,
  submittingNova,
}) {
  const abertas = corretivas.filter((c) =>
    ['Pendente', 'Agendada', 'EmAndamento', 'AguardandoConfirmacao'].includes(c.status)
  );
  const encerradas = corretivas.filter((c) =>
    ['Concluida', 'Cancelada'].includes(c.status)
  );

  return (
    <PageSection
      title={`Registros corretivos (${corretivas.length})`}
      description="Cada registro acompanha o ciclo completo: da triagem inicial ate a conclusao da OS."
      actions={
        <Button type="button" onClick={onRegistrarProblema} disabled={submittingNova}>
          {submittingNova ? 'Registrando...' : '+ Registrar problema'}
        </Button>
      }
    >
      {corretivas.length === 0 ? (
        <PageState isEmpty emptyMessage="Nenhum registro corretivo para este equipamento." />
      ) : (
        <div className="space-y-6">
          {abertas.length > 0 ? (
            <div className="space-y-3">
              {abertas.map((item) => (
                <FichaTecnicaCorretivaItem
                  key={item.id}
                  item={item}
                  onAdicionarNota={onAdicionarNota}
                  onAgendarVisita={onAgendarVisita}
                  onResolverInternamente={onResolverInternamente}
                  onConcluirAcao={onConcluirAcao}
                  onImprimir={onImprimir}
                  submittingId={submittingId}
                />
              ))}
            </div>
          ) : null}

          {encerradas.length > 0 ? (
            <div className="space-y-3">
              <p
                className="text-[11px] font-bold uppercase tracking-[0.14em]"
                style={{ color: 'var(--text-muted)' }}
              >
                Historico encerrado ({encerradas.length})
              </p>
              {encerradas.map((item) => (
                <FichaTecnicaCorretivaItem
                  key={item.id}
                  item={item}
                  onAdicionarNota={onAdicionarNota}
                  onAgendarVisita={onAgendarVisita}
                  onResolverInternamente={onResolverInternamente}
                  onConcluirAcao={onConcluirAcao}
                  onImprimir={onImprimir}
                  submittingId={submittingId}
                />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </PageSection>
  );
}

FichaTecnicaCorretivaStepper.propTypes = {
  corretivas: PropTypes.arrayOf(PropTypes.object).isRequired,
  onAdicionarNota: PropTypes.func.isRequired,
  onAgendarVisita: PropTypes.func.isRequired,
  onResolverInternamente: PropTypes.func.isRequired,
  onConcluirAcao: PropTypes.func.isRequired,
  onImprimir: PropTypes.func.isRequired,
  submittingId: PropTypes.string,
  onRegistrarProblema: PropTypes.func.isRequired,
  submittingNova: PropTypes.bool,
};

export default FichaTecnicaCorretivaStepper;
