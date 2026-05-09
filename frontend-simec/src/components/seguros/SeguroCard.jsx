import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronDown,
  faChevronUp,
  faDownload,
  faPen,
  faShieldAlt,
  faRotate,
  faBan,
  faTrash,
  faClockRotateLeft,
} from '@fortawesome/free-solid-svg-icons';

import api from '@/services/http/apiClient';
import { getSeguroHistorico } from '@/services/api';
import { Button, Card } from '@/components/ui';
import CancelarSeguroModal from './CancelarSeguroModal';

import {
  getStatusBadgeClass,
  getRowHighlightClass,
} from '@/utils/seguros/seguro.utils';
import { getCoberturasAtivas } from '@/utils/seguros/seguroCoverageCatalog';
import {
  formatarMoeda,
  getAlvoSeguro,
  getNomeUnidade,
  getTipoSeguroLabel,
  getTipoVinculo,
} from '@/utils/seguros/seguroFormatter';

const BACKEND_URL = (api.defaults.baseURL || '').replace(/\/api\/?$/, '');

function formatarData(value) {
  if (!value) return 'N/A';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';

  return date.toLocaleDateString('pt-BR', {
    timeZone: 'UTC',
  });
}

function buildAttachmentUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${BACKEND_URL}/${String(path).replace(/^\/+/, '')}`;
}

function SeguroInfoItem({ label, value, featured = false }) {
  return (
    <div
      className={[
        'min-w-0 border-b py-3',
        featured ? 'md:col-span-2' : '',
      ].join(' ')}
      style={{ borderColor: 'var(--border-soft)' }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </p>
      <p
        className={[
          'mt-1 break-words font-semibold',
          featured ? 'text-base md:text-lg' : 'text-sm',
        ].join(' ')}
        style={{ color: 'var(--text-primary)' }}
      >
        {value || 'N/A'}
      </p>
    </div>
  );
}

function SeguroCoberturasResumo({ coberturas }) {
  if (!coberturas.length) {
    return (
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Nenhuma cobertura com valor cadastrado.
      </p>
    );
  }

  const totalCoberto = coberturas.reduce((acc, c) => acc + c.value, 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {coberturas.map((cobertura) => (
          <div
            key={cobertura.key}
            className="flex items-center justify-between rounded-xl border px-3 py-2.5"
            style={{
              borderColor: 'var(--border-soft)',
              backgroundColor: 'var(--bg-surface-soft)',
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <FontAwesomeIcon
                icon={faShieldAlt}
                className="shrink-0 text-xs"
                style={{ color: 'var(--brand-primary)', opacity: 0.7 }}
              />
              <span
                className="truncate text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                {cobertura.label}
              </span>
            </div>
            <span
              className="ml-3 shrink-0 text-sm font-bold tabular-nums"
              style={{ color: 'var(--text-primary)' }}
            >
              {formatarMoeda(cobertura.value)}
            </span>
          </div>
        ))}
      </div>

      <div
        className="flex items-center justify-between rounded-xl border px-3 py-2"
        style={{
          borderColor: 'var(--brand-primary)',
          backgroundColor: 'color-mix(in srgb, var(--brand-primary) 8%, transparent)',
        }}
      >
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--brand-primary)' }}
        >
          Total coberto
        </span>
        <span
          className="text-sm font-bold tabular-nums"
          style={{ color: 'var(--brand-primary)' }}
        >
          {formatarMoeda(totalCoberto)}
        </span>
      </div>
    </div>
  );
}

function SeguroCard({
  seguro,
  status,
  isExpanded,
  onToggle,
  onEdit,
  onRenovar,
  onCancelar,
  onExcluir,
  isAdmin,
}) {
  const coberturas = getCoberturasAtivas(seguro);
  const alvo = getAlvoSeguro(seguro);
  const vigencia = `${formatarData(seguro.dataInicio)} ate ${formatarData(seguro.dataFim)}`;
  const primeiroAnexo = seguro.anexos?.[0] || null;
  const downloadUrl = buildAttachmentUrl(primeiroAnexo?.path);

  const [showCancelarModal, setShowCancelarModal] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [historico, setHistorico] = useState([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [showHistorico, setShowHistorico] = useState(false);
  const [historicoFetched, setHistoricoFetched] = useState(false);

  const isAtivo = ['Ativo', 'Vigente'].includes(status);

  useEffect(() => {
    if (!isExpanded || historicoFetched) return;
    setLoadingHistorico(true);
    getSeguroHistorico(seguro.id)
      .then((data) => {
        setHistorico(Array.isArray(data) ? data.slice(1) : []);
        setHistoricoFetched(true);
      })
      .catch(() => {
        setHistoricoFetched(true);
      })
      .finally(() => setLoadingHistorico(false));
  }, [isExpanded, historicoFetched, seguro.id]);

  const handleCancelarCard = async (motivo) => {
    setCancelando(true);
    try {
      await onCancelar(motivo);
      setShowCancelarModal(false);
    } finally {
      setCancelando(false);
    }
  };

  const handleExcluirCard = async () => {
    setExcluindo(true);
    try {
      await onExcluir();
    } finally {
      setExcluindo(false);
      setConfirmandoExclusao(false);
    }
  };

  const stopAndRun = (event, callback) => {
    event.stopPropagation();
    callback?.();
  };

  const handleDownload = async (event) => {
    event.stopPropagation();
    if (!downloadUrl) return;
    try {
      const response = await api.get(`/seguros/${seguro.id}/apolice`, {
        responseType: 'blob',
      });
      const blobUrl = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = `apolice-${seguro.apoliceNumero || seguro.id}`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // silently ignore download errors
    }
  };

  return (
    <>
    {showCancelarModal && (
      <CancelarSeguroModal
        apoliceNumero={seguro.apoliceNumero}
        onConfirm={handleCancelarCard}
        onClose={() => setShowCancelarModal(false)}
        loading={cancelando}
      />
    )}
    <Card
      className={`border-l-4 ${getRowHighlightClass(status)}`}
      surface="soft"
      style={{
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 94%, var(--brand-primary) 6%), var(--bg-surface))',
      }}
    >
      <div
        role="button"
        tabIndex={0}
        className="cursor-pointer"
        onClick={() => onToggle(seguro.id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggle(seguro.id);
          }
        }}
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--brand-primary)' }}
              >
                {getTipoSeguroLabel(seguro.tipoSeguro)}
              </p>
              <h3
                className="mt-1 break-words text-xl font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                Apolice {seguro.apoliceNumero || 'N/A'}
              </h3>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {downloadUrl ? (
                <button
                  type="button"
                  className="ui-button ui-transition ui-brand-ring inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-3 text-sm font-semibold hover:-translate-y-[1px]"
                  style={{
                    backgroundColor: 'var(--button-secondary-bg)',
                    color: 'var(--button-secondary-text)',
                    borderColor: 'var(--button-secondary-border)',
                  }}
                  onClick={handleDownload}
                  title="Baixar apólice"
                >
                  <FontAwesomeIcon icon={faDownload} />
                  Apólice
                </button>
              ) : null}

              <span
                className={`rounded-full border px-3 py-1 text-sm font-semibold ${getStatusBadgeClass(status)}`}
              >
                {status}
              </span>

              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border"
                style={{
                  borderColor: 'var(--border-soft)',
                  color: 'var(--text-secondary)',
                }}
                title={isExpanded ? 'Recolher' : 'Expandir'}
              >
                <FontAwesomeIcon
                  icon={faChevronDown}
                  className="transition-transform"
                  style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}
                />
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-x-6 md:grid-cols-4">
            <SeguroInfoItem label="Numero da apolice" value={seguro.apoliceNumero} />
            <SeguroInfoItem label="Vigencia" value={vigencia} />
            <SeguroInfoItem label={alvo.label} value={alvo.value} featured />
          </div>
        </div>
      </div>

      {isExpanded ? (
        <div
          className="mt-5 border-t pt-5"
          style={{ borderColor: 'var(--border-soft)' }}
        >
          <div className="grid grid-cols-1 gap-x-6 md:grid-cols-4">
            <SeguroInfoItem
              label="Seguradora"
              value={seguro.seguradora}
              featured
            />
            <SeguroInfoItem
              label="Premio total"
              value={formatarMoeda(seguro.premioTotal)}
            />
            <SeguroInfoItem
              label="Tipo de vinculo"
              value={getTipoVinculo(seguro)}
            />
            <SeguroInfoItem
              label="Unidade"
              value={getNomeUnidade(seguro)}
            />
            <SeguroInfoItem
              label="Status"
              value={status}
            />
          </div>

          <div className="mt-5 space-y-2">
            <p
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: 'var(--text-muted)' }}
            >
              Coberturas
            </p>
            <SeguroCoberturasResumo coberturas={coberturas} />
          </div>

          {historico.length > 0 && (
            <div className="mt-5">
              <button
                type="button"
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--text-muted)' }}
                onClick={(e) => stopAndRun(e, () => setShowHistorico((v) => !v))}
              >
                <FontAwesomeIcon icon={faClockRotateLeft} />
                Histórico de apólices ({historico.length})
                <FontAwesomeIcon icon={showHistorico ? faChevronUp : faChevronDown} className="text-[10px]" />
              </button>

              {showHistorico && (
                <div className="mt-3 flex flex-col gap-2">
                  {historico.map((item) => {
                    const dInicio = item.dataInicio ? new Date(item.dataInicio).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—';
                    const dFim    = item.dataFim    ? new Date(item.dataFim).toLocaleDateString('pt-BR', { timeZone: 'UTC' })    : '—';
                    return (
                      <div
                        key={item.id}
                        className="rounded-xl border px-3 py-2.5 text-xs"
                        style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface-soft)' }}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                            Apólice {item.apoliceNumero}
                          </span>
                          <span
                            className={`rounded-full border px-2 py-0.5 font-semibold ${getStatusBadgeClass(item.status)}`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <p className="mt-1 opacity-60">Vigência: {dInicio} → {dFim}</p>
                        {item.motivoCancelamento && (
                          <p className="mt-1 rounded px-2 py-1" style={{ backgroundColor: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}>
                            Cancelado — {item.motivoCancelamento}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {loadingHistorico && (
            <p className="mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>Carregando histórico...</p>
          )}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            {isAtivo && (
              <Button variant="secondary" onClick={(event) => stopAndRun(event, onRenovar)}>
                <FontAwesomeIcon icon={faRotate} />
                Renovar
              </Button>
            )}
            <Button variant="secondary" onClick={(event) => stopAndRun(event, onEdit)}>
              <FontAwesomeIcon icon={faPen} />
              Editar
            </Button>
            {isAtivo && (
              <Button variant="secondary" onClick={(event) => stopAndRun(event, () => setShowCancelarModal(true))}>
                <FontAwesomeIcon icon={faBan} />
                Cancelar
              </Button>
            )}
            {isAdmin && !confirmandoExclusao && (
              <Button variant="danger" onClick={(event) => stopAndRun(event, () => setConfirmandoExclusao(true))}>
                <FontAwesomeIcon icon={faTrash} />
                Excluir
              </Button>
            )}
            {isAdmin && confirmandoExclusao && (
              <div
                className="flex items-center gap-2 rounded-xl border px-3 py-1.5"
                style={{ borderColor: 'var(--color-danger)', backgroundColor: 'var(--color-danger-soft)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-xs font-semibold" style={{ color: 'var(--color-danger)' }}>
                  Confirmar exclusão?
                </span>
                <Button variant="danger" onClick={(event) => stopAndRun(event, handleExcluirCard)} disabled={excluindo}>
                  {excluindo ? 'Excluindo...' : 'Sim'}
                </Button>
                <Button variant="secondary" onClick={(event) => stopAndRun(event, () => setConfirmandoExclusao(false))}>
                  Não
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Card>
    </>
  );
}

export default SeguroCard;
