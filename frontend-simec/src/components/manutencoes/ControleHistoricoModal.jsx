// Modal com historico das ultimas N manutencoes concluidas de 1 rotina
// (equipamento ou rotina predial). Permite baixar PDF da OS de cada uma.

import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faCheck, faSpinner, faArrowRight, faPaperclip, faClockRotateLeft, faPlus } from '@fortawesome/free-solid-svg-icons';

import { Drawer, InlineEmptyState, Button, Input, Textarea } from '@/components/ui';
import { buscarHistoricoControle, registrarExecucaoPassada } from '@/hooks/manutencoes/useControleManutencoes';
import { exportarOSManutencaoPDF } from '@/services/api/pdfApi';
import { useToast } from '@/contexts/ToastContext';

const TIPOS_SERVICO_PREDIAL_LABELS = {
  LimpezaCaixaDagua: 'Limpeza de caixa d’água',
  Dedetizacao:       'Dedetização',
  Extintor:          'Extintor',
  Bebedouro:         'Bebedouro',
  SpdaParaRaios:     'SPDA / para-raios',
  ArtElevador:       'ART do elevador',
};

function dataHojeISO() {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export default function ControleHistoricoModal({ item, onClose }) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [baixandoId, setBaixandoId] = useState(null);

  const [backfillAberto, setBackfillAberto] = useState(false);
  const [backfillData, setBackfillData] = useState(dataHojeISO());
  const [backfillTecnico, setBackfillTecnico] = useState('');
  const [backfillDescricao, setBackfillDescricao] = useState('');
  const [backfillSalvando, setBackfillSalvando] = useState(false);

  const recarregarHistorico = React.useCallback(() => {
    if (!item) return;
    setCarregando(true);
    const params = item.tipo === 'equipamento'
      ? { equipamentoId: item.equipamentoId, limite: 10 }
      : { unidadePredialId: item.unidadeId, tipoServicoPredial: item.tipoServicoPredial, limite: 10 };
    buscarHistoricoControle(params)
      .then(setHistorico)
      .catch(() => setHistorico([]))
      .finally(() => setCarregando(false));
  }, [item]);

  useEffect(() => {
    if (!item) { setHistorico([]); return; }
    recarregarHistorico();
    // Reset do formulario de backfill ao trocar de item
    setBackfillAberto(false);
    setBackfillData(dataHojeISO());
    setBackfillTecnico('');
    setBackfillDescricao('');
    setBackfillSalvando(false);
  }, [item, recarregarHistorico]);

  async function salvarBackfill() {
    if (!backfillData) {
      addToast('Informe a data de execucao.', 'warning');
      return;
    }
    setBackfillSalvando(true);
    try {
      await registrarExecucaoPassada({
        equipamentoId: item.tipo === 'equipamento' ? item.equipamentoId : null,
        unidadePredialId: item.tipo === 'predial' ? item.unidadeId : null,
        tipoServicoPredial: item.tipo === 'predial' ? item.tipoServicoPredial : null,
        dataExecucao: backfillData,
        tecnicoResponsavel: backfillTecnico.trim() || null,
        descricao: backfillDescricao.trim() || null,
      });
      addToast('Execucao registrada no historico.', 'success');
      setBackfillAberto(false);
      setBackfillTecnico('');
      setBackfillDescricao('');
      setBackfillData(dataHojeISO());
      recarregarHistorico();
    } catch (err) {
      addToast(err?.response?.data?.message || 'Erro ao registrar execucao.', 'error');
    } finally {
      setBackfillSalvando(false);
    }
  }

  if (!item) return null;

  const titulo = item.tipo === 'equipamento'
    ? (item.nome || item.modelo || 'Equipamento')
    : (TIPOS_SERVICO_PREDIAL_LABELS[item.tipoServicoPredial] || item.tipoServicoPredial);

  const sub = item.tipo === 'equipamento'
    ? `${item.tag ? `TAG ${item.tag} · ` : ''}${item.unidadeNome}`
    : `${item.unidadeNome}`;

  const baixarPdf = async (manutencaoId) => {
    setBaixandoId(manutencaoId);
    try {
      await exportarOSManutencaoPDF(manutencaoId);
    } finally {
      setBaixandoId(null);
    }
  };

  return (
    <Drawer open={!!item} onClose={onClose} title={titulo}>
      <div className="px-5 py-4 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {sub}
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Frequência cadastrada: <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              a cada {item.frequenciaMeses} meses
            </span>
          </p>
          {item.proximaPrevistaEm && (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Próxima prevista:{' '}
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {new Date(item.proximaPrevistaEm).toLocaleDateString('pt-BR')}
              </span>
              {item.diasRestantes != null && (
                <> ({item.diasRestantes > 0 ? `faltam ${item.diasRestantes}` : `atrasado ${Math.abs(item.diasRestantes)}`} dias)</>
              )}
            </p>
          )}
        </div>

        <div className="rounded-lg border p-4" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface-soft)' }}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                <FontAwesomeIcon icon={faClockRotateLeft} className="mr-2" />
                Registrar execução anterior
              </p>
              <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Lance uma preventiva que ja foi feita (antes do modulo existir, ou fora do sistema).
              </p>
            </div>
            {!backfillAberto && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setBackfillAberto(true)}
              >
                <FontAwesomeIcon icon={faPlus} />
                Adicionar
              </Button>
            )}
          </div>

          {backfillAberto && (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Data da execução"
                  type="date"
                  value={backfillData}
                  max={dataHojeISO()}
                  onChange={(e) => setBackfillData(e.target.value)}
                />
                <Input
                  label="Técnico responsável (opcional)"
                  value={backfillTecnico}
                  onChange={(e) => setBackfillTecnico(e.target.value)}
                  placeholder="Ex.: Empresa X, equipe interna, etc."
                />
              </div>
              <Textarea
                label="Observações (opcional)"
                rows={2}
                value={backfillDescricao}
                onChange={(e) => setBackfillDescricao(e.target.value)}
                placeholder="Detalhes do servico executado."
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={backfillSalvando}
                  onClick={() => setBackfillAberto(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="success"
                  size="sm"
                  disabled={backfillSalvando || !backfillData}
                  onClick={salvarBackfill}
                >
                  <FontAwesomeIcon icon={backfillSalvando ? faSpinner : faCheck} spin={backfillSalvando} />
                  {backfillSalvando ? 'Registrando...' : 'Registrar'}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg border p-4" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)' }}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Últimas manutenções concluídas
          </p>

          {carregando ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Carregando...</p>
          ) : historico.length === 0 ? (
            <InlineEmptyState message="Nenhuma manutenção concluída ainda." />
          ) : (
            <div className="space-y-2">
              {historico.map((m) => {
                const qtdAnexos = Number(m.anexosCount ?? (Array.isArray(m.anexos) ? m.anexos.length : 0));
                return (
                  <div
                    key={m.id}
                    className="flex flex-col gap-2 rounded-md border px-3 py-2 sm:flex-row sm:items-center"
                    style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface-soft)' }}
                  >
                    <FontAwesomeIcon icon={faCheck} style={{ color: 'var(--color-success)' }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        OS {m.numeroOS}
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        Concluída em {m.dataConclusao ? new Date(m.dataConclusao).toLocaleDateString('pt-BR') : '—'}
                        {m.tecnicoResponsavel ? ` · ${m.tecnicoResponsavel}` : ''}
                        {qtdAnexos > 0 ? (
                          <>
                            {' · '}
                            <FontAwesomeIcon icon={faPaperclip} className="mr-0.5" />
                            {qtdAnexos} anexo{qtdAnexos === 1 ? '' : 's'}
                          </>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 sm:shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={baixandoId === m.id}
                        onClick={() => baixarPdf(m.id)}
                      >
                        <FontAwesomeIcon icon={baixandoId === m.id ? faSpinner : faDownload} spin={baixandoId === m.id} />
                        PDF
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => { onClose?.(); navigate(`/manutencoes/detalhes/${m.id}`); }}
                        title="Abrir OS para anexar imagens/PDFs"
                      >
                        <FontAwesomeIcon icon={faArrowRight} />
                        Abrir OS
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}

ControleHistoricoModal.propTypes = {
  item: PropTypes.object,
  onClose: PropTypes.func.isRequired,
};
