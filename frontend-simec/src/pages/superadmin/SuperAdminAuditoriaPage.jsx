import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClipboardList,
  faClockRotateLeft,
  faUserSecret,
} from '@fortawesome/free-solid-svg-icons';

import {
  Badge,
  Button,
  PageSection,
  PageState,
  Select,
  ResponsiveTabs,
} from '@/components/ui';
import { useAuditoriaAdmin } from '@/hooks/superadmin/useAuditoriaAdmin';

const ALVO_TIPO_OPTIONS = [
  { value: '', label: 'Todos os alvos' },
  { value: 'tenant', label: 'tenant' },
  { value: 'usuario', label: 'usuario' },
  { value: 'plano', label: 'plano' },
  { value: 'feature_flag', label: 'feature_flag' },
  { value: 'template', label: 'template' },
];

const IMPERSONACAO_STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'ativa', label: 'ativa' },
  { value: 'encerrada_usuario', label: 'encerrada (usuário)' },
  { value: 'expirada', label: 'expirada' },
  { value: 'revogada', label: 'revogada' },
];

function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtDuracao(segundos) {
  if (segundos === null || segundos === undefined) return 'em curso';
  if (segundos < 60) return `${segundos}s`;
  if (segundos < 3600) return `${Math.floor(segundos / 60)}min`;
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  return `${h}h${m.toString().padStart(2, '0')}min`;
}

