import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner,
  faCalendarAlt,
  faClipboardList,
  faShieldHalved,
  faBoxArchive,
  faWrench,
  faXmark,
  faFilter,
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

/* ─── Helpers ───────────────────────────────────────────────────────────── */

/**
 * Normaliza o rótulo de ação: tira acentos e força uppercase.
 * Backend devolve às vezes 'CRIAÇÃO' e às vezes 'CRIACAO' (legados sem
 * cedilha) — para o filtro não duplicar.
 */
function normalizarAcao(a) {
  if (!a) return '';
  return a.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
}

function deduplicarAcoes(acoes = []) {
  const map = new Map();
  for (const a of acoes) {
    const key = normalizarAcao(a);
    if (!map.has(key)) map.set(key, a);
  }
  return Array.from(map.values());
}

function acaoTone(acao = '') {
  const a = acao.toLowerCase();
  if (a.includes('cria') || a.includes('abertura'))                    return 'green';
  if (a.includes('edit') || a.includes('atualiz') || a.includes('reset')) return 'blue';
  if (a.includes('exclu') || a.includes('delet') || a.includes('cancel')) return 'red';
  if (a.includes('login'))                                             return 'violet';
  if (a.includes('logout'))                                            return 'slate';
  if (a.includes('upload'))                                            return 'amber';
  return 'slate';
}

function prioridadeTone(p = '') {
  if (p === '1' || p === 'alta' || p === 'critica') return 'red';
  if (p === '2' || p === 'media')                   return 'amber';
  return 'slate';
}

/* ─── Componentes base (tokenizados) ────────────────────────────────────── */

const BADGE_TONES = {
  slate:  { bg: 'var(--bg-surface-subtle)',       text: 'var(--text-secondary)',  border: 'var(--border-soft)' },
  green:  { bg: 'var(--color-success-surface)',   text: 'var(--color-success)',   border: 'var(--color-success-soft)' },
  blue:   { bg: 'var(--brand-primary-surface)',   text: 'var(--brand-primary)',   border: 'var(--brand-primary-soft)' },
  red:    { bg: 'var(--color-danger-surface)',    text: 'var(--color-danger)',    border: 'var(--color-danger-soft)' },
  violet: { bg: 'var(--color-info-surface)',      text: 'var(--color-info)',      border: 'var(--color-info-soft)' },
  amber:  { bg: 'var(--color-warning-surface)',   text: 'var(--color-warning)',   border: 'var(--color-warning-soft)' },
};

function ActionBadge({ label, tone = 'slate' }) {
  const t = BADGE_TONES[tone] || BADGE_TONES.slate;
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
      style={{
        backgroundColor: t.bg,
        color: t.text,
        border: `1px solid ${t.border}`,
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.06em',
      }}
    >
      {label || 'N/A'}
    </span>
  );
}

const FIELD_LABEL_STYLE = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  marginBottom: 6,
  display: 'block',
};

const INPUT_STYLE = {
  width: '100%',
  borderRadius: '0.625rem',
  border: '1px solid var(--border-default)',
  backgroundColor: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
  fontFamily: 'var(--font-body)',
  outline: 'none',
  transition: 'border-color 150ms, box-shadow 150ms',
};

function FieldShell({ label, icon, children }) {
  return (
    <div className="min-w-0">
      <label style={FIELD_LABEL_STYLE}>
        {icon && <FontAwesomeIcon icon={icon} className="mr-1.5" style={{ color: 'var(--text-muted)' }} />}
        {label}
      </label>
      {children}
    </div>
  );
}

function Select({ name, value, onChange, children }) {
  return (
    <select
      name={name}
      value={value}
      onChange={onChange}
      style={INPUT_STYLE}
      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--brand-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--focus-ring)'; }}
      onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      {children}
    </select>
  );
}

function TextInput({ name, value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={INPUT_STYLE}
      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--brand-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--focus-ring)'; }}
      onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.boxShadow = 'none'; }}
    />
  );
}

