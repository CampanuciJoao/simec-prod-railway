import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faClipboardList,
  faExternalLinkAlt,
  faTrash,
  faFilePdf,
} from '@fortawesome/free-solid-svg-icons';

import {
  Button,
  PageSection,
  PageState,
  Select,
  Input,
  Badge,
  ModalConfirmacao,
  Textarea,
  GlobalFilterBar,
} from '@/components/ui';

import {
  getDashboardCq,
  listarTestesCq,
  excluirTesteCq,
} from '@/services/api';
import { getEquipamentos } from '@/services/api/equipamentosApi';
import { getUnidades } from '@/services/api/unidadesApi';
import { exportarConformidadeCqPDF } from '@/services/api/pdfApi';

import ControleQualidadeKpiGrid from './ControleQualidadeKpiGrid';
import RegistrarTesteForm from './RegistrarTesteForm';

const RESULTADO_BADGES = {
  Aprovado:                { variant: 'green', label: 'Aprovado' },
  AprovadoComRestricoes:   { variant: 'yellow', label: 'Aprov. c/ restr.' },
  Reprovado:               { variant: 'red', label: 'Reprovado' },
};

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

function diasParaVencimento(data) {
  if (!data) return null;
  const ms = new Date(data).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

function statusVencimento(testes) {
  // testes[0] eh o mais recente — usado para coluna 'status'
  return null;
}

function ControleQualidadeFrotaTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metricas, setMetricas] = useState({});
  const [testes, setTestes] = useState([]);
  const [equipamentos, setEquipamentos] = useState([]);
  const [filtros, setFiltros] = useState({
    modalidade: '',
    resultado: '',
    statusVencimento: '',
    search: '',
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerEquipamentoId, setDrawerEquipamentoId] = useState(null);

  const [excluirModal, setExcluirModal] = useState({ open: false, teste: null, motivo: '' });

  const [unidades, setUnidades] = useState([]);
  const [pdfModal, setPdfModal] = useState({ open: false, unidadeId: '', responsavel: '', exportando: false });

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, testesRes, eqRes, unidadesRes] = await Promise.all([
        getDashboardCq(),
        listarTestesCq({ pageSize: 100 }),
        getEquipamentos({ pageSize: 500 }),
        getUnidades().catch(() => []),
      ]);
      setMetricas(dashRes || {});
      setTestes(testesRes?.items || []);
      setEquipamentos(eqRes?.items || []);
      setUnidades(Array.isArray(unidadesRes) ? unidadesRes : (unidadesRes?.items || []));
    } catch (e) {
      setError(e?.response?.data?.message || 'Erro ao carregar Controle de Qualidade.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const modalidades = useMemo(
    () => [...new Set(equipamentos.map((e) => e.tipo).filter(Boolean))].sort(),
    [equipamentos]
  );

  const testesFiltrados = useMemo(() => {
    return testes.filter((t) => {
      if (filtros.modalidade && t.tipoTeste?.modalidade !== filtros.modalidade) return false;
      if (filtros.resultado && t.resultado !== filtros.resultado) return false;
      if (filtros.statusVencimento) {
        const dias = diasParaVencimento(t.proximoVencimento);
        if (filtros.statusVencimento === 'vencido' && (dias === null || dias >= 0)) return false;
        if (filtros.statusVencimento === 'vencendo' && (dias === null || dias < 0 || dias > 30)) return false;
        if (filtros.statusVencimento === 'em_dia' && (dias === null || dias <= 30)) return false;
      }
      if (filtros.search) {
        const q = filtros.search.toLowerCase();
        const eq = t.equipamento;
        const haystack = [
          eq?.modelo, eq?.tag, eq?.apelido,
          t.tipoTeste?.codigo, t.tipoTeste?.nome,
          t.numeroLaudo, t.empresaExecutora, t.responsavelNome,
        ].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [testes, filtros]);

  const handleExcluir = async () => {
    const teste = excluirModal.teste;
    const motivo = excluirModal.motivo.trim();
    if (!teste || motivo.length < 10) return;
    try {
      await excluirTesteCq(teste.id, motivo);
      setExcluirModal({ open: false, teste: null, motivo: '' });
      carregar();
    } catch (e) {
      alert(e?.response?.data?.message || 'Erro ao excluir teste.');
    }
  };

  if (loading) {
    return <PageSection><PageState loading /></PageSection>;
  }

  if (error) {
    return <PageSection><PageState error={error} /></PageSection>;
  }

  return (
    <div className="space-y-6">
      <ControleQualidadeKpiGrid metricas={metricas} />

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          variant="secondary"
          onClick={() => setPdfModal({ open: true, unidadeId: '', responsavel: '', exportando: false })}
          disabled={unidades.length === 0}
          title="Gera PDF de conformidade ANVISA RDC 611/2022 por unidade"
        >
          <FontAwesomeIcon icon={faFilePdf} />
          <span className="ml-2">Exportar PDF</span>
        </Button>
        <Button onClick={() => { setDrawerEquipamentoId(null); setDrawerOpen(true); }}>
          <FontAwesomeIcon icon={faPlus} />
          <span className="ml-2">Registrar CQ</span>
        </Button>
      </div>

      <GlobalFilterBar
        searchTerm={filtros.search}
        onSearchChange={(e) => setFiltros((f) => ({ ...f, search: e.target.value }))}
        searchPlaceholder="Modelo, tag, laudo, responsável..."
        selectFilters={[
          {
            id: 'modalidade',
            label: 'Modalidade',
            value: filtros.modalidade,
            onChange: (v) => setFiltros((f) => ({ ...f, modalidade: v })),
            options: modalidades.map((m) => ({ value: m, label: m })),
          },
          {
            id: 'resultado',
            label: 'Resultado',
            value: filtros.resultado,
            onChange: (v) => setFiltros((f) => ({ ...f, resultado: v })),
            options: [
              { value: 'Aprovado', label: 'Aprovado' },
              { value: 'AprovadoComRestricoes', label: 'Aprov. c/ restrições' },
              { value: 'Reprovado', label: 'Reprovado' },
            ],
          },
          {
            id: 'statusVencimento',
            label: 'Vencimento',
            value: filtros.statusVencimento,
            onChange: (v) => setFiltros((f) => ({ ...f, statusVencimento: v })),
            options: [
              { value: 'vencido', label: 'Vencido' },
              { value: 'vencendo', label: 'Vencendo (≤30d)' },
              { value: 'em_dia', label: 'Em dia' },
            ],
          },
        ]}
      />

      <PageSection title="Testes registrados">
        {testesFiltrados.length === 0 ? (
          <PageState
            isEmpty
            emptyMessage="Nenhum teste de qualidade encontrado com os filtros atuais."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr style={{ color: 'var(--text-muted)' }} className="text-left text-xs uppercase">
                  <th className="px-3 py-2">Equipamento</th>
                  <th className="px-3 py-2">Modalidade</th>
                  <th className="px-3 py-2">Tipo de teste</th>
                  <th className="px-3 py-2">Última execução</th>
                  <th className="px-3 py-2">Próx. vencimento</th>
                  <th className="px-3 py-2">Resultado</th>
                  <th className="px-3 py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {testesFiltrados.map((t) => {
                  const dias = diasParaVencimento(t.proximoVencimento);
                  const badge = RESULTADO_BADGES[t.resultado];
                  const eq = t.equipamento;
                  return (
                    <tr key={t.id} style={{ borderTop: '1px solid var(--border-soft)' }}>
                      <td className="px-3 py-2">
                        <div className="font-semibold">{eq?.modelo || '—'}</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {eq?.tag || ''}{eq?.apelido ? ` · ${eq.apelido}` : ''}
                        </div>
                      </td>
                      <td className="px-3 py-2">{t.tipoTeste?.modalidade || '—'}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{t.tipoTeste?.codigo}</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {t.tipoTeste?.nome}
                        </div>
                      </td>
                      <td className="px-3 py-2">{fmt(t.dataExecucao)}</td>
                      <td className="px-3 py-2">
                        <span>{fmt(t.proximoVencimento)}</span>
                        {dias !== null ? (
                          <div
                            className="text-xs"
                            style={{
                              color:
                                dias < 0
                                  ? 'var(--color-danger)'
                                  : dias <= 30
                                  ? 'var(--color-warning)'
                                  : 'var(--text-muted)',
                            }}
                          >
                            {dias < 0
                              ? `Vencido há ${Math.abs(dias)}d`
                              : dias === 0
                              ? 'Vence hoje'
                              : `Em ${dias}d`}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        {badge ? <Badge variant={badge.variant}>{badge.label}</Badge> : <Badge variant="slate">Pendente</Badge>}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          {eq?.id ? (
                            <Link
                              to={`/equipamentos/detalhes/${eq.id}`}
                              state={{ tab: 'controleQualidade' }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded border"
                              style={{ borderColor: 'var(--border-soft)' }}
                              title="Abrir ficha do equipamento"
                            >
                              <FontAwesomeIcon icon={faExternalLinkAlt} className="text-xs" />
                            </Link>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => setExcluirModal({ open: true, teste: t, motivo: '' })}
                            className="inline-flex h-8 w-8 items-center justify-center rounded border"
                            style={{ borderColor: 'var(--border-soft)', color: 'var(--color-danger)' }}
                            title="Excluir (com justificativa)"
                          >
                            <FontAwesomeIcon icon={faTrash} className="text-xs" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>

      <RegistrarTesteForm
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        equipamentos={equipamentos}
        equipamentoIdInicial={drawerEquipamentoId}
        onCreated={() => carregar()}
      />

      <ModalConfirmacao
        isOpen={pdfModal.open}
        onClose={() => setPdfModal({ open: false, unidadeId: '', responsavel: '', exportando: false })}
        onConfirm={async () => {
          if (!pdfModal.unidadeId) return;
          setPdfModal((s) => ({ ...s, exportando: true }));
          try {
            await exportarConformidadeCqPDF({
              unidadeId: pdfModal.unidadeId,
              responsavelTecnico: pdfModal.responsavel?.trim() || null,
            });
            setPdfModal({ open: false, unidadeId: '', responsavel: '', exportando: false });
          } catch (e) {
            alert(e?.response?.data?.message || 'Erro ao gerar PDF.');
            setPdfModal((s) => ({ ...s, exportando: false }));
          }
        }}
        title="Exportar PDF de Conformidade ANVISA"
        message="O PDF consolida todos os equipamentos regulados da unidade selecionada (Mamografia, TC, RX, Densitometria, RM, US) com status de conformidade RDC 611/2022 e pendências abertas."
        confirmText={pdfModal.exportando ? 'Gerando...' : 'Gerar PDF'}
        confirmDisabled={!pdfModal.unidadeId || pdfModal.exportando}
      >
        <div className="mt-3 space-y-3">
          <div>
            <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Unidade *
            </label>
            <Select
              value={pdfModal.unidadeId}
              onChange={(e) => setPdfModal((s) => ({ ...s, unidadeId: e.target.value }))}
            >
              <option value="">Selecione a unidade...</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>{u.nomeSistema}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Responsável técnico (opcional)
            </label>
            <Input
              value={pdfModal.responsavel}
              onChange={(e) => setPdfModal((s) => ({ ...s, responsavel: e.target.value }))}
              placeholder="Nome e registro do físico médico responsável"
            />
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              Aparece acima da linha de assinatura no rodapé do PDF.
            </p>
          </div>
        </div>
      </ModalConfirmacao>

      <ModalConfirmacao
        isOpen={excluirModal.open}
        onClose={() => setExcluirModal({ open: false, teste: null, motivo: '' })}
        onConfirm={handleExcluir}
        title="Excluir teste de qualidade"
        message="Esta ação registra exclusão na auditoria com a justificativa abaixo. O laudo PDF permanece arquivado por 5 anos."
        isDestructive
        confirmDisabled={excluirModal.motivo.trim().length < 10}
        confirmText="Confirmar exclusão"
      >
        <div className="mt-3">
          <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Justificativa (mín. 10 caracteres) *
          </label>
          <Textarea
            rows={3}
            value={excluirModal.motivo}
            onChange={(e) => setExcluirModal((s) => ({ ...s, motivo: e.target.value }))}
            placeholder="Ex: PDF anexado ao equipamento errado, vou recadastrar."
          />
        </div>
      </ModalConfirmacao>
    </div>
  );
}

export default ControleQualidadeFrotaTab;
