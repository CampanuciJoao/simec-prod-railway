import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner,
  faArrowLeft,
  faScroll,
} from '@fortawesome/free-solid-svg-icons';

import { useAuditoriaDetalhada } from '@/hooks/auditoria/useAuditoriaDetalhada';
import { formatarDataHora } from '@/utils/timeUtils';

import {
  Button,
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
    excluir: 'bg-red-100 text-red-700 border-red-200',
    excluido: 'bg-red-100 text-red-700 border-red-200',
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

function AuditoriaDetalhadaPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { logs, loading } = useAuditoriaDetalhada('Manutenção', id);

  const isEmpty = !loading && logs.length === 0;

  return (
    <PageLayout background="slate" padded fullHeight>
      <div className="space-y-6">
        <PageHeader
          title="Auditoria Detalhada da Manutenção"
          subtitle="Histórico completo de ações registradas para esta manutenção"
          icon={faScroll}
          actions={
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
              <FontAwesomeIcon icon={faArrowLeft} />
              Voltar
            </Button>
          }
        />

        <PageSection
          title="Registros"
          description="Eventos de auditoria relacionados a esta manutenção."
        >
          {loading ? (
            <PageState loading />
          ) : isEmpty ? (
            <PageState
              isEmpty
              emptyMessage="Nenhum registro de auditoria encontrado."
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Data/Hora</th>
                    <th className="px-4 py-3">Autor</th>
                    <th className="px-4 py-3">Ação</th>
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
                        <ActionBadge action={log.acao} />
                      </td>

                      <td className="whitespace-pre-wrap break-words px-4 py-3 text-sm text-slate-700">
                        {log.detalhes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PageSection>
      </div>
    </PageLayout>
  );
}

export default AuditoriaDetalhadaPage;
