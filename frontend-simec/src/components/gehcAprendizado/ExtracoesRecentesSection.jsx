import React, { useCallback, useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPenToSquare,
  faCheck,
  faRotate,
} from '@fortawesome/free-solid-svg-icons';
import { Button, PageState, Badge } from '@/components/ui';
import { getExtracoesRecentes } from '@/services/api/gehcAprendizadoApi';
import { formatarDataHora } from '@/utils/timeUtils';
import CorrigirCategoriaModal from './CorrigirCategoriaModal';

const LABEL_CATEGORIA_CURTO = {
  // Corretiva
  infra_chiller_cliente: 'Chiller predial',
  cryo_compressor: 'Cryo compressor',
  cryo_adsorber: 'Cryo · Adsorber',
  cryo_coldhead: 'Cryo · Coldhead',
  magneto_helio: 'Magneto / hélio',
  bobina: 'Bobina',
  gradiente: 'Gradiente',
  rf: 'Cadeia RF',
  mesa_mecanica: 'Mesa mecânica',
  software: 'Software',
  rede_dados: 'Rede / DICOM',
  infra_eletrica: 'Energia predial',
  cabo_conector: 'Cabo / conector',
  monitor_console: 'Monitor / console',
  contaminacao_metal: 'Contaminação metal',
  interferencia_rf: 'Interferência RF',
  artefato_imagem: 'Artefato imagem',
  uso_operador: 'Uso / operação',
  desconhecido: 'Desconhecido',
  // PM
  pm_adsorber: 'PM · Adsorber',
  pm_coldhead: 'PM · Coldhead',
  pm_chiller_periodica: 'PM · Chiller',
  pm_compressor: 'PM · Compressor',
  pm_calibracao_coil: 'PM · Calib. bobina',
  pm_calibracao_geral: 'PM · Calib. geral',
  pm_inspecao_visual: 'PM · Inspeção',
  pm_filtro: 'PM · Filtro',
  pm_bateria: 'PM · Bateria',
  pm_software_update: 'PM · Firmware',
  pm_limpeza_lubrif: 'PM · Limpeza',
  pm_generica: 'PM · Genérica',
};

function corCategoria(cat) {
  if (!cat) return 'slate';
  if (cat === 'desconhecido' || cat === 'pm_generica') return 'orange';
  if (cat.startsWith('pm_')) return 'blue';
  return 'purple';
}

function ExtracoesRecentesSection() {
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState('todos'); // 'todos' | 'baixa_confianca' | 'descategorizadas'
  const [extracaoEditando, setExtracaoEditando] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await getExtracoesRecentes(50);
      setItens(r.itens || []);
    } catch (err) {
      setError(err?.response?.data?.error || 'Falha ao carregar extrações recentes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const itensFiltrados = itens.filter((e) => {
    if (filtro === 'baixa_confianca') return e.llmConfianca != null && e.llmConfianca < 0.6;
    if (filtro === 'descategorizadas') {
      return !e.rootCauseCategory ||
        e.rootCauseCategory === 'desconhecido' ||
        e.rootCauseCategory === 'pm_generica';
    }
    return true;
  });

  if (loading && itens.length === 0) {
    return <PageState loading />;
  }
  if (error && itens.length === 0) {
    return <PageState error={error} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            { id: 'todos', label: 'Todas' },
            { id: 'baixa_confianca', label: 'Baixa confiança (< 60%)' },
            { id: 'descategorizadas', label: 'Sem categoria clara' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltro(f.id)}
              className="rounded-full px-3 py-1 text-xs font-medium"
              style={{
                backgroundColor: filtro === f.id ? 'var(--brand-primary)' : 'var(--bg-surface-soft)',
                color: filtro === f.id ? '#fff' : 'var(--text-muted)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={carregar}>
          <FontAwesomeIcon icon={faRotate} />
          <span className="ml-2 text-xs">Atualizar</span>
        </Button>
      </div>

      {itensFiltrados.length === 0 ? (
        <PageState isEmpty emptyMessage="Nenhuma extração nesta categoria." />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--text-muted)' }} className="text-left text-xs uppercase">
                <th className="px-3 py-2">Quando</th>
                <th className="px-3 py-2">OS</th>
                <th className="px-3 py-2">Equipamento</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Categoria atribuída</th>
                <th className="px-3 py-2 text-right">Confiança</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {itensFiltrados.map((e) => {
                const ehPm = e.serviceTypeCode === 'SE02';
                const foiCorrigida = Boolean(e.correcaoAdmin);
                return (
                  <tr key={e.id} style={{ borderTop: '1px solid var(--border-soft)' }}>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {formatarDataHora(e.extraidoEm)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      <div style={{ color: 'var(--text-primary)' }} className="font-semibold">
                        {e.identificadorPortal || e.gehcServiceId || '—'}
                      </div>
                      {e.woNumber && (
                        <div style={{ color: 'var(--text-muted)' }}>WO-{e.woNumber}</div>
                      )}
                      {e.relacionadas?.length > 0 && (
                        <div
                          className="mt-0.5 text-[10px]"
                          style={{ color: 'var(--brand-primary)' }}
                          title={`Referencia: ${e.relacionadas.map((r) => r.match).join(', ')}`}
                        >
                          + {e.relacionadas.length} {e.relacionadas.length === 1 ? 'relacionado' : 'relacionados'}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <div style={{ color: 'var(--text-primary)' }}>
                        {e.equipamento?.apelido || e.equipamento?.tag || '—'}
                      </div>
                      {e.equipamento?.modelo && (
                        <div style={{ color: 'var(--text-muted)' }}>{e.equipamento.modelo}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {ehPm ? <Badge variant="blue">Preventiva</Badge> : <Badge variant="purple">Corretiva</Badge>}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={corCategoria(e.rootCauseCategory)}>
                        {LABEL_CATEGORIA_CURTO[e.rootCauseCategory] || e.rootCauseCategory || '—'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-xs">
                      {e.llmConfianca != null
                        ? `${Math.round(e.llmConfianca * 100)}%`
                        : '—'}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {foiCorrigida ? (
                        <Badge variant="green">
                          <FontAwesomeIcon icon={faCheck} className="mr-1" />
                          Corrigida
                        </Badge>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setExtracaoEditando(e)}
                        title="Corrigir categoria — alimenta o aprendizado coletivo"
                      >
                        <FontAwesomeIcon icon={faPenToSquare} />
                        <span className="ml-1 text-xs">
                          {foiCorrigida ? 'Reajustar' : 'Corrigir'}
                        </span>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <CorrigirCategoriaModal
        isOpen={Boolean(extracaoEditando)}
        extracao={extracaoEditando}
        onClose={() => setExtracaoEditando(null)}
        onSaved={carregar}
      />
    </div>
  );
}

export default ExtracoesRecentesSection;
