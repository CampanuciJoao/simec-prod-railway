import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/contexts/ToastContext';

import {
  getDashboardCq,
  listarTestesCq,
  excluirTesteCq,
} from '@/services/api';
import { getEquipamentos } from '@/services/api/equipamentosApi';
import { getUnidades } from '@/services/api/unidadesApi';
import { exportarConformidadeCqPDF } from '@/services/api/pdfApi';

const FILTROS_INICIAIS = {
  modalidade: '',
  resultado: '',
  statusVencimento: '',
  search: '',
};

function diasParaVencimento(data) {
  if (!data) return null;
  const ms = new Date(data).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

export function useControleQualidadeGeral() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metricas, setMetricas] = useState({});
  const [testes, setTestes] = useState([]);
  const [equipamentos, setEquipamentos] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerEquipamentoId, setDrawerEquipamentoId] = useState(null);

  const [excluirModal, setExcluirModal] = useState({ open: false, teste: null, motivo: '' });
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

  const activeKpi = useMemo(() => {
    if (filtros.resultado === 'Aprovado') return 'aprovados';
    if (filtros.resultado === 'Reprovado') return 'reprovados';
    if (filtros.statusVencimento === 'vencendo') return 'vencendo';
    if (filtros.statusVencimento === 'vencido') return 'vencidos';
    return null;
  }, [filtros.resultado, filtros.statusVencimento]);

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

  const handleExcluir = useCallback(async () => {
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
  }, [excluirModal, carregar]);

  const handleExportarPdf = useCallback(async () => {
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
  }, [pdfModal]);

  const setFiltro = useCallback((campo, valor) => {
    setFiltros((f) => ({ ...f, [campo]: valor }));
  }, []);

  const abrirDrawer = useCallback((equipamentoId = null) => {
    setDrawerEquipamentoId(equipamentoId);
    setDrawerOpen(true);
  }, []);

  const fecharDrawer = useCallback(() => setDrawerOpen(false), []);

  return {
    loading,
    error,
    metricas,
    equipamentos,
    unidades,
    filtros,
    setFiltro,
    modalidades,
    activeKpi,
    testesFiltrados,
    handleSelectKpi,
    drawerOpen,
    drawerEquipamentoId,
    abrirDrawer,
    fecharDrawer,
    excluirModal,
    setExcluirModal,
    handleExcluir,
    pdfModal,
    setPdfModal,
    handleExportarPdf,
    recarregar: carregar,
  };
}

export { diasParaVencimento };
