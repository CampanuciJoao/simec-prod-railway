import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faFilePdf, faPlus, faTruck, faCheck, faUserCheck } from '@fortawesome/free-solid-svg-icons';
import { useDetalhesOsCorretivaPage } from '@/hooks/osCorretiva/useDetalhesOsCorretivaPage';
import OsCorretivaTimeline from '@/components/osCorretiva/OsCorretivaTimeline';
import OsEquipamentoCard from '@/components/osCorretiva/OsEquipamentoCard';
import AdicionarNotaModal from '@/components/osCorretiva/AdicionarNotaModal';
import AgendarVisitaTerceiroModal from '@/components/osCorretiva/AgendarVisitaTerceiroModal';
import RegistrarResultadoVisitaModal from '@/components/osCorretiva/RegistrarResultadoVisitaModal';
import ConcluirOsModal from '@/components/osCorretiva/ConcluirOsModal';
import { PageLayout, PageState, Button, ModalConfirmacao } from '@/components/ui';

const STATUS_COLORS = {
  Aberta: '#2563eb',
  EmAndamento: '#8b5cf6',
  AguardandoTerceiro: '#f97316',
  Concluida: '#16a34a',
};

const TIPO_COLORS = {
  Ocorrencia: '#6366f1',
  Corretiva: '#dc2626',
};

function DetalhesOsCorretivaPage() {
  const { id } = useParams();
  const page = useDetalhesOsCorretivaPage(id);
  const { os } = page;
  const isConcluida = os?.status === 'Concluida';

  if (page.loading) return <PageLayout padded><PageState loading /></PageLayout>;
  if (page.error || !os) return <PageLayout padded><PageState error={page.error || 'OS não encontrada.'} /></PageLayout>;

  // Visita aguardando chegada (ainda não confirmada)
  const visitaAgendada = os.visitas?.find((v) => v.status === 'Agendada');
  // Visita já em execução (chegada confirmada) — libera registrar resultado
  const visitaEmExecucao = os.visitas?.find((v) => v.status === 'EmExecucao');

  return (
    <>
      <AdicionarNotaModal
        isOpen={page.notaModal.isOpen}
        onClose={page.notaModal.closeModal}
        onConfirm={page.handleAdicionarNota}
        submitting={page.submitting}
        fieldErrors={page.fieldErrors}
      />

      <AgendarVisitaTerceiroModal
        isOpen={page.visitaModal.isOpen}
        onClose={page.visitaModal.closeModal}
        onConfirm={page.handleAgendarVisita}
        submitting={page.submitting}
        fieldErrors={page.fieldErrors}
      />

      <ModalConfirmacao
        isOpen={page.confirmarChegadaModal.isOpen}
        onClose={page.confirmarChegadaModal.closeModal}
        onConfirm={page.handleConfirmarChegada}
        title="Confirmar chegada do técnico"
        message={
          visitaAgendada
            ? `Confirmar que o técnico de ${visitaAgendada.prestadorNome} chegou e a visita está em execução?`
            : 'Confirmar chegada do técnico e iniciar a visita?'
        }
        confirmText="Confirmar chegada"
        submitting={page.submitting}
      />

      <RegistrarResultadoVisitaModal
        isOpen={page.resultadoModal.isOpen}
        onClose={page.resultadoModal.closeModal}
        onConfirm={page.handleRegistrarResultado}
        submitting={page.submitting}
        fieldErrors={page.fieldErrors}
        visita={page.resultadoModal.modalData}
      />

      <ConcluirOsModal
        isOpen={page.concluirModal.isOpen}
        onClose={page.concluirModal.closeModal}
        onConfirm={page.handleConcluirOs}
        submitting={page.submitting}
      />

      <PageLayout padded>
        {/* Cabeçalho */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link to="/os-corretiva">
              <Button type="button" variant="secondary">
                <FontAwesomeIcon icon={faArrowLeft} />
              </Button>
            </Link>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {os.numeroOS}
                </h1>
                <span
                  className="rounded-full px-3 py-0.5 text-xs font-semibold text-white"
                  style={{ backgroundColor: TIPO_COLORS[os.tipo] || '#6b7280' }}
                >
                  {os.tipoLabel || os.tipo}
                </span>
                <span
                  className="rounded-full px-3 py-0.5 text-xs font-semibold text-white"
                  style={{ backgroundColor: STATUS_COLORS[os.status] || '#64748b' }}
                >
                  {os.statusLabel}
                </span>
              </div>
              <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                Solicitante: {os.solicitante}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" onClick={page.handleExportarPdf}>
              <FontAwesomeIcon icon={faFilePdf} />
              Exportar PDF
            </Button>

            {!isConcluida && (
              <>
                <Button type="button" variant="secondary" onClick={page.notaModal.openModal}>
                  <FontAwesomeIcon icon={faPlus} />
                  Nota
                </Button>

                {/* Agendar visita: só disponível se não está aguardando terceiro */}
                {os.status !== 'AguardandoTerceiro' && (
                  <Button type="button" variant="secondary" onClick={page.visitaModal.openModal}>
                    <FontAwesomeIcon icon={faTruck} />
                    Agendar visita
                  </Button>
                )}

                {/* Confirmar chegada: apenas quando há visita Agendada */}
                {visitaAgendada && !visitaEmExecucao && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => page.confirmarChegadaModal.openModal({ visitaId: visitaAgendada.id })}
                  >
                    <FontAwesomeIcon icon={faUserCheck} />
                    Confirmar chegada
                  </Button>
                )}

                {/* Registrar resultado: apenas quando a visita está Em execução */}
                {visitaEmExecucao && (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => page.resultadoModal.openModal({ visitaId: visitaEmExecucao.id, visita: visitaEmExecucao })}
                  >
                    <FontAwesomeIcon icon={faCheck} />
                    Registrar resultado
                  </Button>
                )}

                {/* Concluir OS: apenas quando não há visita pendente */}
                {os.status !== 'AguardandoTerceiro' && (
                  <Button type="button" variant="success" onClick={page.concluirModal.openModal}>
                    <FontAwesomeIcon icon={faCheck} />
                    Concluir OS
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <OsEquipamentoCard os={os} />
          </div>
          <div className="lg:col-span-2">
            <OsCorretivaTimeline timeline={os.timeline || []} />
          </div>
        </div>
      </PageLayout>
    </>
  );
}

export default DetalhesOsCorretivaPage;
