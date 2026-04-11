import React from 'react';
import { Link } from 'react-router-dom';
import { formatarData } from '../../utils/timeUtils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEye,
  faTrashAlt,
  faClock,
  faHospital,
  faHashtag,
  faPlus,
  faWrench,
} from '@fortawesome/free-solid-svg-icons';

import { useAuth } from '../../contexts/AuthContext';
import { useManutencoesPage } from '../../hooks/manutencoes/useManutencoesPage';

import Button from '../../components/ui/Button';
import GlobalFilterBar from '../../components/ui/GlobalFilterBar';
import ModalConfirmacao from '../../components/ui/ModalConfirmacao';

import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import PageSection from '../../components/ui/PageSection';
import PageState from '../../components/ui/PageState';

const getStatusStyles = (status) => {
  const s = status?.toLowerCase() || '';
  if (s === 'agendada') return 'bg-blue-100 text-blue-800 border-blue-200';
  if (s === 'emandamento') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  if (s === 'aguardandoconfirmacao') return 'bg-orange-100 text-orange-800 border-orange-200 animate-pulse';
  if (s === 'concluida') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (s === 'cancelada') return 'bg-red-100 text-red-800 border-red-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

const getTipoStyles = (tipo) => {
  const t = tipo?.toLowerCase() || '';
  if (t === 'corretiva') return 'bg-rose-100 text-rose-700 border-rose-300';
  if (t === 'preventiva') return 'bg-emerald-100 text-emerald-700 border-emerald-300';
  if (t === 'calibracao') return 'bg-indigo-100 text-indigo-700 border-indigo-300';
  if (t === 'inspecao') return 'bg-sky-100 text-sky-700 border-sky-300';
  return 'bg-slate-100 text-slate-600 border-slate-300';
};

const getRowBorder = (status) => {
  const s = status?.toLowerCase() || '';
  if (s === 'agendada') return 'border-l-blue-500';
  if (s === 'emandamento') return 'border-l-yellow-500';
  if (s === 'aguardandoconfirmacao') return 'border-l-orange-500';
  if (s === 'concluida') return 'border-l-emerald-500';
  if (s === 'cancelada') return 'border-l-red-500';
  return 'border-l-slate-300';
};

const formatarIntervaloHorario = (dataInicioISO, dataFimISO) => {
  if (!dataInicioISO) return '-';

  try {
    const options = { hour: '2-digit', minute: '2-digit' };
    const inicio = new Date(dataInicioISO).toLocaleTimeString('pt-BR', options);

    if (!dataFimISO) return inicio;

    const fim = new Date(dataFimISO).toLocaleTimeString('pt-BR', options);
    return `${inicio} - ${fim}`;
  } catch {
    return 'Inválido';
  }
};

function ManutencoesPage() {
  const { user } = useAuth();
  const page = useManutencoesPage();

  const isInitialLoading = page.loading && page.manutencoes.length === 0;
  const hasError = !!page.error;
  const isEmpty = !page.loading && !page.error && page.manutencoes.length === 0;

  return (
    <>
      <ModalConfirmacao
        isOpen={page.deleteModal.isOpen}
        onClose={page.deleteModal.closeModal}
        onConfirm={page.handleConfirmDelete}
        title="Excluir OS"
        message={`Deseja apagar a OS nº ${page.deleteModal.modalData?.numeroOS}?`}
        isDestructive
      />

      <PageLayout className="pb-20" background="slate" padded fullHeight>
        <PageHeader
          title="Gerenciamento de Manutenções"
          subtitle="Acompanhe, filtre e gerencie as ordens de serviço"
          icon={faWrench}
          actions={
            <Button onClick={page.goToCreate}>
              <FontAwesomeIcon icon={faPlus} />
              Agendar nova
            </Button>
          }
        />

        <PageSection noPadding className="mb-8 overflow-hidden">
          <GlobalFilterBar
            searchTerm={page.searchTerm}
            onSearchChange={(e) => page.setSearchTerm(e.target.value)}
            searchPlaceholder="Buscar por OS ou descrição..."
            selectFilters={page.selectFiltersConfig}
          />
        </PageSection>

        {isInitialLoading || hasError || isEmpty ? (
          <PageState
            loading={isInitialLoading}
            error={page.error?.message || page.error || ''}
            isEmpty={isEmpty}
            emptyMessage="Nenhuma manutenção encontrada."
          />
        ) : (
          <div className="px-1 flex flex-col gap-3">
            {page.manutencoes.map((m) => (
              <div
                key={m.id}
                className={`bg-white border-y border-r border-slate-200 border-l-[8px] ${getRowBorder(m.status)} shadow-sm rounded-xl overflow-hidden transition-all hover:shadow-md`}
              >
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-6 flex-1">
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-6 flex-1 items-start">
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter mb-1">
                          OS / Status
                        </span>
                        <span className="font-black text-slate-900 text-sm leading-none">
                          {m.numeroOS}
                        </span>
                        <span className={`w-fit mt-2 text-[9px] font-black px-1.5 py-0.5 rounded border uppercase ${getStatusStyles(m.status)}`}>
                          {m.status.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      </div>

                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter mb-1">
                          Equipamento
                        </span>
                        <span className="font-black text-slate-900 text-sm leading-tight truncate">
                          {m.equipamento?.modelo}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium mt-1">
                          Nº de Série: <span className="font-bold text-slate-600">{m.equipamento?.tag}</span>
                        </span>
                      </div>

                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter mb-1">
                          Nº Chamado
                        </span>
                        <span className="font-black text-slate-900 text-sm mt-0.5">
                          {m.numeroChamado ? (
                            <>
                              <FontAwesomeIcon icon={faHashtag} className="text-slate-400 mr-1" />
                              {m.numeroChamado}
                            </>
                          ) : (
                            '---'
                          )}
                        </span>
                      </div>

                      <div className="hidden md:flex flex-col min-w-0">
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter mb-1">
                          Agendamento
                        </span>
                        <span className="font-black text-slate-900 text-xs flex items-center gap-1">
                          <FontAwesomeIcon icon={faClock} className="text-slate-400 text-[9px]" />
                          {formatarData(m.dataHoraAgendamentoInicio)}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium mt-0.5">
                          {formatarIntervaloHorario(m.dataHoraAgendamentoInicio, m.dataHoraAgendamentoFim)}
                        </span>
                      </div>

                      <div className="hidden md:flex flex-col min-w-0">
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter mb-1">
                          Unidade
                        </span>
                        <span className="font-bold text-slate-700 text-xs mt-0.5 truncate">
                          <FontAwesomeIcon icon={faHospital} className="text-slate-400 text-[9px] mr-1" />
                          {m.equipamento?.unidade?.nomeSistema || m.equipamento?.unidade?.nome || '---'}
                        </span>
                      </div>

                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter mb-1">
                          Tipo
                        </span>
                        <span className={`font-black text-[9px] px-2.5 py-1 rounded-full border uppercase w-fit mt-0.5 shadow-sm ${getTipoStyles(m.tipo)}`}>
                          {m.tipo}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <Link
                      to={`/manutencoes/detalhes/${m.id}`}
                      className="w-9 h-9 flex items-center justify-center bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-blue-100"
                      title="Ver Detalhes"
                    >
                      <FontAwesomeIcon icon={faEye} />
                    </Link>

                    {user?.role === 'admin' && (
                      <button
                        type="button"
                        onClick={() => page.deleteModal.openModal(m)}
                        className="w-9 h-9 flex items-center justify-center bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm border border-red-100 cursor-pointer"
                        title="Excluir"
                      >
                        <FontAwesomeIcon icon={faTrashAlt} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageLayout>
    </>
  );
}

export default ManutencoesPage;