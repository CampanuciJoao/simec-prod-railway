import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClipboardCheck,
  faList,
  faTrashRestore,
  faSave,
  faRotateLeft,
  faFileImport,
} from '@fortawesome/free-solid-svg-icons';

import {
  PageLayout,
  PageHeader,
  PageSection,
  PageState,
  ResponsiveTabs,
  Button,
  Input,
  Select,
  Badge,
} from '@/components/ui';

import {
  getTiposTeste,
  updateTipoTeste,
  createTipoTeste,
  listarTestesCq,
  restaurarTesteCq,
} from '@/services/api';

import ImportarLoteCqPanel from '@/components/controleQualidade/ImportarLoteCqPanel';

const TABS = [
  { id: 'catalogo', label: 'Catálogo de tipos', icon: <FontAwesomeIcon icon={faList} /> },
  { id: 'importar', label: 'Importar histórico (lote)', icon: <FontAwesomeIcon icon={faFileImport} /> },
  { id: 'excluidos', label: 'Registros excluídos', icon: <FontAwesomeIcon icon={faTrashRestore} /> },
];

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

function ControleQualidadeAdminPage() {
  const [activeTab, setActiveTab] = useState('catalogo');

  return (
    <PageLayout padded fullHeight>
      <div className="space-y-6">
        <PageHeader
          title="Controle de Qualidade — Configurações"
          subtitle="Catálogo de tipos de teste (RDC 611/2022 + IN 90/2021) e restauração de registros excluídos."
          icon={faClipboardCheck}
        />

        <ResponsiveTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'catalogo' ? <CatalogoTab /> : null}
        {activeTab === 'importar' ? <ImportarLoteCqPanel /> : null}
        {activeTab === 'excluidos' ? <ExcluidosTab /> : null}
      </div>
    </PageLayout>
  );
}

