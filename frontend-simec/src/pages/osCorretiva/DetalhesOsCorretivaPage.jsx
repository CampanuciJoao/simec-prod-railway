import React from 'react';
import { useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faClipboardList, faTruck, faCheck, faBan, faRightLeft, faRotate } from '@fortawesome/free-solid-svg-icons';
import { useDetalhesOsCorretivaPage } from '@/hooks/osCorretiva/useDetalhesOsCorretivaPage';
import { useAuth } from '@/contexts/AuthContext';
import OsCorretivaTimeline from '@/components/osCorretiva/OsCorretivaTimeline';
import OsEquipamentoCard from '@/components/osCorretiva/OsEquipamentoCard';
import AdicionarNotaModal from '@/components/osCorretiva/AdicionarNotaModal';
import EditarNotaModal from '@/components/osCorretiva/EditarNotaModal';
import AgendarVisitaTerceiroModal from '@/components/osCorretiva/AgendarVisitaTerceiroModal';
import ReagendarVisitaModal from '@/components/osCorretiva/ReagendarVisitaModal';
import ConfirmacaoFinalVisitaCorretiva from '@/components/osCorretiva/ConfirmacaoFinalVisitaCorretiva';
import ConcluirOsModal from '@/components/osCorretiva/ConcluirOsModal';
import CancelarOsModal from '@/components/osCorretiva/CancelarOsModal';
import MoverOsEquipamentoModal from '@/components/osCorretiva/MoverOsEquipamentoModal';
import { PageLayout, PageState, Button, BackButton } from '@/components/ui';

const STATUS_COLORS = {
  Aberta: '#2563eb',
  EmAndamento: '#8b5cf6',
  AguardandoTerceiro: '#f97316',
  Concluida: '#16a34a',
  Cancelada: '#6b7280',
};

const TIPO_COLORS = {
  Ocorrencia: '#6366f1',
  Corretiva: '#dc2626',
};

