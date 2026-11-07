// Modal com historico das ultimas N manutencoes concluidas de 1 rotina
// (equipamento ou rotina predial). Permite baixar PDF da OS de cada uma.

import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faCheck, faSpinner } from '@fortawesome/free-solid-svg-icons';

import { Drawer, InlineEmptyState, Button } from '@/components/ui';
import { formatarDataHora } from '@/utils/timeUtils';
import { buscarHistoricoControle } from '@/hooks/manutencoes/useControleManutencoes';
import { exportarOSManutencaoPDF } from '@/services/api/pdfApi';

const TIPOS_SERVICO_PREDIAL_LABELS = {
  LimpezaCaixaDagua: 'Limpeza de caixa d’água',
  Dedetizacao:       'Dedetização',
  Extintor:          'Extintor',
  Bebedouro:         'Bebedouro',
  SpdaParaRaios:     'SPDA / para-raios',
  ArtElevador:       'ART do elevador',
};

export default function ControleHistoricoModal({ item, onClose }) {
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [baixandoId, setBaixandoId] = useState(null);

  useEffect(() => {
    if (!item) { setHistorico([]); return; }
    setCarregando(true);
    const params = item.tipo === 'equipamento'
      ? { equipamentoId: item.equipamentoId, limite: 10 }
      : { unidadePredialId: item.unidadeId, tipoServicoPredial: item.tipoServicoPredial, limite: 10 };
    buscarHistoricoControle(params)
      .then(setHistorico)
      .catch(() => setHistorico([]))
      .finally(() => setCarregando(false));
  }, [item]);

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
              {historico.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-md border px-3 py-2"
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
                    </p>
                  </div>
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
                </div>
              ))}
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