function CatalogoTab() {
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [edits, setEdits] = useState({});
  const [salvandoId, setSalvandoId] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTiposTeste({ somenteAtivos: false });
      setTipos(Array.isArray(data) ? data : []);
      setEdits({});
    } catch (e) {
      setError(e?.response?.data?.message || 'Erro ao carregar catálogo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const onChange = (id, campo, valor) => {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [campo]: valor },
    }));
  };

  const salvar = async (tipo) => {
    const dirty = edits[tipo.id];
    if (!dirty) return;
    setSalvandoId(tipo.id);
    try {
      await updateTipoTeste(tipo.id, dirty);
      await carregar();
    } catch (e) {
      alert(e?.response?.data?.message || 'Erro ao salvar.');
    } finally {
      setSalvandoId(null);
    }
  };

  if (loading) return <PageSection><PageState loading /></PageSection>;
  if (error) return <PageSection><PageState error={error} /></PageSection>;

  // Agrupa por modalidade
  const porModalidade = tipos.reduce((acc, t) => {
    const m = t.modalidade || 'Sem modalidade';
    if (!acc[m]) acc[m] = [];
    acc[m].push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(porModalidade).map(([modalidade, lista]) => (
        <PageSection key={modalidade} title={modalidade}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr style={{ color: 'var(--text-muted)' }} className="text-left text-xs uppercase">
                  <th className="px-2 py-2">Código</th>
                  <th className="px-2 py-2">Nome</th>
                  <th className="px-2 py-2">Frequência (dias)</th>
                  <th className="px-2 py-2">Obrigatório</th>
                  <th className="px-2 py-2">Ativo</th>
                  <th className="px-2 py-2">Norma</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {lista.map((tipo) => {
                  const dirty = edits[tipo.id] || {};
                  const valor = (campo) => (dirty[campo] !== undefined ? dirty[campo] : tipo[campo]);
                  const temMudanca = Object.keys(dirty).length > 0;

                  return (
                    <tr key={tipo.id} style={{ borderTop: '1px solid var(--border-soft)' }}>
                      <td className="px-2 py-2 font-mono text-xs">{tipo.codigo}</td>
                      <td className="px-2 py-2">{tipo.nome}</td>
                      <td className="px-2 py-2 max-w-[120px]">
                        <Input
                          type="number"
                          min="1"
                          max="3650"
                          value={valor('frequenciaDias')}
                          onChange={(e) => onChange(tipo.id, 'frequenciaDias', Number(e.target.value))}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          checked={!!valor('obrigatorio')}
                          onChange={(e) => onChange(tipo.id, 'obrigatorio', e.target.checked)}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          checked={!!valor('ativo')}
                          onChange={(e) => onChange(tipo.id, 'ativo', e.target.checked)}
                        />
                      </td>
                      <td className="px-2 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {tipo.normaReferencia || '—'}
                      </td>
                      <td className="px-2 py-2">
                        {temMudanca ? (
                          <Button
                            size="sm"
                            onClick={() => salvar(tipo)}
                            disabled={salvandoId === tipo.id}
                          >
                            <FontAwesomeIcon icon={faSave} />
                            <span className="ml-2">{salvandoId === tipo.id ? '...' : 'Salvar'}</span>
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </PageSection>
      ))}
    </div>
  );
}

function ExcluidosTab() {
  const [testes, setTestes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [restaurandoId, setRestaurandoId] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listarTestesCq({ incluirDeletados: 'true', pageSize: 200 });
      const items = (data?.items || []).filter((t) => !!t.deletadoEm);
      setTestes(items);
    } catch (e) {
      setError(e?.response?.data?.message || 'Erro ao carregar excluídos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const restaurar = async (t) => {
    if (!confirm(`Restaurar teste ${t.tipoTeste?.codigo}?`)) return;
    setRestaurandoId(t.id);
    try {
      await restaurarTesteCq(t.id);
      await carregar();
    } catch (e) {
      alert(e?.response?.data?.message || 'Erro ao restaurar.');
    } finally {
      setRestaurandoId(null);
    }
  };

  if (loading) return <PageSection><PageState loading /></PageSection>;
  if (error) return <PageSection><PageState error={error} /></PageSection>;

  if (testes.length === 0) {
    return (
      <PageSection>
        <PageState isEmpty emptyMessage="Nenhum teste excluído. Os laudos PDF permanecem arquivados por 5 anos mesmo após exclusão (RDC 611/2022)." />
      </PageSection>
    );
  }

  return (
    <PageSection>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr style={{ color: 'var(--text-muted)' }} className="text-left text-xs uppercase">
              <th className="px-2 py-2">Equipamento</th>
              <th className="px-2 py-2">Tipo</th>
              <th className="px-2 py-2">Data execução</th>
              <th className="px-2 py-2">Excluído em</th>
              <th className="px-2 py-2">Justificativa</th>
              <th className="px-2 py-2">Resultado</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {testes.map((t) => (
              <tr key={t.id} style={{ borderTop: '1px solid var(--border-soft)' }}>
                <td className="px-2 py-2">
                  <div className="font-medium">{t.equipamento?.modelo}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {t.equipamento?.tag}
                  </div>
                </td>
                <td className="px-2 py-2 font-mono text-xs">{t.tipoTeste?.codigo}</td>
                <td className="px-2 py-2">{fmt(t.dataExecucao)}</td>
                <td className="px-2 py-2">{fmt(t.deletadoEm)}</td>
                <td className="px-2 py-2 max-w-md text-xs" style={{ color: 'var(--text-muted)' }}>
                  {t.motivoExclusao || '—'}
                </td>
                <td className="px-2 py-2">
                  <Badge variant="slate">{t.resultado || 'Pendente'}</Badge>
                </td>
                <td className="px-2 py-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => restaurar(t)}
                    disabled={restaurandoId === t.id}
                  >
                    <FontAwesomeIcon icon={faRotateLeft} />
                    <span className="ml-2">{restaurandoId === t.id ? '...' : 'Restaurar'}</span>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageSection>
  );
}

export default ControleQualidadeAdminPage;
