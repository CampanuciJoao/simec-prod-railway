import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBell,
  faCheck,
  faCircleCheck,
  faCircleExclamation,
  faClock,
  faList,
  faLink,
  faPaperPlane,
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
  KpiCard,
  KpiGrid,
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
  UNICA:   'uma vez',
  DIARIA:  'diário',
  SEMANAL: 'semanal',
  MENSAL:  'mensal',
};
const STATUS_INFO = {
  PENDENTE:   { label: 'Pendente',    bg: 'var(--brand-primary-soft)',   color: 'var(--brand-primary)' },
  ENVIADO:    { label: 'Enviado',     bg: 'var(--color-warning-soft)',   color: 'var(--color-warning)' },
  CONCLUIDO:  { label: 'Concluído',   bg: 'var(--color-success-soft)',   color: 'var(--color-success)' },
  DESCARTADO: { label: 'Descartado',  bg: 'var(--bg-surface-subtle)',    color: 'var(--text-muted)' },
};

function formatarDataHora(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/**
 * Devolve um rotulo relativo tipo "em 2h", "em 3 dias", "atrasado 15min".
 * Negativo = atrasado; positivo = futuro.
 */
function rotuloRelativo(iso) {
  const alvo = new Date(iso);
  if (Number.isNaN(alvo.getTime())) return '';
  const diff = alvo.getTime() - Date.now();
  const abs = Math.abs(diff);
  const min = Math.round(abs / 60000);
  const hora = Math.round(min / 60);
  const dia = Math.round(hora / 24);
  const texto = min < 1
    ? 'agora'
    : min < 60
      ? `${min}min`
      : hora < 24
        ? `${hora}h`
        : `${dia} ${dia === 1 ? 'dia' : 'dias'}`;
  return diff < 0 ? `atrasado ${texto}` : `em ${texto}`;
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
    <PageLayout padded fullHeight>
      <div className="space-y-6">
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

        <KpiGrid className="md:grid-cols-4">
          <KpiCard icon={faList} title="Total" value={stats.total} tone="slate" />
          <KpiCard icon={faClock} title="Pendentes" value={stats.pendentes} tone="blue" />
          <KpiCard icon={faPaperPlane} title="Já disparados" value={stats.enviados} tone="orange" />
          <KpiCard icon={faCircleExclamation} title="Atrasados" value={stats.atrasados} tone="red" />
        </KpiGrid>

        <PageSection title="Filtros">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
              {itens.map((l) => (
                <LembreteCard
                  key={l.id}
                  lembrete={l}
                  usuarioAtual={usuarioAtual}
                  onConcluir={handleConcluir}
                  onEditar={abrirEditar}
                  onDescartar={handleDescartar}
                  onExcluir={handleExcluir}
                  onAbrirVinculo={abrirVinculo}
                />
              ))}
            </div>
          )}
        </PageSection>
      </div>

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

function LembreteCard({
  lembrete,
  usuarioAtual,
  onConcluir,
  onEditar,
  onDescartar,
  onExcluir,
  onAbrirVinculo,
}) {
  const l = lembrete;
  const atrasado = l.status === 'PENDENTE' && new Date(l.lembrarEm) < new Date();
  const statusInfo = STATUS_INFO[l.status] || STATUS_INFO.PENDENTE;
  const eCriador = l.criadoPor?.id === usuarioAtual?.id;
  const temVinculo = Boolean(l.entidadeTipo && l.entidadeId);
  const ativo = l.status === 'PENDENTE' || l.status === 'ENVIADO';

  return (
    <Card
      className="relative overflow-hidden rounded-2xl p-4"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: atrasado ? 'var(--color-danger-soft)' : 'var(--border-soft)',
      }}
    >
      {/* Faixa colorida — vermelha se atrasado, laranja se enviado, azul se pendente */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${statusInfo.color}, transparent)`,
          opacity: 0.7,
          pointerEvents: 'none',
        }}
      />

      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4
              className="min-w-0 text-base font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {l.titulo}
            </h4>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}
            >
              {statusInfo.label}
            </span>
            {atrasado && (
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{ backgroundColor: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}
              >
                Atrasado
              </span>
            )}
            <span
              className="font-mono text-[10px] uppercase tracking-[0.14em]"
              style={{ color: 'var(--text-muted)' }}
            >
              · {RECORRENCIA_LABEL[l.recorrencia] || ''}
            </span>
          </div>

          {l.descricao && (
            <p
              className="mt-1.5 text-sm leading-snug"
              style={{ color: 'var(--text-secondary)' }}
            >
              {l.descricao}
            </p>
          )}

          <div
            className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            <span className="inline-flex items-center gap-1.5">
              <FontAwesomeIcon icon={faClock} />
              <span style={{ color: 'var(--text-secondary)' }}>
                {formatarDataHora(l.lembrarEm)}
              </span>
              {ativo && (
                <span
                  className="ml-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{
                    backgroundColor: atrasado ? 'var(--color-danger-soft)' : 'var(--bg-surface-subtle)',
                    color: atrasado ? 'var(--color-danger)' : 'var(--text-muted)',
                  }}
                >
                  {rotuloRelativo(l.lembrarEm)}
                </span>
              )}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <FontAwesomeIcon icon={faUserTag} />
              <span style={{ color: 'var(--text-secondary)' }}>
                Para: {l.destinatario?.nome || '—'}
              </span>
              {!eCriador && l.criadoPor?.nome && (
                <span>· De: {l.criadoPor.nome}</span>
              )}
            </span>
            {temVinculo && (
              <button
                type="button"
                onClick={() => onAbrirVinculo(l)}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold transition"
                style={{
                  backgroundColor: 'var(--brand-primary-soft)',
                  color: 'var(--brand-primary)',
                }}
              >
                <FontAwesomeIcon icon={faLink} />
                {l.entidadeLabel || LABELS_ENTIDADE[l.entidadeTipo]}
              </button>
            )}
            {Array.isArray(l.canais) && l.canais.length > 0 && (
              <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider">
                {l.canais.filter((c) => c !== 'PAINEL').map((c) => c.toLowerCase()).join(' · ') || 'só painel'}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
          {ativo && (
            <>
              <Button variant="secondary" size="sm" onClick={() => onConcluir(l)} title="Concluir">
                <FontAwesomeIcon icon={faCircleCheck} />
                Concluir
              </Button>
              <Button variant="secondary" size="sm" onClick={() => onEditar(l)} title="Editar">
                <FontAwesomeIcon icon={faPencil} />
                Editar
              </Button>
              <Button variant="secondary" size="sm" onClick={() => onDescartar(l)} title="Descartar">
                <FontAwesomeIcon icon={faXmark} />
                Descartar
              </Button>
            </>
          )}
          {eCriador && (
            <Button variant="secondary" size="sm" onClick={() => onExcluir(l)} title="Excluir">
              <FontAwesomeIcon icon={faTrash} />
              Excluir
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export default LembretesPage;
