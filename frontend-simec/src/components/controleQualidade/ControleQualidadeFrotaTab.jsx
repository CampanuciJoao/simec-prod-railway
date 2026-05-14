import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faClipboardList,
  faExternalLinkAlt,
  faTrash,
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
} from '@/components/ui';

import {
  getDashboardCq,
  listarTestesCq,
  excluirTesteCq,
} from '@/services/api';
import { getEquipamentos } from '@/services/api/equipamentosApi';

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

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, testesRes, eqRes] = await Promise.all([
        getDashboardCq(),
        listarTestesCq({ pageSize: 100 }),
        getEquipamentos({ pageSize: 500 }),
      ]);
      setMetricas(dashRes || {});
      setTestes(testesRes?.items || []);
      setEquipamentos(eqRes?.items || []);
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

      <PageSection>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px]">
            <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>
              Buscar
            </label>
            <Input
              value={filtros.search}
              onChange={(e) => setFiltros((f) => ({ ...f, search: e.target.value }))}
              placeholder="Modelo, tag, laudo, responsável..."
            />
          </div>
          <div className="min-w-[160px]">
            <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>
              Modalidade
            </label>
            <Select
              value={filtros.modalidade}
              onChange={(e) => setFiltros((f) => ({ ...f, modalidade: e.target.value }))}
            >
              <option value="">Todas</option>
              {modalidades.map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>
          </div>
          <div className="min-w-[150px]">
            <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>
              Resultado
            </label>
            <Select
              value={filtros.resultado}
              onChange={(e) => setFiltros((f) => ({ ...f, resultado: e.target.value }))}
            >
              <option value="">Todos</option>
              <option value="Aprovado">Aprovado</option>
              <option value="AprovadoComRestricoes">Aprov. c/ restrições</option>
              <option value="Reprovado">Reprovado</option>
            </Select>
          </div>
          <div className="min-w-[150px]">
            <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>
              Vencimento
            </label>
            <Select
              value={filtros.statusVencimento}
              onChange={(e) => setFiltros((f) => ({ ...f, statusVencimento: e.target.value }))}
            >
              <option value="">Todos</option>
              <option value="vencido">Vencido</option>
              <option value="vencendo">Vencendo (≤30d)</option>
              <option value="em_dia">Em dia</option>
            </Select>
          </div>
          <div className="ml-auto">
            <Button onClick={() => { setDrawerEquipamentoId(null); setDrawerOpen(true); }}>
              <FontAwesomeIcon icon={faPlus} />
              <span className="ml-2">Registrar teste</span>
            </Button>
          </div>
        </div>
      </PageSection>

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
