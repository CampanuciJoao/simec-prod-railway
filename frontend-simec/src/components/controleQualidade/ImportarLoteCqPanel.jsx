import React, { useState, useEffect, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTrash,
  faCheck,
  faTriangleExclamation,
  faCircleCheck,
} from '@fortawesome/free-solid-svg-icons';

import {
  PageSection,
  PageState,
  Button,
  Select,
  DateInput,
  Badge,
  FileDropZone,
} from '@/components/ui';

import {
  extrairLoteCq,
  criarLoteCq,
  descartarLoteCq,
  getTiposTeste,
} from '@/services/api';
import { getEquipamentos } from '@/services/api/equipamentosApi';

import { equipamentoLabel, equipamentoSortKey } from './equipamentoLabel';

const RESULTADOS = ['Aprovado', 'AprovadoComRestricoes', 'Reprovado'];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function ImportarLoteCqPanel() {
  const [files, setFiles] = useState([]);
  const [extraindo, setExtraindo] = useState(false);
  const [erroGeral, setErroGeral] = useState(null);
  const [resultados, setResultados] = useState([]); // [{tempId, fileName, dados, equipamentoSugerido, alertas, ok, erro}]
  const [selecionados, setSelecionados] = useState(new Set());
  const [edits, setEdits] = useState({}); // tempId -> { equipamentoId, tipoTesteId, dataExecucao, resultado }
  const [criando, setCriando] = useState(false);
  const [sumario, setSumario] = useState(null);

  const [equipamentos, setEquipamentos] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  useEffect(() => {
    Promise.all([
      getEquipamentos({ pageSize: 500 }).then((d) => d?.items || []),
      getTiposTeste().catch(() => []),
    ])
      .then(([eqs, ts]) => {
        setEquipamentos(eqs);
        setTipos(ts);
      })
      .finally(() => setLoadingMeta(false));
  }, []);

  const handleFiles = (novos) => {
    setFiles((prev) => [...prev, ...novos].slice(0, 50));
  };

  const removerFile = (i) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const handleExtrair = async () => {
    if (files.length === 0) return;
    setExtraindo(true);
    setErroGeral(null);
    setSumario(null);
    try {
      const r = await extrairLoteCq(files);
      const lista = r?.resultados || [];
      setResultados(lista);

      // Pre-seleciona itens com matching ok e dados completos
      const sel = new Set();
      const novosEdits = {};
      lista.forEach((it) => {
        if (it.ok && it.equipamentoSugerido && it.dados?.codigoTipoSugerido) {
          sel.add(it.tempId);
        }
        // Pre-popula edits com dados sugeridos
        if (it.ok) {
          const tipoSugerido = it.dados?.codigoTipoSugerido
            ? null // resolveremos pelo codigo na render
            : null;
          novosEdits[it.tempId] = {
            equipamentoId: it.equipamentoSugerido?.id || '',
            tipoTesteCodigo: it.dados?.codigoTipoSugerido || '',
            dataExecucao: it.dados?.dataExecucao || '',
            resultado: it.dados?.resultado || 'Aprovado',
          };
        }
      });
      setSelecionados(sel);
      setEdits(novosEdits);
    } catch (e) {
      setErroGeral(e?.response?.data?.message || 'Erro ao extrair lote.');
    } finally {
      setExtraindo(false);
    }
  };

  const tiposPorCodigo = useMemo(() => {
    const m = new Map();
    tipos.forEach((t) => m.set(t.codigo, t));
    return m;
  }, [tipos]);

  // Equipamentos agrupados por unidade — mesma logica do RegistrarTesteForm,
  // para o usuario achar o equipamento certo num lote grande.
  const equipamentosPorUnidade = useMemo(() => {
    const grupos = new Map();
    for (const eq of equipamentos) {
      const u = eq.unidade?.nomeSistema || 'Sem unidade';
      if (!grupos.has(u)) grupos.set(u, []);
      grupos.get(u).push(eq);
    }
    for (const lista of grupos.values()) {
      lista.sort((a, b) =>
        equipamentoSortKey(a).localeCompare(equipamentoSortKey(b), 'pt-BR')
      );
    }
    return [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b, 'pt-BR'));
  }, [equipamentos]);

  const tiposPorModalidade = useMemo(() => {
    const m = new Map();
    tipos.forEach((t) => {
      if (!m.has(t.modalidade)) m.set(t.modalidade, []);
      m.get(t.modalidade).push(t);
    });
    return m;
  }, [tipos]);

  const updateEdit = (tempId, campo, valor) => {
    setEdits((prev) => ({
      ...prev,
      [tempId]: { ...(prev[tempId] || {}), [campo]: valor },
    }));
  };

  const toggleSelecionado = (tempId) => {
    const novo = new Set(selecionados);
    if (novo.has(tempId)) novo.delete(tempId);
    else novo.add(tempId);
    setSelecionados(novo);
  };

  const itemPronto = (it) => {
    const e = edits[it.tempId] || {};
    const tipoId = e.tipoTesteId || tiposPorCodigo.get(e.tipoTesteCodigo)?.id;
    return Boolean(e.equipamentoId && tipoId && e.dataExecucao && e.resultado);
  };

  const handleCriar = async () => {
    setCriando(true);
    setSumario(null);
    try {
      const items = resultados
        .filter((it) => it.ok && selecionados.has(it.tempId) && itemPronto(it))
        .map((it) => {
          const e = edits[it.tempId];
          const tipoId = e.tipoTesteId || tiposPorCodigo.get(e.tipoTesteCodigo)?.id;
          return {
            tempId: it.tempId,
            r2Key: it.r2Key,
            fileName: it.fileName,
            equipamentoId: e.equipamentoId,
            tipoTesteId: tipoId,
            dados: {
              dataExecucao: e.dataExecucao,
              resultado: e.resultado,
              numeroLaudo: it.dados.numeroLaudo,
              empresaExecutora: it.dados.empresaExecutora,
              responsavelNome: it.dados.responsavelNome,
              responsavelRegistro: it.dados.responsavelRegistro,
              validadeMeses: it.dados.validadeMeses,
              pendenciasAcao: it.dados.pendenciasAcao,
            },
            importarAnexo: true,
          };
        });

      if (items.length === 0) {
        setErroGeral('Nenhum item selecionado/validado para criar.');
        setCriando(false);
        return;
      }

      const r = await criarLoteCq(items);
      setSumario(r);

      // Remove os tempIds criados da lista
      const idsCriados = new Set((r.detalhes?.criados || []).map((c) => c.tempId));
      setResultados((prev) => prev.filter((it) => !idsCriados.has(it.tempId)));
      setSelecionados((prev) => {
        const novo = new Set(prev);
        idsCriados.forEach((id) => novo.delete(id));
        return novo;
      });
    } catch (e) {
      setErroGeral(e?.response?.data?.message || 'Erro ao criar lote.');
    } finally {
      setCriando(false);
    }
  };

  const handleDescartar = async () => {
    const r2Keys = resultados.map((it) => it.r2Key).filter(Boolean);
    if (r2Keys.length === 0) {
      setResultados([]);
      setSelecionados(new Set());
      return;
    }
    try {
      await descartarLoteCq(r2Keys);
    } catch { /* nao bloqueia */ }
    setResultados([]);
    setSelecionados(new Set());
    setEdits({});
    setSumario(null);
    setFiles([]);
  };

  if (loadingMeta) {
    return <PageSection><PageState loading /></PageSection>;
  }

  return (
    <div className="space-y-4">
      {/* Sumario apos criar */}
      {sumario ? (
        <PageSection>
          <div
            className="rounded-xl px-4 py-3"
            style={{
              backgroundColor: 'var(--color-success-soft)',
              color: 'var(--color-success)',
            }}
          >
            <FontAwesomeIcon icon={faCircleCheck} className="mr-2" />
            <strong>{sumario.criados}</strong> teste(s) criado(s) com sucesso.
            {sumario.falhas?.length ? (
              <span> {sumario.falhas.length} falha(s).</span>
            ) : null}
          </div>
          {sumario.falhas?.length > 0 ? (
            <ul className="mt-2 text-sm" style={{ color: 'var(--color-danger)' }}>
              {sumario.falhas.map((f, i) => (
                <li key={i}>
                  <strong>{f.fileName || f.tempId}:</strong> {f.erro}
                </li>
              ))}
            </ul>
          ) : null}
        </PageSection>
      ) : null}

      {/* Upload zone */}
      {resultados.length === 0 ? (
        <PageSection title="Selecione PDFs de laudos antigos">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Aceita até <strong>50 PDFs</strong> por lote. A IA extrai os campos e tenta
            casar com seus equipamentos cadastrados. Você revisa e confirma antes de criar
            os registros. Custo: ~US$0,001 por PDF (gpt-4.1-mini).
          </p>

          <div className="mt-3">
            <FileDropZone
              accept="application/pdf"
              multiple
              disabled={extraindo}
              loading={extraindo}
              loadingLabel={`Extraindo ${files.length} PDF(s)...`}
              label="Arraste os PDFs aqui ou"
              ctaLabel="clique para selecionar"
              hint="Apenas PDF — até 50 arquivos por lote"
              onFiles={handleFiles}
            />

            <div className="mt-3 flex justify-end">
              <Button
                onClick={handleExtrair}
                disabled={files.length === 0 || extraindo}
              >
                <FontAwesomeIcon icon={faCheck} />
                <span className="ml-2">
                  {extraindo ? 'Extraindo...' : `Extrair ${files.length} PDF(s)`}
                </span>
              </Button>
            </div>
          </div>

          {files.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              {files.map((f, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg px-2 py-1"
                  style={{ backgroundColor: 'var(--bg-surface-soft)' }}>
                  <span className="truncate">{f.name} ({Math.round(f.size / 1024)} KB)</span>
                  <button
                    type="button"
                    onClick={() => removerFile(i)}
                    className="ml-2 text-xs"
                    style={{ color: 'var(--color-danger)' }}
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {erroGeral ? (
            <div className="mt-3 rounded-xl px-3 py-2 text-sm"
              style={{ backgroundColor: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}>
              {erroGeral}
            </div>
          ) : null}
        </PageSection>
      ) : null}

      {/* Tabela de revisao */}
      {resultados.length > 0 ? (
        <PageSection
          title={`Revisão (${resultados.length} arquivos)`}
        >
          <div className="mb-3 flex items-center justify-between text-sm" style={{ color: 'var(--text-muted)' }}>
            <span>
              Selecione os itens para criar. Itens em vermelho precisam ajuste manual.
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handleDescartar} disabled={criando}>
                <FontAwesomeIcon icon={faTrash} />
                <span className="ml-2">Descartar tudo</span>
              </Button>
              <Button onClick={handleCriar} disabled={criando || selecionados.size === 0}>
                {criando ? 'Criando...' : `Criar selecionados (${selecionados.size})`}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr style={{ color: 'var(--text-muted)' }} className="text-left uppercase">
                  <th className="px-2 py-2"></th>
                  <th className="px-2 py-2">Arquivo</th>
                  <th className="px-2 py-2">Equipamento</th>
                  <th className="px-2 py-2">Tipo de teste</th>
                  <th className="px-2 py-2">Data execução</th>
                  <th className="px-2 py-2">Resultado</th>
                  <th className="px-2 py-2">Confiança</th>
                  <th className="px-2 py-2">IA</th>
                </tr>
              </thead>
              <tbody>
                {resultados.map((it) => {
                  const e = edits[it.tempId] || {};
                  const pronto = itemPronto(it);
                  const selecionado = selecionados.has(it.tempId);
                  const eqSel = equipamentos.find((eq) => eq.id === e.equipamentoId);
                  const modalidadeAtiva = eqSel?.tipo || it.dados?.modalidade;
                  const tiposDisponiveis = modalidadeAtiva
                    ? (tiposPorModalidade.get(modalidadeAtiva) || [])
                    : tipos;

                  return (
                    <tr
                      key={it.tempId}
                      style={{
                        borderTop: '1px solid var(--border-soft)',
                        backgroundColor: !it.ok || (selecionado && !pronto)
                          ? 'var(--color-danger-soft)'
                          : 'transparent',
                      }}
                    >
                      <td className="px-2 py-2">
                        {it.ok ? (
                          <input
                            type="checkbox"
                            checked={selecionado}
                            onChange={() => toggleSelecionado(it.tempId)}
                            disabled={criando}
                          />
                        ) : null}
                      </td>
                      <td className="px-2 py-2 max-w-[180px] truncate" title={it.fileName}>
                        {it.fileName}
                        {!it.ok ? (
                          <div className="text-xs" style={{ color: 'var(--color-danger)' }}>
                            <FontAwesomeIcon icon={faTriangleExclamation} className="mr-1" />
                            {it.erro}
                          </div>
                        ) : null}
                      </td>

                      {it.ok ? (
                        <>
                          <td className="px-2 py-2 min-w-[200px]">
                            <Select
                              value={e.equipamentoId || ''}
                              onChange={(ev) => updateEdit(it.tempId, 'equipamentoId', ev.target.value)}
                              placeholder="Selecione..."
                            >
                              {equipamentosPorUnidade.map(([unidade, lista]) => (
                                <optgroup key={unidade} label={unidade}>
                                  {lista.map((eq) => (
                                    <option key={eq.id} value={eq.id}>
                                      {equipamentoLabel(eq)}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </Select>
                            {it.matchCriterio ? (
                              <div className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                IA: {it.matchCriterio}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-2 py-2 min-w-[200px]">
                            <Select
                              value={
                                e.tipoTesteId ||
                                tiposPorCodigo.get(e.tipoTesteCodigo)?.id ||
                                ''
                              }
                              onChange={(ev) => updateEdit(it.tempId, 'tipoTesteId', ev.target.value)}
                            >
                              <option value="">Selecione...</option>
                              {tiposDisponiveis.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.codigo} — {t.nome}
                                </option>
                              ))}
                            </Select>
                          </td>
                          <td className="px-2 py-2 min-w-[140px]">
                            <DateInput
                              value={e.dataExecucao || ''}
                              onChange={(ev) => updateEdit(it.tempId, 'dataExecucao', ev.target.value)}
                              max={todayISO()}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Select
                              value={e.resultado || 'Aprovado'}
                              onChange={(ev) => updateEdit(it.tempId, 'resultado', ev.target.value)}
                            >
                              {RESULTADOS.map((r) => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                            </Select>
                          </td>
                          <td className="px-2 py-2 text-center">
                            {typeof it.dados?.confianca === 'number' ? (
                              <Badge
                                variant={
                                  it.dados.confianca >= 0.8 ? 'green'
                                  : it.dados.confianca >= 0.5 ? 'yellow'
                                  : 'red'
                                }
                              >
                                {Math.round(it.dados.confianca * 100)}%
                              </Badge>
                            ) : '—'}
                          </td>
                          <td className="px-2 py-2 max-w-[200px] text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            {(it.alertas || []).slice(0, 2).map((a, i) => <div key={i}>• {a}</div>)}
                          </td>
                        </>
                      ) : (
                        <td colSpan={6}></td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </PageSection>
      ) : null}
    </div>
  );
}

export default ImportarLoteCqPanel;
