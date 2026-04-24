import { useNavigate } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  FormSection,
  Card,
  Button,
  PageState,
  ModalConfirmacao,
  Textarea,
  LoadingState,
} from '@/components/ui';
import {
  faFileInvoiceDollar,
  faArrowLeft,
  faPencil,
  faFilePdf,
  faCheck,
  faTimes,
  faPaperPlane,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { OrcamentoStatusBadge, OrcamentoTabelaVisualizacao } from '@/components/orcamentos';
import { useDetalhesOrcamento } from '@/hooks/orcamentos/useDetalhesOrcamento';
import { useAuth } from '@/contexts/AuthContext';
import { exportarOrcamentoPDF } from '@/services/api/pdfApi';

const TIPO_LABEL = { PRODUTO: 'Produto', SERVICO: 'Serviço', MISTO: 'Misto' };

function DetalhesOrcamentoPage() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const isAdmin = usuario?.role === 'admin' || usuario?.role === 'superadmin';
  const p = useDetalhesOrcamento();

  if (p.loading) return <LoadingState />;
  if (!p.orcamento) return <PageState empty emptyTitle="Orçamento não encontrado" />;

  const orc = p.orcamento;

  return (
    <PageLayout padded>
      <div className="flex flex-col gap-5">
        {/* ── Cabeçalho ── */}
        <PageHeader
          icon={faFileInvoiceDollar}
          title={orc.titulo}
          subtitle={`${TIPO_LABEL[orc.tipo] || orc.tipo}${orc.unidade ? ` · ${orc.unidade.nomeFantasia || orc.unidade.nomeSistema}` : ''}`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => navigate('/orcamentos')}>
                <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
                Voltar
              </Button>

              {orc.status === 'RASCUNHO' && (
                <Button variant="secondary" size="sm" onClick={p.irParaEditar}>
                  <FontAwesomeIcon icon={faPencil} className="mr-2" />
                  Editar
                </Button>
              )}

              {orc.status === 'RASCUNHO' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => p.enviarModal.openModal()}
                  disabled={p.actionLoading}
                >
                  <FontAwesomeIcon icon={faPaperPlane} className="mr-2" />
                  Enviar para Aprovação
                </Button>
              )}

              {isAdmin && orc.status === 'PENDENTE' && (
                <>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => p.aprovarModal.openModal()}
                    disabled={p.actionLoading}
                  >
                    <FontAwesomeIcon icon={faCheck} className="mr-2" />
                    Aprovar
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => p.rejeitarModal.openModal()}
                    disabled={p.actionLoading}
                  >
                    <FontAwesomeIcon icon={faTimes} className="mr-2" />
                    Rejeitar
                  </Button>
                </>
              )}

              {(orc.status === 'PENDENTE' || orc.status === 'APROVADO') && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => exportarOrcamentoPDF(orc.id)}
                >
                  <FontAwesomeIcon icon={faFilePdf} className="mr-2" />
                  Baixar PDF
                </Button>
              )}
            </div>
          }
        />

        {/* ── Status e metadados ── */}
        <Card className="rounded-3xl">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Status
              </p>
              <div className="mt-1">
                <OrcamentoStatusBadge status={orc.status} />
              </div>
            </div>
            {orc.unidade && (
              <div>
                <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Unidade
                </p>
                <p className="mt-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {orc.unidade.nomeFantasia || orc.unidade.nomeSistema}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Criado por
              </p>
              <p className="mt-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {orc.criadoPor?.nome || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Data
              </p>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {new Date(orc.createdAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
            {orc.aprovadoPor && (
              <div>
                <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  {orc.status === 'APROVADO' ? 'Aprovado por' : 'Revisado por'}
                </p>
                <p className="mt-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {orc.aprovadoPor.nome}
                  {orc.dataAprovacao && (
                    <span className="ml-2 font-normal" style={{ color: 'var(--text-muted)' }}>
                      em {new Date(orc.dataAprovacao).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </p>
              </div>
            )}
            {orc.motivoRejeicao && (
              <div>
                <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-danger)' }}>
                  Motivo da rejeição
                </p>
                <p className="mt-1 text-sm" style={{ color: 'var(--color-danger)' }}>
                  {orc.motivoRejeicao}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* ── Tabela comparativa ── */}
        <FormSection title="Comparativo de Fornecedores">
          <OrcamentoTabelaVisualizacao
            orcamento={orc}
            calcularTotalFornecedor={p.calcularTotalFornecedor}
          />
        </FormSection>

        {/* ── Observação ── */}
        {orc.observacao && (
          <FormSection title="Observação / Justificativa">
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {orc.observacao}
            </p>
          </FormSection>
        )}

        {/* ── Rodapé de assinatura ── */}
        {(orc.status === 'APROVADO' || orc.status === 'PENDENTE') && (
          <Card className="rounded-3xl">
            <div className="flex items-end justify-between gap-8">
              <div className="flex-1">
                <div
                  className="mt-6 border-t pt-2 text-center text-xs"
                  style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)' }}
                >
                  {orc.aprovadoPor?.nome || 'Aprovador'}
                </div>
                <p className="mt-1 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                  Aprovado por
                </p>
              </div>
              <div className="flex-1">
                <div
                  className="mt-6 border-t pt-2 text-center text-xs"
                  style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)' }}
                >
                  {orc.dataAprovacao
                    ? new Date(orc.dataAprovacao).toLocaleDateString('pt-BR')
                    : '_____________'}
                </div>
                <p className="mt-1 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                  DATA
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* ── Modais ── */}
      <ModalConfirmacao
        isOpen={p.enviarModal.isOpen}
        onClose={p.enviarModal.closeModal}
        onConfirm={p.handleEnviarAprovacao}
        title="Enviar para aprovação"
        message="Deseja enviar este orçamento para aprovação da diretoria? Você não poderá editá-lo após isso."
      />

      <ModalConfirmacao
        isOpen={p.aprovarModal.isOpen}
        onClose={p.aprovarModal.closeModal}
        onConfirm={p.handleAprovar}
        title="Aprovar orçamento"
        message={`Confirma a aprovação do orçamento "${orc.titulo}"?`}
      />

      {/* Modal rejeitar com campo de motivo */}
      {p.rejeitarModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'var(--overlay-bg)' }}
        >
          <div
            className="w-full max-w-md rounded-3xl p-6 shadow-xl"
            style={{ backgroundColor: 'var(--bg-surface)' }}
          >
            <h2
              className="mb-2 text-lg font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              Rejeitar orçamento
            </h2>
            <p className="mb-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Informe o motivo da rejeição:
            </p>
            <Textarea
              value={p.motivoRejeicao}
              onChange={(e) => p.setMotivoRejeicao(e.target.value)}
              placeholder="Descreva o motivo..."
              rows={3}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={p.rejeitarModal.closeModal}
                disabled={p.actionLoading}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={p.handleRejeitar}
                disabled={p.actionLoading}
              >
                {p.actionLoading ? 'Rejeitando...' : 'Confirmar Rejeição'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

export default DetalhesOrcamentoPage;