/* ─── Tabela compartilhada ──────────────────────────────────────────────── */

/**
 * Tabela com modo card responsivo: em < md (768px), cada <tr> vira um
 * card com label/value verticais (CSS em index.css usa data-label).
 * Os labels vêm das colunas via Context — Cell pega o label correto
 * pelo índice da sua posição entre os filhos do LogRow.
 */
const ColumnsContext = createContext([]);
const CellIndexContext = createContext(null);

function LogTable({ columns, children }) {
  return (
    <ColumnsContext.Provider value={columns}>
      <div
        className="responsive-table-wrap overflow-x-auto rounded-2xl border"
        style={{
          borderColor: 'var(--border-soft)',
          backgroundColor: 'var(--bg-surface)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <table className="responsive-table min-w-full">
          <thead>
            <tr
              style={{
                backgroundColor: 'var(--bg-surface-soft)',
                borderBottom: '1px solid var(--border-soft)',
              }}
            >
              {columns.map((c) => (
                <th
                  key={c}
                  className="px-4 py-3 text-left"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                  }}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </ColumnsContext.Provider>
  );
}

function LogRow({ children }) {
  // Injeta o índice em cada Cell filho — Cell usa o índice para
  // pegar o data-label correspondente do ColumnsContext.
  const wrapped = React.Children.map(children, (child, index) => {
    if (!React.isValidElement(child)) return child;
    return (
      <CellIndexContext.Provider value={index} key={index}>
        {child}
      </CellIndexContext.Provider>
    );
  });

  return (
    <tr
      style={{
        borderTop: '1px solid var(--border-soft)',
        transition: 'background-color 120ms',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-surface-soft)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      {wrapped}
    </tr>
  );
}

function Cell({ children, mono = false, muted = false, nowrap = false }) {
  const columns = useContext(ColumnsContext);
  const index = useContext(CellIndexContext);
  const dataLabel = (index != null && columns?.[index]) || undefined;

  return (
    <td
      className="px-4 py-3"
      data-label={dataLabel}
      style={{
        fontSize: 13,
        color: muted ? 'var(--text-muted)' : 'var(--text-primary)',
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-body)',
        whiteSpace: nowrap ? 'nowrap' : 'normal',
        wordBreak: nowrap ? 'normal' : 'break-word',
      }}
    >
      {children}
    </td>
  );
}

/* ─── Chips de filtros ativos + botão Limpar ────────────────────────────── */

function FiltrosAtivos({ filtros, labels, onClearAll, onClearOne }) {
  const entries = Object.entries(filtros).filter(([, v]) => v !== '' && v != null);
  if (!entries.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 mt-3">
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10.5,
          fontWeight: 600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
        }}
      >
        <FontAwesomeIcon icon={faFilter} className="mr-1.5" />
        Filtros ativos:
      </span>
      {entries.map(([k, v]) => (
        <button
          key={k}
          type="button"
          onClick={() => onClearOne(k)}
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
          style={{
            backgroundColor: 'var(--brand-primary-surface)',
            color: 'var(--brand-primary)',
            border: '1px solid var(--brand-primary-soft)',
          }}
        >
          {labels[k] ?? k}: <strong>{String(v)}</strong>
          <FontAwesomeIcon icon={faXmark} className="text-[10px] opacity-70" />
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
        style={{
          backgroundColor: 'transparent',
          color: 'var(--text-muted)',
          border: '1px solid var(--border-default)',
        }}
      >
        Limpar tudo
        <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
      </button>
    </div>
  );
}

/* ─── TabBar (tokenizado) ───────────────────────────────────────────────── */

const TABS = [
  { id: 'acoes',   label: 'Ações do sistema',     icon: faClipboardList },
  { id: 'ordens',  label: 'Ordens de serviço',    icon: faWrench        },
  { id: 'alertas', label: 'Histórico de alertas', icon: faBoxArchive    },
];

function TabBar({ active, onChange }) {
  return (
    <div
      className="inline-flex gap-1 rounded-xl p-1"
      style={{
        backgroundColor: 'var(--bg-surface-subtle)',
        border: '1px solid var(--border-soft)',
      }}
    >
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-all"
            style={{
              backgroundColor: isActive ? 'var(--bg-surface)' : 'transparent',
              color:           isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow:       isActive ? 'var(--shadow-sm)' : 'none',
            }}
          >
            <FontAwesomeIcon icon={tab.icon} className="text-xs" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Tab 1: Ações do sistema ───────────────────────────────────────────── */

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

  const limparTudo = () => setFiltros({ autorId: '', acao: '', entidade: '', dataInicio: '', dataFim: '' });
  const limparUm   = (k) => setFiltros((prev) => ({ ...prev, [k]: '' }));

  // Deduplica ações vindas do backend (CRIAÇÃO vs CRIACAO etc).
  const acoesDedup = useMemo(() => deduplicarAcoes(opcoesFiltro.acoes), [opcoesFiltro.acoes]);

  const isInitialLoading = loading && logs.length === 0;
  const isEmpty = !loading && logs.length === 0;

  const labels = {
    autorId: 'Usuário', acao: 'Ação', entidade: 'Entidade',
    dataInicio: 'De', dataFim: 'Até',
  };
  const filtrosLegiveis = {
    ...filtros,
    autorId: filtros.autorId
      ? opcoesFiltro.usuarios.find((u) => u.id === filtros.autorId)?.nome ?? filtros.autorId
      : '',
  };

  return (
    <div className="space-y-6">
      <PageSection
        title="Filtros"
        description="Refine por usuário, ação, entidade e intervalo de datas."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <FieldShell label="Usuário">
            <Select name="autorId" value={filtros.autorId} onChange={handleFiltroChange}>
              <option value="">Todos</option>
              {opcoesFiltro.usuarios.map((u) => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </Select>
          </FieldShell>

          <FieldShell label="Ação">
            <Select name="acao" value={filtros.acao} onChange={handleFiltroChange}>
              <option value="">Todas</option>
              {acoesDedup.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </Select>
          </FieldShell>

          <FieldShell label="Entidade">
            <Select name="entidade" value={filtros.entidade} onChange={handleFiltroChange}>
              <option value="">Todas</option>
              {opcoesFiltro.entidades.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </Select>
          </FieldShell>

          <FieldShell label="Data início" icon={faCalendarAlt}>
            <DateInput name="dataInicio" value={filtros.dataInicio} onChange={handleFiltroChange} />
          </FieldShell>

          <FieldShell label="Data fim" icon={faCalendarAlt}>
            <DateInput name="dataFim" value={filtros.dataFim} onChange={handleFiltroChange} />
          </FieldShell>
        </div>

        <FiltrosAtivos
          filtros={filtrosLegiveis}
          labels={labels}
          onClearAll={limparTudo}
          onClearOne={limparUm}
        />
      </PageSection>

      <PageSection title="Registros" description="Lista paginada de eventos auditáveis.">
        {isInitialLoading ? (
          <PageState loading />
        ) : isEmpty ? (
          <PageState isEmpty emptyMessage="Nenhum registro encontrado para os filtros selecionados." />
        ) : (
          <>
            <LogTable columns={['Data/Hora', 'Usuário', 'Ação', 'Entidade', 'Detalhes']}>
              {logs.map((log) => (
                <LogRow key={log.id}>
                  <Cell mono nowrap muted>{formatarDataHora(log.timestamp)}</Cell>
                  <Cell>
                    <span style={{ fontWeight: 600 }}>{log.autor?.nome || 'Usuário não identificado'}</span>
                  </Cell>
                  <Cell>
                    <ActionBadge label={log.acao} tone={acaoTone(log.acao)} />
                  </Cell>
                  <Cell>
                    <div style={{ fontWeight: 600 }}>{log.entidade}</div>
                    {log.entidadeId && (
                      <div
                        style={{
                          marginTop: 2,
                          fontSize: 11,
                          color: 'var(--text-muted)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {log.entidadeId.substring(0, 8)}…
                      </div>
                    )}
                  </Cell>
                  <Cell>{log.detalhes}</Cell>
                </LogRow>
              ))}
            </LogTable>

            {pagination.hasNextPage && (
              <div className="flex justify-center pt-5">
                <Button type="button" onClick={carregarMaisLogs} disabled={loadingMore}>
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

/* ─── Tab 2: Ordens de Serviço ──────────────────────────────────────────── */

const ENTIDADES_OS = ['Manutenção', 'OsCorretiva', 'NotaAndamento', 'VisitaTerceiro'];
const ACOES_OS = ['CRIAÇÃO', 'EDIÇÃO', 'EXCLUSÃO', 'UPLOAD'];

function OrdensTab() {
  const [logs, setLogs]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filtros, setFiltros]         = useState({ entidade: '', acao: '', dataInicio: '', dataFim: '' });

  const carregar = useCallback(async (p = 1, f = filtros) => {
    p === 1 ? setLoading(true) : setLoadingMore(true);
    try {
      const params = { page: p, limit: 50 };
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

  const limparTudo = () => setFiltros({ entidade: '', acao: '', dataInicio: '', dataFim: '' });
  const limparUm   = (k) => setFiltros((prev) => ({ ...prev, [k]: '' }));

  const isEmpty = !loading && logs.length === 0;

  return (
    <div className="space-y-6">
      <PageSection title="Filtros" description="Filtre por tipo de entidade, ação e período.">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <FieldShell label="Entidade">
            <Select name="entidade" value={filtros.entidade} onChange={handleFiltro}>
              <option value="">Todas</option>
              {ENTIDADES_OS.map((e) => <option key={e} value={e}>{e}</option>)}
            </Select>
          </FieldShell>

          <FieldShell label="Ação">
            <Select name="acao" value={filtros.acao} onChange={handleFiltro}>
              <option value="">Todas</option>
              {ACOES_OS.map((a) => <option key={a} value={a}>{a}</option>)}
            </Select>
          </FieldShell>

          <FieldShell label="Data início" icon={faCalendarAlt}>
            <DateInput name="dataInicio" value={filtros.dataInicio} onChange={handleFiltro} />
          </FieldShell>

          <FieldShell label="Data fim" icon={faCalendarAlt}>
            <DateInput name="dataFim" value={filtros.dataFim} onChange={handleFiltro} />
          </FieldShell>
        </div>

        <FiltrosAtivos
          filtros={filtros}
          labels={{ entidade: 'Entidade', acao: 'Ação', dataInicio: 'De', dataFim: 'Até' }}
          onClearAll={limparTudo}
          onClearOne={limparUm}
        />
      </PageSection>

      <PageSection title="Registros de ordens" description="Histórico de ações em manutenções, OS corretivas, notas e visitas.">
        {loading ? (
          <PageState loading />
        ) : isEmpty ? (
          <PageState isEmpty emptyMessage="Nenhum registro encontrado." />
        ) : (
          <>
            <LogTable columns={['Data/Hora', 'Usuário', 'Ação', 'Entidade', 'Detalhes']}>
              {logs.map((log) => (
                <LogRow key={log.id}>
                  <Cell mono nowrap muted>{formatarDataHora(log.timestamp)}</Cell>
                  <Cell>
                    <span style={{ fontWeight: 600 }}>{log.autor?.nome || 'Sistema'}</span>
                  </Cell>
                  <Cell>
                    <ActionBadge label={log.acao} tone={acaoTone(log.acao)} />
                  </Cell>
                  <Cell>{log.entidade}</Cell>
                  <Cell>{log.detalhes}</Cell>
                </LogRow>
              ))}
            </LogTable>

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

/* ─── Tab 3: Histórico de Alertas ───────────────────────────────────────── */

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

  const limparTudo = () => setFiltros({ tipo: '', prioridade: '', dataInicio: '', dataFim: '', search: '' });
  const limparUm   = (k) => setFiltros((prev) => ({ ...prev, [k]: '' }));

  const isEmpty = !loading && items.length === 0;

  return (
    <div className="space-y-6">
      <PageSection title="Filtros" description="Filtre alertas arquivados por tipo, prioridade ou período.">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <FieldShell label="Tipo">
            <Select name="tipo" value={filtros.tipo} onChange={handleFiltro}>
              <option value="">Todos</option>
              <option value="manutencao">Manutenção</option>
              <option value="seguro">Seguro</option>
              <option value="contrato">Contrato</option>
              <option value="insight_ia">Insight IA</option>
            </Select>
          </FieldShell>

          <FieldShell label="Prioridade">
            <Select name="prioridade" value={filtros.prioridade} onChange={handleFiltro}>
              <option value="">Todas</option>
              <option value="1">Alta</option>
              <option value="2">Média</option>
              <option value="3">Baixa</option>
            </Select>
          </FieldShell>

          <FieldShell label="Data início" icon={faCalendarAlt}>
            <DateInput name="dataInicio" value={filtros.dataInicio} onChange={handleFiltro} />
          </FieldShell>

          <FieldShell label="Data fim" icon={faCalendarAlt}>
            <DateInput name="dataFim" value={filtros.dataFim} onChange={handleFiltro} />
          </FieldShell>

          <FieldShell label="Busca">
            <TextInput
              name="search"
              value={filtros.search}
              onChange={handleFiltro}
              placeholder="Título, subtítulo ou nº OS..."
            />
          </FieldShell>
        </div>

        <FiltrosAtivos
          filtros={filtros}
          labels={{ tipo: 'Tipo', prioridade: 'Prioridade', dataInicio: 'De', dataFim: 'Até', search: 'Busca' }}
          onClearAll={limparTudo}
          onClearOne={limparUm}
        />
      </PageSection>

      <PageSection title="Alertas arquivados" description="Alertas removidos automaticamente após 90 dias, preservados para auditoria.">
        {loading ? (
          <PageState loading />
        ) : isEmpty ? (
          <PageState isEmpty emptyMessage="Nenhum alerta arquivado encontrado." />
        ) : (
          <>
            <LogTable columns={['Data do alerta', 'Título', 'Tipo', 'Prioridade', 'Nº OS', 'Arquivado em']}>
              {items.map((item) => (
                <LogRow key={item.id}>
                  <Cell mono nowrap muted>{formatarDataHora(item.dataAlerta)}</Cell>
                  <Cell>
                    <div style={{ fontWeight: 600 }}>{item.titulo}</div>
                    {item.subtitulo && (
                      <div
                        style={{
                          marginTop: 2,
                          fontSize: 11,
                          color: 'var(--text-muted)',
                        }}
                      >
                        {item.subtitulo}
                      </div>
                    )}
                  </Cell>
                  <Cell>
                    <span style={{ textTransform: 'capitalize' }}>{item.tipo}</span>
                  </Cell>
                  <Cell>
                    <ActionBadge
                      label={PRIORIDADE_LABEL[item.prioridade] || item.prioridade}
                      tone={prioridadeTone(item.prioridade)}
                    />
                  </Cell>
                  <Cell mono>{item.numeroOS || '—'}</Cell>
                  <Cell mono nowrap muted>{formatarDataHora(item.dataArquivado)}</Cell>
                </LogRow>
              ))}
            </LogTable>

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

/* ─── Page ──────────────────────────────────────────────────────────────── */

function LogAuditoriaPage() {
  const [activeTab, setActiveTab] = useState('acoes');

  return (
    <PageLayout padded fullHeight>
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
