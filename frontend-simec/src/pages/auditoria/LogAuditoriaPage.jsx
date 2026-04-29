import React, { useCallback, useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner,
  faCalendarAlt,
  faClipboardList,
  faShieldHalved,
  faBoxArchive,
  faWrench,
} from '@fortawesome/free-solid-svg-icons';

import { useAuditoria } from '@/hooks/auditoria/useAuditoria';
import { getLogAuditoria } from '@/services/api';
import { getHistoricoAlertas } from '@/services/api/alertasApi';
import { formatarDataHora } from '@/utils/timeUtils';

import {
  Button,
  DateInput,
  PageHeader,
  PageLayout,
  PageSection,
  PageState,
} from '@/components/ui';

// ─── Shared ──────────────────────────────────────────────────────────────────

function ActionBadge({ label, tone = 'slate' }) {
  const toneMap = {
    slate:  'bg-slate-100  text-slate-700  border-slate-200',
    green:  'bg-emerald-100 text-emerald-700 border-emerald-200',
    blue:   'bg-blue-100   text-blue-700   border-blue-200',
    red:    'bg-red-100    text-red-700    border-red-200',
    violet: 'bg-violet-100 text-violet-700 border-violet-200',
    yellow: 'bg-amber-100  text-amber-700  border-amber-200',
  };
  return (
    <span className={['inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold', toneMap[tone]].join(' ')}>
      {label || 'N/A'}
    </span>
  );
}

function acaoTone(acao = '') {
  const a = acao.toLowerCase();
  if (a.includes('cria') || a.includes('abertura')) return 'green';
  if (a.includes('edit') || a.includes('atualiz')) return 'blue';
  if (a.includes('exclu') || a.includes('delet') || a.includes('cancel')) return 'red';
  if (a.includes('login')) return 'violet';
  return 'slate';
}

function prioridadeTone(p = '') {
  if (p === '1' || p === 'alta' || p === 'critica') return 'red';
  if (p === '2' || p === 'media') return 'yellow';
  return 'slate';
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'acoes',   label: 'Ações do sistema',    icon: faClipboardList },
  { id: 'ordens',  label: 'Ordens de serviço',   icon: faWrench        },
  { id: 'alertas', label: 'Histórico de alertas', icon: faBoxArchive   },
];

