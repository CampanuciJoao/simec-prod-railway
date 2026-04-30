import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShieldAlt,
  faRotate,
  faPen,
  faBan,
  faTrash,
  faClockRotateLeft,
  faChevronDown,
  faChevronUp,
} from '@fortawesome/free-solid-svg-icons';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useDetalhesSeguroPage } from '@/hooks/seguros/useDetalhesSeguroPage';
import { CancelarSeguroModal } from '@/components/seguros';

import {
  PageLayout,
  PageHeader,
  PageSection,
  PageState,
  ResponsiveGrid,
  Button,
} from '@/components/ui';

import { getCoberturasAtivas } from '@/utils/seguros';
import {
  formatarMoeda,
  getNomeUnidade,
  getTipoVinculo,
  getTipoSeguroLabel,
} from '@/utils/seguros/seguroFormatter';

const STATUS_BADGE = {
  Ativo:      { label: 'Ativo',       bg: 'var(--color-success-soft)', color: 'var(--color-success)' },
  Vigente:    { label: 'Vigente',     bg: 'var(--color-success-soft)', color: 'var(--color-success)' },
  Expirado:   { label: 'Expirado',    bg: 'var(--color-danger-soft)',  color: 'var(--color-danger)' },
  Cancelado:  { label: 'Cancelado',   bg: 'var(--color-danger-soft)',  color: 'var(--color-danger)' },
  Substituido:{ label: 'Substituído', bg: 'var(--color-warning-soft)', color: 'var(--color-warning)' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_BADGE[status] || { label: status, bg: 'var(--bg-muted)', color: 'var(--text-secondary)' };
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

function HistoricoItem({ item }) {
  const dataInicio = item.dataInicio ? new Date(item.dataInicio).toLocaleDateString('pt-BR') : '—';
  const dataFim    = item.dataFim    ? new Date(item.dataFim).toLocaleDateString('pt-BR')    : '—';

  return (
    <div
      className="flex flex-col gap-1.5 rounded-xl border p-4"
      style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-muted)' }}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="font-medium text-sm">Apólice {item.apoliceNumero}</span>
        <StatusBadge status={item.status} />
      </div>
      <div className="text-xs opacity-60">
        Vigência: {dataInicio} → {dataFim}
      </div>
      {item.motivoCancelamento && (
        <div
          className="mt-1 rounded-lg px-3 py-2 text-xs"
          style={{ backgroundColor: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}
        >
          Cancelado — {item.motivoCancelamento}
        </div>
      )}
    </div>
  );
}

function DetalhesSeguroPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { addToast } = useToast();

  const { seguro, historico, loading, loadingHistorico, error, cancelando, excluindo, handleCancelar, handleExcluir } =
    useDetalhesSeguroPage(id);

  const [showCancelarModal, setShowCancelarModal] = useState(false);
  const [showHistorico, setShowHistorico] = useState(false);

  const coberturas = useMemo(() => getCoberturasAtivas(seguro || {}), [seguro]);

  const onCancelar = async (motivo) => {
    try {
      await handleCancelar(motivo);
      setShowCancelarModal(false);
      addToast('Apólice cancelada. O registro ficará acessível no histórico.', 'success');
    } catch (err) {
      addToast(err?.response?.data?.message || 'Erro ao cancelar seguro.', 'error');
    }
  };

  const onExcluir = async () => {
    try {
      await handleExcluir();
      addToast('Seguro excluído.', 'success');
      navigate('/seguros');
    } catch (err) {
      addToast(err?.response?.data?.message || 'Erro ao excluir seguro.', 'error');
    }
  };

  if (loading) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader title="Detalhes do Seguro" icon={faShieldAlt} />
        <PageState loading />
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader
          title="Erro"
          icon={faShieldAlt}
          actions={<Button variant="secondary" onClick={() => navigate('/seguros')}>Voltar</Button>}
        />
        <PageState error={error} />
      </PageLayout>
    );
  }

  if (!seguro) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader title="Não encontrado" icon={faShieldAlt} />
        <PageState isEmpty emptyMessage="Seguro não encontrado." />
      </PageLayout>
    );
  }

  const isAtivo = ['Ativo', 'Vigente'].includes(seguro.status);
  const temHistorico = historico.length > 0;

  return (
    <PageLayout background="slate" padded fullHeight>
      {showCancelarModal && (
        <CancelarSeguroModal
          apoliceNumero={seguro.apoliceNumero}
          onConfirm={onCancelar}
          onClose={() => setShowCancelarModal(false)}
          loading={cancelando}
        />
      )}

      <PageHeader
        title={`Apólice ${seguro.apoliceNumero}`}
        icon={faShieldAlt}
        actions={
          <div className="flex flex-wrap gap-2">
            {isAtivo && (
              <Button variant="primary" onClick={() => navigate(`/seguros/renovar/${seguro.id}`)}>
                <FontAwesomeIcon icon={faRotate} />
                Renovar
              </Button>
            )}
            {isAtivo && (
              <Button variant="secondary" onClick={() => navigate(`/seguros/editar/${seguro.id}`)}>
                <FontAwesomeIcon icon={faPen} />
                Editar
              </Button>
            )}
            {isAtivo && (
              <Button variant="danger" onClick={() => setShowCancelarModal(true)}>
                <FontAwesomeIcon icon={faBan} />
                Cancelar
              </Button>
            )}
            {isAdmin && (
              <Button variant="danger" onClick={onExcluir} disabled={excluindo}>
                <FontAwesomeIcon icon={faTrash} />
                {excluindo ? 'Excluindo...' : 'Excluir'}
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate('/seguros')}>
              Voltar
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-5">
        <PageSection title="Informações">
          <ResponsiveGrid cols={{ base: 1, md: 2, xl: 3 }}>
            <div className="flex flex-col gap-1">
              <span className="text-xs opacity-50 uppercase tracking-wide">Seguradora</span>
              <span className="text-sm font-medium">{seguro.seguradora}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs opacity-50 uppercase tracking-wide">Status</span>
              <div className="w-fit">
                <StatusBadge status={seguro.status} />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs opacity-50 uppercase tracking-wide">Vínculo</span>
              <span className="text-sm">{getNomeUnidade(seguro) || getTipoVinculo(seguro)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs opacity-50 uppercase tracking-wide">Tipo de seguro</span>
              <span className="text-sm">{getTipoSeguroLabel(seguro.tipoSeguro)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs opacity-50 uppercase tracking-wide">Prêmio total</span>
              <span className="text-sm font-medium">{formatarMoeda(seguro.premioTotal)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs opacity-50 uppercase tracking-wide">Vigência</span>
              <span className="text-sm">
                {seguro.dataInicio ? new Date(seguro.dataInicio).toLocaleDateString('pt-BR') : '—'}
                {' → '}
                {seguro.dataFim ? new Date(seguro.dataFim).toLocaleDateString('pt-BR') : '—'}
              </span>
            </div>
          </ResponsiveGrid>

          {seguro.motivoCancelamento && (
            <div
              className="mt-4 rounded-xl px-4 py-3 text-sm"
              style={{ backgroundColor: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}
            >
              <strong>Motivo do cancelamento:</strong> {seguro.motivoCancelamento}
            </div>
          )}
        </PageSection>

        <PageSection title="Coberturas">
          {coberturas.length > 0 ? (
            <ResponsiveGrid cols={{ base: 1, md: 2 }}>
              {coberturas.map((cobertura) => (
                <div key={cobertura.key} className="flex justify-between text-sm">
                  <span className="opacity-70">{cobertura.label}</span>
                  <span className="font-medium">{formatarMoeda(cobertura.value)}</span>
                </div>
              ))}
            </ResponsiveGrid>
          ) : (
            <PageState isEmpty emptyMessage="Sem coberturas cadastradas." />
          )}
        </PageSection>

        {/* Histórico de apólices anteriores */}
        {temHistorico && (
          <PageSection
            title={
              <button
                type="button"
                className="flex items-center gap-2 text-sm font-semibold"
                onClick={() => setShowHistorico((v) => !v)}
              >
                <FontAwesomeIcon icon={faClockRotateLeft} className="opacity-60" />
                Histórico de apólices anteriores ({historico.length})
                <FontAwesomeIcon icon={showHistorico ? faChevronUp : faChevronDown} className="opacity-40 text-xs" />
              </button>
            }
          >
            {showHistorico && (
              <div className="flex flex-col gap-3">
                {loadingHistorico ? (
                  <PageState loading />
                ) : (
                  historico.map((item) => <HistoricoItem key={item.id} item={item} />)
                )}
              </div>
            )}
          </PageSection>
        )}
      </div>
    </PageLayout>
  );
}

export default DetalhesSeguroPage;
