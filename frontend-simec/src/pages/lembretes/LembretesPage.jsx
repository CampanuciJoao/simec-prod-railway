import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBell,
  faCheck,
  faCircleCheck,
  faClock,
  faLink,
  faPencil,
  faPlus,
  faTrash,
  faXmark,
  faUserTag,
} from '@fortawesome/free-solid-svg-icons';

import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  PageLayout,
  PageSection,
  SelectMenu,
  SkeletonList,
} from '@/components/ui';
import ModalLembrete from '@/components/lembretes/ModalLembrete';
import { useLembretes } from '@/contexts/LembretesContext';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  concluirLembrete,
  descartarLembrete,
  excluirLembrete,
  getLembretes,
} from '@/services/api';

const LABELS_ENTIDADE = {
  OS_CORRETIVA: 'OS',
  EQUIPAMENTO: 'Equipamento',
  UNIDADE: 'Unidade',
  SEGURO: 'Seguro',
  CONTRATO: 'Contrato',
};
const ROTAS_ENTIDADE = {
  OS_CORRETIVA: (id) => `/manutencoes/ocorrencia/${id}`,
  EQUIPAMENTO: (id) => `/equipamentos/detalhes/${id}`,
  UNIDADE: (id) => `/unidades/${id}`,
  SEGURO: (id) => `/seguros/detalhes/${id}`,
  CONTRATO: (id) => `/contratos/detalhes/${id}`,
};
const RECORRENCIA_LABEL = {
  UNICA:   '— uma vez',
  DIARIA:  '🔁 diário',
  SEMANAL: '🔁 semanal',
  MENSAL:  '🔁 mensal',
};
const STATUS_LABEL = {
  PENDENTE:   { label: 'Pendente',    color: 'bg-blue-100 text-blue-700' },
  ENVIADO:    { label: 'Enviado',     color: 'bg-amber-100 text-amber-700' },
  CONCLUIDO:  { label: 'Concluído',   color: 'bg-green-100 text-green-700' },
  DESCARTADO: { label: 'Descartado',  color: 'bg-slate-100 text-slate-600' },
};