function LogsAdminTable({ state }) {
  const {
    logs,
    logsPage,
    setLogsPage,
    logsFiltros,
    setLogsFiltros,
    logsLoading,
    logsError,
    pageSize,
  } = state;
  const totalPaginas = Math.max(1, Math.ceil((logs.total || 0) / pageSize));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          label="Alvo"
          value={logsFiltros.alvoTipo}
          onChange={(e) => setLogsFiltros({ ...logsFiltros, alvoTipo: e.target.value })}
          options={ALVO_TIPO_OPTIONS}
        />
        <Select
          label="Ação"
          value={logsFiltros.acao}
          onChange={(e) => setLogsFiltros({ ...logsFiltros, acao: e.target.value })}
          options={[
            { value: '', label: 'Todas' },
            { value: 'impersonacao_iniciada', label: 'impersonacao_iniciada' },
            { value: 'impersonacao_encerrada', label: 'impersonacao_encerrada' },
            { value: 'usuario_reset_senha', label: 'usuario_reset_senha' },
          ]}
        />
      </div>

      {logsError ? (
        <PageState error={logsError} />
      ) : logsLoading ? (
        <PageState loading />
      ) : logs.items.length === 0 ? (
        <PageState isEmpty emptyMessage="Sem ações registradas com os filtros atuais." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr
                  style={{ color: 'var(--text-muted)' }}
                  className="text-left text-xs uppercase"
                >
                  <th className="px-3 py-2">Quando</th>
                  <th className="px-3 py-2">Autor</th>
                  <th className="px-3 py-2">Ação</th>
                  <th className="px-3 py-2">Alvo</th>
                  <th className="px-3 py-2">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {logs.items.map((log) => (
                  <tr
                    key={log.id}
                    style={{ borderTop: '1px solid var(--border-soft)' }}
                  >
                    <td
                      className="px-3 py-2 font-mono text-xs"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {fmtDateTime(log.timestamp)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{log.autor?.nome || log.autor?.username || '—'}</div>
                      <div
                        className="text-xs"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {log.autor?.email}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="purple">{log.acao}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-mono text-xs">
                        {log.alvoTipo}
                        {log.alvoId ? ` · ${log.alvoId.slice(0, 8)}…` : ''}
                      </div>
                    </td>
                    <td
                      className="max-w-md px-3 py-2 text-xs"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {log.motivo || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            className="flex items-center justify-between text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            <span>{logs.total} registro(s)</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={logsPage <= 1}
                onClick={() => setLogsPage(logsPage - 1)}
              >
                Anterior
              </Button>
              <span className="font-mono">{logsPage} / {totalPaginas}</span>
              <Button
                size="sm"
                variant="secondary"
                disabled={logsPage >= totalPaginas}
                onClick={() => setLogsPage(logsPage + 1)}
              >
                Próximo
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ImpersonacoesTable({ state }) {
  const {
    imp,
    impPage,
    setImpPage,
    impFiltros,
    setImpFiltros,
    impLoading,
    impError,
    pageSize,
  } = state;
  const totalPaginas = Math.max(1, Math.ceil((imp.total || 0) / pageSize));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          label="Status"
          value={impFiltros.status}
          onChange={(e) => setImpFiltros({ ...impFiltros, status: e.target.value })}
          options={IMPERSONACAO_STATUS_OPTIONS}
        />
      </div>

      {impError ? (
        <PageState error={impError} />
      ) : impLoading ? (
        <PageState loading />
      ) : imp.items.length === 0 ? (
        <PageState isEmpty emptyMessage="Nenhuma sessão de impersonação registrada." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr
                  style={{ color: 'var(--text-muted)' }}
                  className="text-left text-xs uppercase"
                >
                  <th className="px-3 py-2">Iniciada em</th>
                  <th className="px-3 py-2">Superadmin</th>
                  <th className="px-3 py-2">Atuando como</th>
                  <th className="px-3 py-2">Motivo</th>
                  <th className="px-3 py-2">Duração</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {imp.items.map((sessao) => (
                  <tr
                    key={sessao.id}
                    style={{ borderTop: '1px solid var(--border-soft)' }}
                  >
                    <td
                      className="px-3 py-2 font-mono text-xs"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {fmtDateTime(sessao.iniciadaEm)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">
                        {sessao.superadmin?.nome || sessao.superadmin?.username || '—'}
                      </div>
                      <div
                        className="text-xs"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {sessao.superadmin?.email}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{sessao.actedAsTenant?.nome}</div>
                      <div
                        className="font-mono text-xs"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {sessao.actedAsTenant?.slug}
                      </div>
                    </td>
                    <td
                      className="max-w-md px-3 py-2 text-xs"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {sessao.motivo}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs tabular-nums">
                      {fmtDuracao(sessao.duracaoSegundos)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant={
                          sessao.status === 'ativa'
                            ? 'yellow'
                            : sessao.status === 'encerrada_usuario'
                            ? 'green'
                            : sessao.status === 'revogada'
                            ? 'red'
                            : 'slate'
                        }
                      >
                        {sessao.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            className="flex items-center justify-between text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            <span>{imp.total} registro(s)</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={impPage <= 1}
                onClick={() => setImpPage(impPage - 1)}
              >
                Anterior
              </Button>
              <span className="font-mono">{impPage} / {totalPaginas}</span>
              <Button
                size="sm"
                variant="secondary"
                disabled={impPage >= totalPaginas}
                onClick={() => setImpPage(impPage + 1)}
              >
                Próximo
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SuperAdminAuditoriaPage() {
  const state = useAuditoriaAdmin();

  const TABS = [
    {
      id: 'admin',
      label: 'Ações administrativas',
      icon: <FontAwesomeIcon icon={faClipboardList} />,
    },
    {
      id: 'impersonacoes',
      label: 'Sessões de impersonação',
      icon: <FontAwesomeIcon icon={faUserSecret} />,
    },
  ];

  return (
    <PageSection
      title="Auditoria do plano de controle"
      description="Trilha auditável de ações executadas por superadmins sobre tenants, usuários e catálogo — separada do log operacional de cada cliente."
      icon={faClockRotateLeft}
    >
      <ResponsiveTabs tabs={TABS} activeTab={state.aba} onChange={state.setAba} />
      <div className="mt-4">
        {state.aba === 'admin' ? (
          <LogsAdminTable state={state} />
        ) : (
          <ImpersonacoesTable state={state} />
        )}
      </div>
    </PageSection>
  );
}

export default SuperAdminAuditoriaPage;
