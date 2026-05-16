import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { useToast } from '@/contexts/ToastContext';

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

// Prefixos do código do TipoTesteQualidade → categoria humanizada.
// Codigos seguem o padrão CQ_* (Controle de Qualidade) e LR_* (Levantamento
// Radiométrico) conforme catálogo simplificado em
// prisma/migrations/20260514000004_simplificar_catalogo_cq.
const CATEGORIA_LABELS = {
  CQ: 'Controle de Qualidade',
  LR: 'Levantamento Radiométrico',
};

function categoriaDoTipoTeste(tipoTeste) {
  if (!tipoTeste) return null;
  const codigo = tipoTeste.codigo || '';
  const prefixo = codigo.split('_')[0];
  if (CATEGORIA_LABELS[prefixo]) return CATEGORIA_LABELS[prefixo];
  // Fallback: usa a parte antes do "—" do nome ("Controle de Qualidade — TC").
  const nome = tipoTeste.nome || '';
  const antesDoTraco = nome.split('—')[0].trim();
  return antesDoTraco || null;
}

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

function ControleQualidadeGeralTab() {
  const navigate = useNavigate();
  const { addToast } = useToast();
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

  // KPI ativo = derivado dos filtros aplicados. Só destacam-se os 4 cards
  // com filtro equivalente; "Sem programa" não é filtrável aqui (são
  // equipamentos regulados sem nenhum teste registrado).
  const activeKpi = useMemo(() => {
    if (filtros.resultado === 'Aprovado') return 'aprovados';
    if (filtros.resultado === 'Reprovado') return 'reprovados';
    if (filtros.statusVencimento === 'vencendo') return 'vencendo';
    if (filtros.statusVencimento === 'vencido') return 'vencidos';
    return null;
  }, [filtros.resultado, filtros.statusVencimento]);

  // Cada KPI clicável aplica seu filtro e zera os filtros conflitantes
  // (resultado/statusVencimento), preservando modalidade e busca.
  // "Sem programa" é diferente: navega para a aba de Equipamentos cadastrados
  // com filtro de IDs (são equipamentos sem testes registrados — não filtra
  // a tabela de "Testes registrados" aqui).
  const handleSelectKpi = useCallback((key) => {
    if (key === 'semPrograma') {
      const lista = Array.isArray(metricas?.equipamentosSemPrograma)
        ? metricas.equipamentosSemPrograma
        : null;

      if (lista === null) {
        addToast(
          'A lista de equipamentos sem programa não veio do servidor. Atualize a página e tente novamente.',
          'warning'
        );
        return;
      }

      const ids = lista.map((eq) => eq?.id).filter(Boolean);

      if (ids.length === 0) {
        addToast('Nenhum equipamento regulado está sem programa CQ no momento.', 'info');
        return;
      }

      navigate('/equipamentos', {
        state: {
          equipamentoIds: ids,
          equipamentoIdsLabel: 'Sem programa CQ',
        },
      });
      return;
    }
    setFiltros((f) => {
      const base = { ...f, resultado: '', statusVencimento: '' };
      if (key === 'aprovados') base.resultado = 'Aprovado';
      else if (key === 'reprovados') base.resultado = 'Reprovado';
      else if (key === 'vencendo') base.statusVencimento = 'vencendo';
      else if (key === 'vencidos') base.statusVencimento = 'vencido';
      return base;
    });
  }, [metricas, navigate, addToast]);

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
      <ControleQualidadeKpiGrid
        metricas={metricas}
        activeKpi={activeKpi}
        onSelectKpi={handleSelectKpi}
      />

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
                  <th className="px-3 py-2">Unidade</th>
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
                  const nomePrincipal = eq?.apelido || eq?.modelo || '—';
                  const linhaSecundaria = [
                    eq?.apelido ? eq?.modelo : null,
                    eq?.tag,
                  ]
                    .filter(Boolean)
                    .join(' · ');
                  const categoria = categoriaDoTipoTeste(t.tipoTeste);
                  return (
                    <tr key={t.id} style={{ borderTop: '1px solid var(--border-soft)' }}>
                      <td className="px-3 py-2">
                        <div className="font-semibold">{nomePrincipal}</div>
                        {linhaSecundaria ? (
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {linhaSecundaria}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">{eq?.unidade?.nomeSistema || '—'}</td>
                      <td className="px-3 py-2">{t.tipoTeste?.modalidade || '—'}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{categoria || t.tipoTeste?.codigo || '—'}</div>
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

export default ControleQualidadeGeralTab;