function formatarDataHora(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function LembretesPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const auth = useAuth();
  const usuarioAtual = auth?.usuario || auth?.user || null;
  const { recarregar: recarregarContexto } = useLembretes();

  const [filtros, setFiltros] = useState({ escopo: 'meus', status: 'ABERTOS' });
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [lembreteEditando, setLembreteEditando] = useState(null);

  const buscar = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getLembretes({ escopo: filtros.escopo, status: filtros.status, limite: 200 });
      setItens(Array.isArray(r) ? r : []);
    } catch (err) {
      toast?.addToast?.('Erro ao carregar lembretes.', 'error');
      setItens([]);
    } finally {
      setLoading(false);
    }
  }, [filtros, toast]);

  useEffect(() => { buscar(); }, [buscar]);

  const abrirNovo = () => {
    setLembreteEditando(null);
    setModalAberto(true);
  };

  const abrirEditar = (l) => {
    setLembreteEditando(l);
    setModalAberto(true);
  };

  const handleConcluir = async (l) => {
    try {
      await concluirLembrete(l.id);
      toast?.addToast?.('Lembrete concluído.', 'success');
      buscar(); recarregarContexto?.();
    } catch (err) {
      toast?.addToast?.(err?.response?.data?.message || 'Erro ao concluir.', 'error');
    }
  };

  const handleDescartar = async (l) => {
    try {
      await descartarLembrete(l.id);
      toast?.addToast?.('Lembrete descartado.', 'info');
      buscar(); recarregarContexto?.();
    } catch (err) {
      toast?.addToast?.(err?.response?.data?.message || 'Erro ao descartar.', 'error');
    }
  };

  const handleExcluir = async (l) => {
    if (!window.confirm) { /* evita bloqueio de lint */ }
    // ModalConfirmacao seria o padrao, mas aqui mantemos simples com toast de erro
    // caso a API bloqueie (ex: nao e criador).
    try {
      await excluirLembrete(l.id);
      toast?.addToast?.('Lembrete excluído.', 'success');
      buscar(); recarregarContexto?.();
    } catch (err) {
      toast?.addToast?.(err?.response?.data?.message || 'Erro ao excluir.', 'error');
    }
  };

  const abrirVinculo = (l) => {
    if (!l.entidadeTipo || !l.entidadeId) return;
    const r = ROTAS_ENTIDADE[l.entidadeTipo];
    if (r) navigate(r(l.entidadeId));
  };

  const stats = useMemo(() => {
    const total = itens.length;
    const pendentes = itens.filter((i) => i.status === 'PENDENTE').length;
    const enviados = itens.filter((i) => i.status === 'ENVIADO').length;
    const atrasados = itens.filter(
      (i) => i.status === 'PENDENTE' && new Date(i.lembrarEm) < new Date()
    ).length;
    return { total, pendentes, enviados, atrasados };
  }, [itens]);

  return (
    <PageLayout>
      <PageHeader
        icon={faBell}
        title="Lembretes"
        subtitle="Crie lembretes pessoais ou atribua tarefas pra outros usuários do seu time."
        actions={
          <Button onClick={abrirNovo}>
            <FontAwesomeIcon icon={faPlus} />
            Novo lembrete
          </Button>
        }
      />

      <PageSection>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Total</p>
            <p className="mt-1 text-2xl font-bold">{stats.total}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Pendentes</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">{stats.pendentes}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Já disparados</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{stats.enviados}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Atrasados</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{stats.atrasados}</p>
          </Card>
        </div>
      </PageSection>

      <PageSection title="Filtros">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <SelectMenu
            label="Escopo"
            value={filtros.escopo}
            onChange={(v) => setFiltros((p) => ({ ...p, escopo: v }))}
            options={[
              { value: 'meus',    label: 'Que eu recebo' },
              { value: 'criados', label: 'Que eu criei' },
              { value: 'todos',   label: 'Todos (criados ou recebidos)' },
            ]}
          />
          <SelectMenu
            label="Status"
            value={filtros.status}
            onChange={(v) => setFiltros((p) => ({ ...p, status: v }))}
            options={[
              { value: 'ABERTOS',    label: 'Abertos (pendentes + enviados)' },
              { value: 'PENDENTE',   label: 'Só pendentes' },
              { value: 'ENVIADO',    label: 'Só já disparados' },
              { value: 'CONCLUIDO',  label: 'Concluídos' },
              { value: 'DESCARTADO', label: 'Descartados' },
              { value: 'TODOS',      label: 'Todos' },
            ]}
          />
        </div>
      </PageSection>

      <PageSection>
        {loading ? (
          <SkeletonList rows={5} />
        ) : itens.length === 0 ? (
          <div className="space-y-3">
            <EmptyState message="Nenhum lembrete encontrado nos filtros selecionados. Crie seu primeiro lembrete para começar." />
            <div className="flex justify-center">
              <Button onClick={abrirNovo}>
                <FontAwesomeIcon icon={faPlus} />
                Novo lembrete
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {itens.map((l) => {
              const atrasado =
                l.status === 'PENDENTE' && new Date(l.lembrarEm) < new Date();
              const statusInfo = STATUS_LABEL[l.status] || STATUS_LABEL.PENDENTE;
              const eCriador = l.criadoPor?.id === usuarioAtual?.id;
              const temVinculo = Boolean(l.entidadeTipo && l.entidadeId);
              return (
                <Card key={l.id} className="p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="min-w-0 truncate text-base font-semibold text-slate-900">
                          {l.titulo}
                        </h4>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                        {atrasado && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                            Atrasado
                          </span>
                        )}
                        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                          {RECORRENCIA_LABEL[l.recorrencia] || ''}
                        </span>
                      </div>

                      {l.descricao && (
                        <p className="mt-1 text-sm text-slate-600">{l.descricao}</p>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <FontAwesomeIcon icon={faClock} />
                          {formatarDataHora(l.lembrarEm)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <FontAwesomeIcon icon={faUserTag} />
                          Para: {l.destinatario?.nome || '—'}
                          {!eCriador && l.criadoPor?.nome && ` · De: ${l.criadoPor.nome}`}
                        </span>
                        {temVinculo && (
                          <button
                            type="button"
                            onClick={() => abrirVinculo(l)}
                            className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            <FontAwesomeIcon icon={faLink} />
                            {l.entidadeLabel || LABELS_ENTIDADE[l.entidadeTipo]}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2 md:flex-col">
                      {(l.status === 'PENDENTE' || l.status === 'ENVIADO') && (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleConcluir(l)}
                            title="Marcar como concluído"
                          >
                            <FontAwesomeIcon icon={faCircleCheck} />
                            Concluir
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => abrirEditar(l)}
                            title="Editar"
                          >
                            <FontAwesomeIcon icon={faPencil} />
                            Editar
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleDescartar(l)}
                            title="Descartar (não quero mais este lembrete)"
                          >
                            <FontAwesomeIcon icon={faXmark} />
                            Descartar
                          </Button>
                        </>
                      )}
                      {eCriador && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleExcluir(l)}
                          title="Excluir definitivamente"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                          Excluir
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </PageSection>

      <ModalLembrete
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        onSaved={() => {
          setModalAberto(false);
          buscar();
          recarregarContexto?.();
        }}
        lembreteInicial={lembreteEditando}
      />
    </PageLayout>
  );
}

export default LembretesPage;
