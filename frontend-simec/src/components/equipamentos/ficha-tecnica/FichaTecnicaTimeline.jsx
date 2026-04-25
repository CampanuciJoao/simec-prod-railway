import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';

import { Button, InlineEmptyState, PageSection, PageState } from '@/components/ui';
import FichaTecnicaTimelineItem from '@/components/equipamentos/ficha-tecnica/FichaTecnicaTimelineItem';

const PAGE_SIZE = 10;
const FILTROS = [
  { key: 'pendentes', label: 'Pendentes' },
  { key: 'resolvidas', label: 'Resolvidas' },
  { key: 'todas', label: 'Todas' },
];

function FichaTecnicaTimeline({
  ocorrencias,
  itensExpandidos,
  dadosSolucao,
  resolvendoId,
  submitting,
  onToggleExpandir,
  onChangeSolucao,
  onAbrirResolucao,
  onCancelarResolucao,
  onSalvarSolucao,
}) {
  const [filtroAtivo, setFiltroAtivo] = useState('pendentes');
  const [visiveis, setVisiveis] = useState(PAGE_SIZE);

  const contagens = useMemo(() => ({
    pendentes: ocorrencias.filter((o) => !o.resolvido).length,
    resolvidas: ocorrencias.filter((o) => o.resolvido).length,
    todas: ocorrencias.length,
  }), [ocorrencias]);

  const listaFiltrada = useMemo(() => {
    if (filtroAtivo === 'pendentes') return ocorrencias.filter((o) => !o.resolvido);
    if (filtroAtivo === 'resolvidas') return ocorrencias.filter((o) => o.resolvido);
    return ocorrencias;
  }, [ocorrencias, filtroAtivo]);

  const listaVisivel = listaFiltrada.slice(0, visiveis);
  const temMais = listaFiltrada.length > visiveis;

  const handleFiltro = (key) => {
    setFiltroAtivo(key);
    setVisiveis(PAGE_SIZE);
  };

  return (
    <PageSection
      title={`Eventos registrados (${ocorrencias.length})`}
      description="Consulte apenas os eventos leves lancados por esta tela. O historico completo fica na aba Historico do equipamento."
    >
      {ocorrencias.length === 0 ? (
        <PageState
          isEmpty
          emptyMessage="Nenhum evento leve registrado para este equipamento."
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {FILTROS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => handleFiltro(f.key)}
                className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-medium transition"
                style={{
                  backgroundColor:
                    filtroAtivo === f.key ? 'var(--brand-primary)' : 'var(--bg-surface)',
                  borderColor:
                    filtroAtivo === f.key ? 'var(--brand-primary)' : 'var(--border-soft)',
                  color: filtroAtivo === f.key ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {f.label}
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                  style={{
                    backgroundColor:
                      filtroAtivo === f.key ? 'rgba(255,255,255,0.25)' : 'var(--bg-surface-soft)',
                    color: filtroAtivo === f.key ? '#fff' : 'var(--text-muted)',
                  }}
                >
                  {contagens[f.key]}
                </span>
              </button>
            ))}
          </div>

          {listaVisivel.length === 0 ? (
            <InlineEmptyState
              message={
                filtroAtivo === 'pendentes'
                  ? 'Nenhuma ocorrencia pendente.'
                  : 'Nenhuma ocorrencia resolvida.'
              }
            />
          ) : (
            <>
              <div className="space-y-3">
                {listaVisivel.map((item) => {
                  const expandido = itensExpandidos.has(item.id);
                  const payloadSolucao = dadosSolucao[item.id] || {};

                  return (
                    <FichaTecnicaTimelineItem
                      key={item.id}
                      item={item}
                      expandido={expandido}
                      payloadSolucao={payloadSolucao}
                      isResolvendo={resolvendoId === item.id}
                      submitting={submitting}
                      onToggle={() => onToggleExpandir(item.id)}
                      onChangeSolucao={(campo, valor) =>
                        onChangeSolucao(item.id, campo, valor)
                      }
                      onAbrirResolucao={() => onAbrirResolucao(item.id)}
                      onCancelarResolucao={onCancelarResolucao}
                      onSalvarSolucao={() => onSalvarSolucao(item.id)}
                    />
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-1">
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Exibindo <strong>{listaVisivel.length}</strong> de{' '}
                  <strong>{listaFiltrada.length}</strong>
                </p>

                {temMais ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setVisiveis((prev) => prev + PAGE_SIZE)}
                  >
                    Ver mais {Math.min(PAGE_SIZE, listaFiltrada.length - visiveis)}
                  </Button>
                ) : null}
              </div>
            </>
          )}
        </div>
      )}
    </PageSection>
  );
}

FichaTecnicaTimeline.propTypes = {
  ocorrencias: PropTypes.arrayOf(PropTypes.object).isRequired,
  itensExpandidos: PropTypes.instanceOf(Set).isRequired,
  dadosSolucao: PropTypes.object.isRequired,
  resolvendoId: PropTypes.string,
  submitting: PropTypes.bool.isRequired,
  onToggleExpandir: PropTypes.func.isRequired,
  onChangeSolucao: PropTypes.func.isRequired,
  onAbrirResolucao: PropTypes.func.isRequired,
  onCancelarResolucao: PropTypes.func.isRequired,
  onSalvarSolucao: PropTypes.func.isRequired,
};

export default FichaTecnicaTimeline;