function DetalhesOsCorretivaPage() {
  const { id } = useParams();
  const page = useDetalhesOsCorretivaPage(id);
  const { isAdmin } = useAuth();
  const { os } = page;
  const isEncerrada = os?.status === 'Concluida' || os?.status === 'Cancelada';


  if (page.loading) return <PageLayout padded><PageState loading /></PageLayout>;
  if (page.error || !os) return <PageLayout padded><PageState error={page.error || 'OS não encontrada.'} /></PageLayout>;

  // Libera "Registrar resultado": visita EmExecucao, ou Agendada com fim <= 30min
  const agora = new Date();
  const JANELA_MS = 30 * 60 * 1000;
  const visitaProximaOuVencida = os.visitas?.find(
    (v) =>
      v.dataHoraFimPrevista &&
      (v.status === 'EmExecucao' ||
        (v.status === 'Agendada' && new Date(v.dataHoraFimPrevista) - agora <= JANELA_MS))
  );

  // Visita ativa Agendada (sem ter chegado ainda) — habilita botao
  // "Reagendar visita" quando OS esta AguardandoTerceiro.
  const visitaAtivaAgendada = os.visitas?.find((v) => v.status === 'Agendada') || null;

  return (
    <>
      <AdicionarNotaModal
        isOpen={page.notaModal.isOpen}
        onClose={page.notaModal.closeModal}
        onConfirm={page.handleAdicionarNota}
        submitting={page.submitting}
        fieldErrors={page.fieldErrors}
      />

      <EditarNotaModal
        isOpen={page.editarNotaModal.isOpen}
        onClose={page.editarNotaModal.closeModal}
        onConfirm={page.handleEditarNota}
        evento={page.editarNotaModal.modalData}
        timezone={os?.equipamento?.unidade?.timezone}
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

      <ReagendarVisitaModal
        isOpen={page.reagendarVisitaModal.isOpen}
        onClose={page.reagendarVisitaModal.closeModal}
        onConfirm={page.handleReagendarVisita}
        visita={page.reagendarVisitaModal.modalData}
        timezone={os?.equipamento?.unidade?.timezone}
        submitting={page.submitting}
        fieldErrors={page.fieldErrors}
      />

      <ConcluirOsModal
        isOpen={page.concluirModal.isOpen}
        onClose={page.concluirModal.closeModal}
        onConfirm={page.handleConcluirOs}
        submitting={page.submitting}
        timezone={os?.equipamento?.unidade?.timezone}
      />

      <CancelarOsModal
        isOpen={page.cancelarModal.isOpen}
        onClose={page.cancelarModal.closeModal}
        onConfirm={page.handleCancelarOs}
        submitting={page.submitting}
      />

      <MoverOsEquipamentoModal
        isOpen={page.moverModal.isOpen}
        onClose={page.moverModal.closeModal}
        onConfirm={page.handleMoverEquipamento}
        submitting={page.submitting}
        fieldErrors={page.fieldErrors}
        osAtual={os}
      />

      <PageLayout padded>
        {/* Cabeçalho */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <BackButton fallbackTo="/manutencoes" />
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

            {!isEncerrada && (
              <>
                <Button type="button" variant="secondary" onClick={page.notaModal.openModal}>
                  <FontAwesomeIcon icon={faClipboardList} />
                  Registrar andamento
                </Button>

                {/* Mover OS: aberta no equipamento errado — só status iniciais */}
                {(os.status === 'Aberta' || os.status === 'EmAndamento') && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={page.moverModal.openModal}
                    title="Reatribuir esta OS para outro equipamento"
                  >
                    <FontAwesomeIcon icon={faRightLeft} />
                    Mover OS
                  </Button>
                )}

                {/* Agendar visita: só disponível se não está aguardando terceiro */}
                {os.status !== 'AguardandoTerceiro' && (
                  <Button type="button" variant="secondary" onClick={page.visitaModal.openModal}>
                    <FontAwesomeIcon icon={faTruck} />
                    Agendar visita
                  </Button>
                )}

                {/* Reagendar visita: quando OS esta AguardandoTerceiro
                    e existe visita Agendada (nao reagenda EmExecucao —
                    pra isso use Prazo Estendido no resultado da visita). */}
                {os.status === 'AguardandoTerceiro' && visitaAtivaAgendada && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => page.reagendarVisitaModal.openModal(visitaAtivaAgendada)}
                    title="Reagendar a visita atual (mantem a OS aberta)"
                  >
                    <FontAwesomeIcon icon={faRotate} />
                    Reagendar visita
                  </Button>
                )}

                {/* Concluir OS: apenas quando não há visita pendente */}
                {os.status !== 'AguardandoTerceiro' && (
                  <Button type="button" variant="success" onClick={page.concluirModal.openModal}>
                    <FontAwesomeIcon icon={faCheck} />
                    Concluir OS
                  </Button>
                )}

                <Button type="button" variant="danger" onClick={page.cancelarModal.openModal}>
                  <FontAwesomeIcon icon={faBan} />
                  Cancelar OS
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <OsEquipamentoCard os={os} />
          </div>
          <div className="lg:col-span-2">
            <OsCorretivaTimeline
              timeline={os.timeline || []}
              timezone={os.equipamento?.unidade?.timezone}
              onEditarEvento={
                isAdmin
                  ? (evento) => page.editarNotaModal.openModal(evento)
                  : undefined
              }
            />
          </div>
        </div>

        {visitaProximaOuVencida && !isEncerrada && (
          <div className="mt-6">
            <ConfirmacaoFinalVisitaCorretiva
              visita={visitaProximaOuVencida}
              onConfirm={(dados) => page.handleRegistrarResultado(dados, visitaProximaOuVencida.id)}
              submitting={page.submitting}
              fieldErrors={page.fieldErrors}
            />
          </div>
        )}
      </PageLayout>
    </>
  );
}

export default DetalhesOsCorretivaPage;
