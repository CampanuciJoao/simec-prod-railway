import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner,
  faCalendarAlt,
  faClipboardList,
} from '@fortawesome/free-solid-svg-icons';

import { useAuditoria } from '@/hooks/auditoria/useAuditoria';
import { formatarDataHora } from '@/utils/timeUtils';

import {
  Button,
  DateInput,
  PageHeader,
  PageLayout,
  PageSection,
  PageState,
} from '@/components/ui';

function ActionBadge({ action }) {
  const normalized = String(action || '')
    .toLowerCase()
    .replace(/_/g, '-');

  const toneMap = {
    criar: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    criado: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    update: 'bg-blue-100 text-blue-700 border-blue-200',
    atualizar: 'bg-blue-100 text-blue-700 border-blue-200',
    atualizado: 'bg-blue-100 text-blue-700 border-blue-200',
    editar: 'bg-blue-100 text-blue-700 border-blue-200',
    excluido: 'bg-red-100 text-red-700 border-red-200',
    excluir: 'bg-red-100 text-red-700 border-red-200',
    deletado: 'bg-red-100 text-red-700 border-red-200',
    delete: 'bg-red-100 text-red-700 border-red-200',
    login: 'bg-violet-100 text-violet-700 border-violet-200',
    logout: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const tone =
    toneMap[normalized] ||
    'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <span
      className={[
        'inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold',
        tone,
      ].join(' ')}
    >
      {action || 'N/A'}
    </span>
  );
}

function LogAuditoriaPage() {
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

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  };

  const isInitialLoading = loading && logs.length === 0;
  const isEmpty = !loading && logs.length === 0;

  return (
    <PageLayout background="slate" padded fullHeight>
      <div className="space-y-6">
        <PageHeader
          title="Log de Auditoria"
          subtitle="Acompanhe ações registradas no sistema com filtros e paginação"
          icon={faClipboardList}
        />

        <PageSection
          title="Filtros de Auditoria"
          description="Refine os registros por usuário, ação, entidade e intervalo de datas."
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-3">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Usuário
              </label>
              <select
                name="autorId"
                value={filtros.autorId}
                onChange={handleFiltroChange}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Todos</option>
                {opcoesFiltro.usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-3">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Ação
              </label>
              <select
                name="acao"
                value={filtros.acao}
                onChange={handleFiltroChange}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Todas</option>
                {opcoesFiltro.acoes.map((acao) => (
                  <option key={acao} value={acao}>
                    {acao}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-3">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Entidade
              </label>
              <select
                name="entidade"
                value={filtros.entidade}
                onChange={handleFiltroChange}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Todas</option>
                {opcoesFiltro.entidades.map((entidade) => (
                  <option key={entidade} value={entidade}>
                    {entidade}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-3">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
                Data Início
              </label>
              <DateInput
                name="dataInicio"
                value={filtros.dataInicio}
                onChange={handleDateChange}
              />
            </div>

            <div className="lg:col-span-3">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
                Data Fim
              </label>
              <DateInput
                name="dataFim"
                value={filtros.dataFim}
                onChange={handleDateChange}
              />
            </div>
          </div>
        </PageSection>

        <PageSection
          title="Registros"
          description="Lista paginada de eventos auditáveis do sistema."
        >
          {isInitialLoading ? (
            <PageState loading />
          ) : isEmpty ? (
            <PageState
              isEmpty
              emptyMessage="Nenhum registro encontrado para os filtros selecionados."
            />
          ) : (
            <>
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3">Data/Hora</th>
                      <th className="px-4 py-3">Usuário</th>
                      <th className="px-4 py-3">Ação</th>
                      <th className="px-4 py-3">Entidade (ID)</th>
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
                          <ActionBadge action={log.acao} />
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-700">
                          <div className="font-medium text-slate-800">
                            {log.entidade}
                          </div>
                          {log.entidadeId ? (
                            <div className="mt-1 text-xs text-slate-500">
                              {log.entidadeId.substring(0, 8)}...
                            </div>
                          ) : null}
                        </td>

                        <td className="whitespace-pre-wrap break-words px-4 py-3 text-sm text-slate-700">
                          {log.detalhes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pagination.hasNextPage ? (
                <div className="flex justify-center pt-5">
                  <Button
                    type="button"
                    onClick={carregarMaisLogs}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} spin />
                        Carregando...
                      </>
                    ) : (
                      'Carregar Mais'
                    )}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </PageSection>
      </div>
    </PageLayout>
  );
}

export default LogAuditoriaPage;