function TabBar({ active, onChange }) {
  return (
    <div className="flex gap-1 rounded-xl p-1" style={{ backgroundColor: 'var(--surface-secondary)' }}>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={[
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition',
            active === tab.id
              ? 'bg-white shadow-sm'
              : 'hover:bg-white/60',
          ].join(' ')}
          style={{ color: active === tab.id ? 'var(--text-primary)' : 'var(--text-muted)' }}
        >
          <FontAwesomeIcon icon={tab.icon} className="text-xs" />
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─── Tab 1: Ações do sistema ─────────────────────────────────────────────────

function AcoesTab() {
  const {
    logs,
    loading,
    loadingMore,
    pagination,
    filtros,
    setFiltros,
    opcoesFiltro,
    carregarMaisLogs,
  } = useAuditoria();

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  };

  const isInitialLoading = loading && logs.length === 0;
  const isEmpty = !loading && logs.length === 0;

  return (
    <div className="space-y-6">
      <PageSection
        title="Filtros"
        description="Refine por usuário, ação, entidade e intervalo de datas."
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Usuário</label>
            <select
              name="autorId"
              value={filtros.autorId}
              onChange={handleFiltroChange}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">Todos</option>
              {opcoesFiltro.usuarios.map((u) => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-3">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Ação</label>
            <select
              name="acao"
              value={filtros.acao}
              onChange={handleFiltroChange}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">Todas</option>
              {opcoesFiltro.acoes.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-3">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Entidade</label>
            <select
              name="entidade"
              value={filtros.entidade}
              onChange={handleFiltroChange}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">Todas</option>
              {opcoesFiltro.entidades.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-3">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />Data início
            </label>
            <DateInput name="dataInicio" value={filtros.dataInicio} onChange={handleFiltroChange} />
          </div>

          <div className="lg:col-span-3">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />Data fim
            </label>
            <DateInput name="dataFim" value={filtros.dataFim} onChange={handleFiltroChange} />
          </div>
        </div>
      </PageSection>

      <PageSection title="Registros" description="Lista paginada de eventos auditáveis.">
        {isInitialLoading ? (
          <PageState loading />
        ) : isEmpty ? (
          <PageState isEmpty emptyMessage="Nenhum registro encontrado para os filtros selecionados." />
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Data/Hora</th>
                    <th className="px-4 py-3">Usuário</th>
                    <th className="px-4 py-3">Ação</th>
                    <th className="px-4 py-3">Entidade</th>
                    <th className="px-4 py-3">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                        {formatarDataHora(log.timestamp)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">
                        {log.autor?.nome || 'Usuário não identificado'}
                      </td>
                      <td className="px-4 py-3">
                        <ActionBadge label={log.acao} tone={acaoTone(log.acao)} />
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        <div className="font-medium text-slate-800">{log.entidade}</div>
                        {log.entidadeId && (
                          <div className="mt-1 text-xs text-slate-500">{log.entidadeId.substring(0, 8)}…</div>
                        )}
                      </td>
                      <td className="whitespace-pre-wrap break-words px-4 py-3 text-sm text-slate-700">
                        {log.detalhes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.hasNextPage && (
              <div className="flex justify-center pt-5">
                <Button type="button" onClick={carregarMaisLogs} disabled={loadingMore}>
                  {loadingMore ? (
                    <><FontAwesomeIcon icon={faSpinner} spin /> Carregando...</>
                  ) : 'Carregar mais'}
                </Button>
              </div>
            )}
          </>
        )}
      </PageSection>
    </div>
  );
}

// ─── Tab 2: Ordens de Serviço ────────────────────────────────────────────────

const ENTIDADES_OS = ['Manutenção', 'OsCorretiva', 'NotaAndamento', 'VisitaTerceiro'];

function OrdensTab() {
  const [logs, setLogs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filtros, setFiltros]     = useState({ entidade: '', acao: '', dataInicio: '', dataFim: '' });

  const carregar = useCallback(async (p = 1, f = filtros) => {
    p === 1 ? setLoading(true) : setLoadingMore(true);
    try {
      const params = { page: p, limit: 50 };
      // Always restrict to OS entities; allow sub-filter
      if (f.entidade) params.entidade = f.entidade;
      else params.entidades = ENTIDADES_OS.join(',');
      if (f.acao)       params.acao       = f.acao;
      if (f.dataInicio) params.dataInicio = f.dataInicio;
      if (f.dataFim)    params.dataFim    = f.dataFim;

      const data = await getLogAuditoria(params);
      const novos = data?.logs || [];
      setLogs((prev) => p === 1 ? novos : [...prev, ...novos]);
      setHasNextPage(Boolean(data?.pagination?.hasNextPage));
      setCurrentPage(data?.pagination?.page || p);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filtros]);

  useEffect(() => { carregar(1, filtros); }, [filtros]);

  const handleFiltro = (e) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  };

  const isEmpty = !loading && logs.length === 0;

  return (
    <div className="space-y-6">
      <PageSection title="Filtros" description="Filtre por tipo de entidade, ação e período.">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Entidade</label>
            <select
              name="entidade"
              value={filtros.entidade}
              onChange={handleFiltro}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">Todas</option>
              {ENTIDADES_OS.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          <div className="lg:col-span-3">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Ação</label>
            <select
              name="acao"
              value={filtros.acao}
              onChange={handleFiltro}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">Todas</option>
              {['CRIAÇÃO', 'EDIÇÃO', 'EXCLUSÃO', 'UPLOAD'].map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-3">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              <FontAwesomeIcon icon={faCalendarAlt} className="mr-1" />Data início
            </label>
            <DateInput name="dataInicio" value={filtros.dataInicio} onChange={handleFiltro} />
          </div>

          <div className="lg:col-span-3">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              <FontAwesomeIcon icon={faCalendarAlt} className="mr-1" />Data fim
            </label>
            <DateInput name="dataFim" value={filtros.dataFim} onChange={handleFiltro} />
          </div>
        </div>
      </PageSection>

      <PageSection title="Registros de ordens" description="Histórico de ações em manutenções, OS corretivas, notas e visitas.">
        {loading ? (
          <PageState loading />
        ) : isEmpty ? (
          <PageState isEmpty emptyMessage="Nenhum registro encontrado." />
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Data/Hora</th>
                    <th className="px-4 py-3">Usuário</th>
                    <th className="px-4 py-3">Ação</th>
                    <th className="px-4 py-3">Entidade</th>
                    <th className="px-4 py-3">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                        {formatarDataHora(log.timestamp)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">
                        {log.autor?.nome || 'Sistema'}
                      </td>
                      <td className="px-4 py-3">
                        <ActionBadge label={log.acao} tone={acaoTone(log.acao)} />
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{log.entidade}</td>
                      <td className="whitespace-pre-wrap break-words px-4 py-3 text-sm text-slate-700">
                        {log.detalhes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasNextPage && (
              <div className="flex justify-center pt-5">
                <Button type="button" onClick={() => carregar(currentPage + 1)} disabled={loadingMore}>
                  {loadingMore
                    ? <><FontAwesomeIcon icon={faSpinner} spin /> Carregando...</>
                    : 'Carregar mais'}
                </Button>
              </div>
            )}
          </>
        )}
      </PageSection>
    </div>
  );
}

// ─── Tab 3: Histórico de Alertas ─────────────────────────────────────────────

const PRIORIDADE_LABEL = { '1': 'Alta', '2': 'Média', '3': 'Baixa' };

function AlertasHistoricoTab() {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filtros, setFiltros]   = useState({ tipo: '', prioridade: '', dataInicio: '', dataFim: '', search: '' });

  const carregar = useCallback(async (p = 1, f = filtros) => {
    setLoading(true);
    try {
      const params = { page: p, pageSize: 25 };
      if (f.tipo)       params.tipo       = f.tipo;
      if (f.prioridade) params.prioridade = f.prioridade;
      if (f.dataInicio) params.dataInicio = f.dataInicio;
      if (f.dataFim)    params.dataFim    = f.dataFim;
      if (f.search)     params.search     = f.search;

      const data = await getHistoricoAlertas(params);
      setItems(Array.isArray(data?.data) ? data.data : []);
      setTotalPages(data?.totalPages ?? 1);
      setPage(data?.page ?? p);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => { carregar(1, filtros); }, [filtros]);

  const handleFiltro = (e) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  };

  const isEmpty = !loading && items.length === 0;

  return (
    <div className="space-y-6">
      <PageSection title="Filtros" description="Filtre alertas arquivados por tipo, prioridade ou período.">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo</label>
            <select
              name="tipo"
              value={filtros.tipo}
              onChange={handleFiltro}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">Todos</option>
              <option value="manutencao">Manutenção</option>
              <option value="seguro">Seguro</option>
              <option value="contrato">Contrato</option>
              <option value="insight_ia">Insight IA</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Prioridade</label>
            <select
              name="prioridade"
              value={filtros.prioridade}
              onChange={handleFiltro}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">Todas</option>
              <option value="1">Alta</option>
              <option value="2">Média</option>
              <option value="3">Baixa</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              <FontAwesomeIcon icon={faCalendarAlt} className="mr-1" />Data início
            </label>
            <DateInput name="dataInicio" value={filtros.dataInicio} onChange={handleFiltro} />
          </div>

          <div className="lg:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              <FontAwesomeIcon icon={faCalendarAlt} className="mr-1" />Data fim
            </label>
            <DateInput name="dataFim" value={filtros.dataFim} onChange={handleFiltro} />
          </div>

          <div className="lg:col-span-3">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Busca</label>
            <input
              type="text"
              name="search"
              value={filtros.search}
              onChange={handleFiltro}
              placeholder="Título, subtítulo ou nº OS..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>
        </div>
      </PageSection>

      <PageSection title="Alertas arquivados" description="Alertas removidos automaticamente após 90 dias, preservados para auditoria.">
        {loading ? (
          <PageState loading />
        ) : isEmpty ? (
          <PageState isEmpty emptyMessage="Nenhum alerta arquivado encontrado." />
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Data do alerta</th>
                    <th className="px-4 py-3">Título</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Prioridade</th>
                    <th className="px-4 py-3">Nº OS</th>
                    <th className="px-4 py-3">Arquivado em</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                        {formatarDataHora(item.dataAlerta)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-800">
                        <div className="font-medium">{item.titulo}</div>
                        {item.subtitulo && (
                          <div className="mt-0.5 text-xs text-slate-500">{item.subtitulo}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 capitalize">{item.tipo}</td>
                      <td className="px-4 py-3">
                        <ActionBadge
                          label={PRIORIDADE_LABEL[item.prioridade] || item.prioridade}
                          tone={prioridadeTone(item.prioridade)}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{item.numeroOS || '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">
                        {formatarDataHora(item.dataArquivado)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => carregar(page - 1)}
                  disabled={page <= 1 || loading}
                >
                  Anterior
                </Button>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Página {page} de {totalPages}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => carregar(page + 1)}
                  disabled={page >= totalPages || loading}
                >
                  Próxima
                </Button>
              </div>
            )}
          </>
        )}
      </PageSection>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function LogAuditoriaPage() {
  const [activeTab, setActiveTab] = useState('acoes');

  return (
    <PageLayout background="slate" padded fullHeight>
      <div className="space-y-6">
        <PageHeader
          title="Auditoria"
          subtitle="Rastreabilidade completa de ações e eventos do sistema"
          icon={faShieldHalved}
        />

        <TabBar active={activeTab} onChange={setActiveTab} />

        {activeTab === 'acoes'   && <AcoesTab />}
        {activeTab === 'ordens'  && <OrdensTab />}
        {activeTab === 'alertas' && <AlertasHistoricoTab />}
      </div>
    </PageLayout>
  );
}

export default LogAuditoriaPage;
